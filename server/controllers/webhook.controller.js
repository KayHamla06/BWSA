import crypto from 'crypto';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { ozowService } from '../services/ozow.service.js';
import { broadcast } from '../services/notification.service.js';

// WhatsApp webhook verification (GET)
export async function verifyWhatsApp(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Verification failed' });
}

// WhatsApp incoming messages (POST)
export async function handleWhatsApp(req, res) {
  try {
    // Verify signature in production
    if (process.env.NODE_ENV === 'production' && process.env.WHATSAPP_APP_SECRET) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) return res.status(401).json({ error: 'Missing signature' });

      const expected = 'sha256=' + crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(req.rawBody || JSON.stringify(req.body))
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const body = req.body;
    res.sendStatus(200); // Acknowledge immediately

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    const from = message.from;
    const text = message.text?.body?.trim().toLowerCase() || '';
    const interactiveId = message.interactive?.list_reply?.id || message.interactive?.button_reply?.id || '';

    // Find seller by WhatsApp number mapping
    // For now, we identify sellers based on the phone_number_id receiving the message
    const phoneNumberId = value.metadata?.phone_number_id;

    // Find the seller whose whatsappNumber matches, or use the platform default
    let seller = await User.findOne({ whatsappNumber: { $regex: phoneNumberId?.slice(-8) || 'none' } });
    if (!seller) {
      // Fallback: find first active seller (for single-seller setup)
      seller = await User.findOne({ status: 'active' }).sort({ createdAt: 1 });
    }

    if (!seller) return;

    // Handle "menu" command
    if (text === 'menu' || text === 'hi' || text === 'hello' || text === 'shop') {
      const products = await Product.find({ userId: seller._id, isActive: true, stock: { $gt: 0 } })
        .sort({ soldCount: -1 })
        .limit(10);

      if (products.length === 0) {
        await whatsappService.sendTextMessage(from, `Welcome to ${seller.businessName}! 🏪\n\nOur store is being updated. Please check back soon!`);
        return;
      }

      await whatsappService.sendProductMenu(from, products, seller.businessName);
      return;
    }

    // Handle product selection from list
    if (interactiveId.startsWith('product_')) {
      const productId = interactiveId.replace('product_', '');
      const product = await Product.findById(productId);

      if (!product) {
        await whatsappService.sendTextMessage(from, 'Sorry, that product is no longer available. Reply "menu" to see our products.');
        return;
      }

      await whatsappService.sendProductDetails(from, product);
      return;
    }

    // Handle Buy Now
    if (interactiveId.startsWith('buy_')) {
      const productId = interactiveId.replace('buy_', '');
      const product = await Product.findById(productId);

      if (!product || product.stock <= 0) {
        await whatsappService.sendTextMessage(from, 'Sorry, this product is out of stock. Reply "menu" to browse.');
        return;
      }

      // Find or create customer
      let customer = await Customer.findOne({ userId: seller._id, whatsappNumber: from });
      if (!customer) {
        customer = await Customer.create({
          userId: seller._id,
          name: value.contacts?.[0]?.profile?.name || from,
          whatsappNumber: from,
        });
      }

      // Create order
      const reference = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const order = await Order.create({
        userId: seller._id,
        productId: product._id,
        customerId: customer._id,
        customerPhone: from,
        amount: product.price,
        paymentReference: reference,
        productSnapshot: { name: product.name, price: product.price, image_url: product.image_url },
      });

      // Create Ozow payment
      const payResult = await ozowService.createPaymentRequest(seller._id, product.price, reference, {
        name: customer.name,
        phone: from,
      });

      if (payResult.success) {
        order.paymentUrl = payResult.data.redirectUrl;
        await order.save();

        await Payment.create({
          userId: seller._id,
          orderId: order._id,
          customerId: customer._id,
          amount: product.price,
          paymentReference: reference,
          paymentUrl: payResult.data.redirectUrl,
        });

        await whatsappService.sendPaymentLink(from, product.name, product.price, payResult.data.redirectUrl);
      } else {
        await whatsappService.sendTextMessage(from, 'Sorry, we could not process your payment at this time. Please try again later.');
      }

      return;
    }

    // Handle back to menu
    if (interactiveId === 'view_menu') {
      const products = await Product.find({ userId: seller._id, isActive: true, stock: { $gt: 0 } }).limit(10);
      await whatsappService.sendProductMenu(from, products, seller.businessName);
      return;
    }

    // Default response
    await whatsappService.sendTextMessage(from,
      `Welcome to ${seller.businessName}! 🏪\n\nSend *menu* to browse our products.\nSend *help* for assistance.`
    );
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
  }
}

// Ozow payment webhook (POST)
export async function handleOzowWebhook(req, res) {
  try {
    const body = req.body;
    const transactionId = body.TransactionId || body.transactionId;
    const reference = body.TransactionReference || body.transactionReference;
    const status = (body.Status || body.status || '').toUpperCase();
    const amount = body.Amount || body.amount;

    // Find the order
    const order = await Order.findOne({ paymentReference: reference });
    const payment = await Payment.findOne({ paymentReference: reference });

    if (status === 'COMPLETE') {
      if (order) {
        order.status = 'paid';
        await order.save();

        // Update product sold count and stock
        const product = await Product.findById(order.productId);
        if (product) {
          product.soldCount += 1;
          product.revenue += order.amount;
          if (product.stock > 0) product.stock -= 1;
          await product.save();
        }

        // Update customer stats
        const customer = await Customer.findById(order.customerId);
        if (customer) {
          customer.totalSpent += order.amount;
          customer.orderCount += 1;
          customer.lastOrderDate = new Date();
          await customer.save();
        }

        // Send WhatsApp confirmation
        await whatsappService.sendPaymentConfirmation(order.customerPhone, order.amount, reference);

        // Real-time dashboard notification
        broadcast(order.userId.toString(), 'sale', {
          product: order.productSnapshot?.name || 'Product',
          amount: order.amount,
          customer: order.customerPhone,
          reference,
        });
      }

      if (payment) {
        payment.status = 'completed';
        payment.transactionId = transactionId;
        payment.paidAt = new Date();
        payment.webhookData = body;
        await payment.save();
      }
    } else if (status === 'ERROR' || status === 'CANCELLED') {
      if (order) {
        order.status = 'failed';
        await order.save();
      }
      if (payment) {
        payment.status = 'failed';
        payment.failureReason = status;
        payment.webhookData = body;
        await payment.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ozow webhook error:', error);
    res.status(500).json({ success: false });
  }
}
