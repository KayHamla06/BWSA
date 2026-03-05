// app/api/webhooks/whatsapp/route.js
import { connectDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import whatsappService from '@/services/whatsapp.service';
import orderService from '@/services/order.service';
import productService from '@/services/product.service';
import logger from '@/utils/logger';

// Webhook verification token
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'verify_token_12345';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}

export async function POST(request) {
  try {
    await connectDB();

    const webhookData = await request.json();

    // Extract message data
    const entry = webhookData.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages?.[0];
    const status = value?.statuses?.[0];

    if (messages) {
      await handleIncomingMessage(messages, value);
    } else if (status) {
      await handleMessageStatus(status);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleIncomingMessage(message, valueData) {
  try {
    const fromPhone = message.from;
    const messageType = message.type;
    logger.info('Processing WhatsApp message', { fromPhone, messageType });

    // Find or create customer
    const customer = await findOrCreateCustomer(fromPhone);

    if (messageType === 'text') {
      await handleTextMessage(message.text.body, fromPhone, customer);
    } else if (messageType === 'interactive') {
      await handleInteractiveMessage(message.interactive, fromPhone, customer);
    }
  } catch (error) {
    logger.error('Error handling incoming message:', error);
  }
}

async function handleTextMessage(messageText, fromPhone, customer) {
  const command = messageText.toLowerCase().trim();

  if (command === 'menu') {
    // Send product menu to customer
    const business = await User.findById(customer.userId);
    if (!business) {
      await whatsappService.sendMessage(
        fromPhone,
        '❌ Business not found. Please contact support.'
      );
      return;
    }

    const products = await Product.find({
      userId: business._id,
      isActive: true,
      'stock.quantity': { $gt: 0 },
    }).limit(10);

    if (products.length === 0) {
      await whatsappService.sendMessage(
        fromPhone,
        '📦 No products available at the moment. Please try again later.'
      );
      return;
    }

    await whatsappService.sendProductMenu(fromPhone, products, business.businessName);
  } else if (command === 'help') {
    await whatsappService.sendMessage(
      fromPhone,
      `
🛍️ *Welcome to our store!*

Commands:
• *menu* - View our products
• *help* - Show this message

Select any product from the menu to view details and purchase!
      `.trim()
    );
  } else {
    // Send generic response
    await whatsappService.sendMessage(
      fromPhone,
      '👋 Hello! Type "menu" to see our products or "help" for more information.'
    );
  }
}

async function handleInteractiveMessage(interactive, fromPhone, customer) {
  const buttonReply = interactive?.button_reply;
  const listReply = interactive?.list_reply;
  const replyId = buttonReply?.id || listReply?.id;

  logger.info('Interactive message received', { replyId });

  if (!replyId) return;

  // Handle product selection
  if (replyId.startsWith('product_')) {
    const productId = replyId.replace('product_', '');
    const product = await Product.findById(productId);

    if (!product) {
      await whatsappService.sendMessage(fromPhone, '❌ Product not found');
      return;
    }

    await whatsappService.sendProductDetails(fromPhone, product);
  }
  // Handle buy now
  else if (replyId.startsWith('buy_')) {
    const productId = replyId.replace('buy_', '');
    const product = await Product.findById(productId);
    const business = await User.findById(product.userId);

    if (!product || !business) {
      await whatsappService.sendMessage(fromPhone, '❌ Product or business not found');
      return;
    }

    // Create order
    try {
      const order = await orderService.createOrder(business._id, {
        customerId: customer._id,
        items: [
          {
            productId: product._id,
            quantity: 1,
          },
        ],
        shippingAddress: {
          name: customer.name,
          phone: fromPhone,
          country: 'South Africa',
        },
      });

      // Generate payment link
      const paymentService = (await import('@/services/payment.service')).default;
      const paymentData = await paymentService.generateOzowPaymentLink(order, customer);

      // Send payment link to customer
      await whatsappService.sendPaymentLink(fromPhone, order, paymentData.paymentUrl);

      logger.info('Order created and payment link sent', {
        orderId: order._id,
        customerId: customer._id,
      });
    } catch (error) {
      logger.error('Error creating order:', error);
      await whatsappService.sendMessage(
        fromPhone,
        '❌ Failed to create order. Please try again.'
      );
    }
  }
  // Handle back to menu
  else if (replyId === 'view_menu') {
    const business = await User.findById(customer.userId);
    const products = await Product.find({
      userId: business?._id,
      isActive: true,
      'stock.quantity': { $gt: 0 },
    }).limit(10);

    await whatsappService.sendProductMenu(fromPhone, products, business?.businessName || 'Store');
  }
}

async function handleMessageStatus(status) {
  // Log message delivery status
  logger.info('Message status updated', {
    messageId: status.id,
    status: status.status,
  });
}

async function findOrCreateCustomer(phoneNumber) {
  let customer = await Customer.findOne({ whatsappNumber: phoneNumber });

  if (!customer) {
    // Create new customer
    customer = await Customer.create({
      whatsappNumber: phoneNumber,
      name: `Customer ${phoneNumber.slice(-4)}`,
      totalSpent: 0,
      paymentCount: 0,
    });
  }

  return customer;
}
