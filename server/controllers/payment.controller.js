import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { ozowService } from '../services/ozow.service.js';
import { whatsappService } from '../services/whatsapp.service.js';

export async function createPaymentLink(req, res, next) {
  try {
    const { customerName, customerPhone, customerEmail, amount, productId, reason } = req.body;
    const userId = req.user.userId;

    // Find or create customer
    let customer = await Customer.findOne({ userId, whatsappNumber: customerPhone });
    if (!customer) {
      customer = await Customer.create({
        userId,
        name: customerName,
        email: customerEmail || '',
        whatsappNumber: customerPhone,
      });
    }

    // Build reference
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create Ozow payment using seller's credentials
    const result = await ozowService.createPaymentRequest(userId, amount, reference, {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Create order if product specified
    let order = null;
    if (productId) {
      const product = await Product.findOne({ _id: productId, userId });
      if (product) {
        order = await Order.create({
          userId,
          productId: product._id,
          customerId: customer._id,
          customerPhone,
          amount: Number(amount),
          paymentReference: reference,
          paymentUrl: result.data.redirectUrl,
          productSnapshot: { name: product.name, price: product.price, image_url: product.image_url },
        });
      }
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      orderId: order?._id,
      customerId: customer._id,
      amount: Number(amount),
      paymentReference: reference,
      paymentUrl: result.data.redirectUrl,
    });

    // Send payment link via WhatsApp
    await whatsappService.sendPaymentLink(
      customerPhone,
      reason || order?.productSnapshot?.name || 'Payment',
      amount,
      result.data.redirectUrl
    );

    res.status(201).json({
      success: true,
      message: 'Payment link created and sent',
      payment: {
        id: payment._id,
        reference,
        amount: Number(amount),
        paymentUrl: result.data.redirectUrl,
        orderId: order?._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listPayments(req, res, next) {
  try {
    const { status } = req.query;
    const filter = { userId: req.user.userId };
    if (status) filter.status = status;

    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    next(error);
  }
}

export async function getPayment(req, res, next) {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
}
