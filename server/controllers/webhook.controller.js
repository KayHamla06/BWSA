import crypto from 'crypto';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import SellerPayment from '../models/SellerPayment.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { payfastService } from '../services/payfast.service.js';
import { paymentService } from '../services/payment.service.js';
import { receiptService } from '../services/receipt.service.js';
import { broadcast } from '../services/notification.service.js';
import TransactionLog from '../models/TransactionLog.js';
import { auditService } from '../services/audit.service.js';

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
    // Verify signature whenever an app secret is configured.
    if (process.env.WHATSAPP_APP_SECRET) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) return res.status(401).json({ error: 'Missing signature' });

      const expected = 'sha256=' + crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(req.rawBody || JSON.stringify(req.body))
        .digest('hex');

      if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
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

    const products = await Product.find({ userId: seller._id, isActive: true, stock: { $gt: 0 } })
      .sort({ soldCount: -1 })
      .limit(10);

    // Handle menu/catalog/help commands
    if (['menu', 'catalog', 'hi', 'hello', 'shop'].includes(text)) {
      if (products.length === 0) {
        await whatsappService.sendTextMessage(from, `Welcome to ${seller.businessName}! 🏪\n\nOur store is being updated. Please check back soon!`);
        return;
      }

      await whatsappService.sendProductMenu(from, products, seller.businessName);
      return;
    }

    if (text === 'help') {
      await whatsappService.sendTextMessage(
        from,
        'Commands:\n- menu / catalog\n- buy 1 (buy item number)\n- help'
      );
      return;
    }

    if (text.startsWith('buy ')) {
      const index = Number(text.replace('buy', '').trim());
      if (!Number.isInteger(index) || index < 1 || index > products.length) {
        await whatsappService.sendTextMessage(from, 'Invalid product number. Send "menu" to view available products.');
        return;
      }
      const selected = products[index - 1];
      await whatsappService.sendProductDetails(from, selected);
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
          phoneNumber: from,
          lastContactDate: new Date(),
        });
      } else {
        customer.lastContactDate = new Date();
        await customer.save();
      }

      const reference = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const order = await Order.create({
        userId: seller._id,
        productId: product._id,
        customerId: customer._id,
        customerPhone: from,
        amount: product.price,
        paymentReference: reference,
        productSnapshot: { name: product.name, description: product.description || '', price: product.price, image_url: product.image_url },
      });

      const payResult = await payfastService.createPaymentRequest(seller._id, product.price, reference, {
        name: customer.name,
        phone: from,
      }, {
        itemName: product.name,
        description: product.description || product.name,
        orderId: order._id.toString(),
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
          paymentMethod: 'payfast',
          paymentProvider: 'payfast',
          paymentFlow: payResult.data.paymentFlow,
          destinationType: payResult.data.paymentFlow === 'payfast_direct' ? 'seller_direct' : 'platform_wallet',
          paymentUrl: payResult.data.redirectUrl,
          withdrawalEligible: payResult.data.paymentFlow === 'ubuntu_pay',
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

async function verifyPayfastWebhook(payment, body) {
  const sellerSettings = await SellerPayment.findOne({ userId: payment.userId });
  const passphrase = payment.paymentFlow === 'payfast_direct'
    ? sellerSettings?.payfastPassphrase || ''
    : process.env.PAYFAST_PASSPHRASE || '';

  const payload = { ...body };
  delete payload.signature;

  const expected = payfastService.buildSignature(payload, passphrase);
  return String(body.signature || '').trim().toLowerCase() === expected;
}

export async function handlePayfastWebhook(req, res) {
  try {
    const body = req.body;
    const reference = body.m_payment_id || body.payment_id || body.TransactionReference;
    const paymentTransactionId = body.pf_payment_id || body.payment_id || `pf-${Date.now()}`;
    const gatewayStatus = body.payment_status || body.status || body.Status;
    const mappedStatus = paymentService.mapGatewayStatus(gatewayStatus);
    const amount = Number(body.amount_gross || body.amount || 0);

    const order = await Order.findOne({ paymentReference: reference });
    const payment = await Payment.findOne({ paymentReference: reference });
    const sellerId = order?.userId || payment?.userId;

    if (!order || !payment || !sellerId) {
      return res.status(404).json({ success: false, message: 'Order/payment not found' });
    }

    const isValidSignature = await verifyPayfastWebhook(payment, body);
    if (!isValidSignature) {
      return res.status(401).json({ success: false, message: 'Invalid payment webhook signature' });
    }

    // Idempotency key: payment_transaction_id
    const existingTransaction = await TransactionLog.findOne({ transactionId: paymentTransactionId });
    if (existingTransaction) {
      return res.json({ success: true, duplicate: true });
    }

    try {
      await paymentService.recordTransactionLog({
        transactionId: paymentTransactionId,
        sellerId,
        customerPhone: order.customerPhone,
        productId: order.productId,
        orderId: order._id,
        amount: Number(order.amount || amount),
        status: mappedStatus,
        rawPayload: body,
        eventSource: 'payfast',
      });
    } catch (logError) {
      if (logError?.code === 11000) {
        return res.json({ success: true, duplicate: true });
      }
      throw logError;
    }

    if (mappedStatus === 'APPROVED') {
      if (payment.status !== 'completed') {
        order.status = 'paid';
        await order.save();

        const product = await Product.findById(order.productId);
        if (product) {
          product.soldCount += 1;
          product.revenue += order.amount;
          if (product.stock > 0) product.stock -= 1;
          await product.save();
        }

        const customer = await Customer.findById(order.customerId);
        if (customer) {
          customer.totalSpent += order.amount;
          customer.orderCount += 1;
          customer.totalOrders += 1;
          customer.lastOrderDate = new Date();
          customer.lastContactDate = new Date();
          await customer.save();
        }
      }

      payment.status = 'completed';
      payment.transactionId = paymentTransactionId;
      payment.paidAt = new Date();
      payment.webhookData = body;
      payment.failureReason = null;

      if (payment.paymentFlow === 'ubuntu_pay' && !payment.walletCreditedAt) {
        await paymentService.postPaymentCredit({
          userId: order.userId,
          transactionId: `LGR-${paymentTransactionId}`,
          amount: order.amount,
          reference: reference || payment.paymentReference,
        });
        payment.walletCreditedAt = new Date();
      }

      await payment.save();

      await auditService.logFinancialAction({
        userId: order.userId,
        actionType: 'payment_confirmation',
        description: `Payment confirmed for ${reference} (${paymentTransactionId})`,
        ipAddress: req.ip,
      });

      await whatsappService.sendPaymentConfirmation(order.customerPhone, order.amount, reference);

      setImmediate(async () => {
        try {
          const seller = await User.findById(order.userId);
          if (!seller) return;

          const { pdfUrl, receiptId } = await receiptService.generateReceiptAndStore({
            seller,
            order,
            payment,
            paymentStatus: mappedStatus,
            transactionId: paymentTransactionId,
          });

          await whatsappService.sendDocumentMessage(
            order.customerPhone,
            pdfUrl,
            `${receiptId}.pdf`,
            `Receipt for order ${order.paymentReference}`
          );
          await whatsappService.sendTextMessage(order.customerPhone, `Your receipt is ready: ${pdfUrl}`);

          if (seller.whatsappNumber) {
            await whatsappService.sendDocumentMessage(
              seller.whatsappNumber,
              pdfUrl,
              `${receiptId}.pdf`,
              `Receipt generated for customer ${order.customerPhone}`
            );
            await whatsappService.sendTextMessage(seller.whatsappNumber, `New receipt generated: ${pdfUrl}`);
          }
        } catch (receiptError) {
          console.error('Receipt async processing error:', receiptError.message);
        }
      });

      broadcast(order.userId.toString(), 'sale', {
        product: order.productSnapshot?.name || 'Product',
        amount: order.amount,
        customer: order.customerPhone,
        reference,
        paymentFlow: payment.paymentFlow,
      });
    } else {
      order.status = 'failed';
      await order.save();

      payment.status = 'failed';
      payment.failureReason = mappedStatus;
      payment.webhookData = body;
      payment.transactionId = paymentTransactionId;
      await payment.save();

      await auditService.logFinancialAction({
        userId: order.userId,
        actionType: 'wallet_update',
        description: `Payment failed for ${reference} (${paymentTransactionId})`,
        ipAddress: req.ip,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('PayFast webhook error:', error);
    res.status(500).json({ success: false });
  }
}

export const handleOzowWebhook = handlePayfastWebhook;
