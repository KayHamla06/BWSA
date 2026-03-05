// services/payment.service.js
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import logger from '../utils/logger.js';

const OZOW_API_KEY = process.env.OZOW_API_KEY;
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY;
const OZOW_API_URL = process.env.OZOW_API_URL || 'https://api.ozow.com';

class PaymentService {
  /**
   * Generate Ozow payment link
   */
  async generateOzowPaymentLink(order, customer) {
    try {
      const uniqueReference = `${order.orderNumber}-${Date.now()}`;
      
      const payload = {
        amount: Math.round(order.total * 100), // Convert to cents
        reference: uniqueReference,
        orderReference: order._id.toString(),
        customerName: customer.name,
        customerEmail: customer.email || '',
        customerPhone: customer.whatsappNumber,
        isTest: process.env.NODE_ENV === 'development',
      };

      // Generate signature
      const signatureString = `${payload.amount}${OZOW_PRIVATE_KEY}${payload.reference}`;
      const signature = crypto
        .createHash('sha512')
        .update(signatureString)
        .digest('hex');

      const requestPayload = {
        ApiKey: OZOW_API_KEY,
        Amount: payload.amount,
        Reference: payload.reference,
        OrderReference: payload.orderReference,
        CustomerName: payload.customerName,
        CustomerEmail: payload.customerEmail,
        CustomerPhone: payload.customerPhone,
        Signature: signature,
        IsTest: payload.isTest,
        SuccessUrl: `${process.env.APP_URL}/api/payments/ozow/success`,
        ErrorUrl: `${process.env.APP_URL}/api/payments/ozow/error`,
        NotificationUrl: `${process.env.APP_URL}/api/webhooks/ozow`,
      };

      const response = await axios.post(`${OZOW_API_URL}/CreatePayment`, requestPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      if (response.data.Status === 'Error') {
        logger.error('Ozow payment link error', { error: response.data.ErrorMessage });
        throw new Error(response.data.ErrorMessage || 'Failed to create Ozow payment');
      }

      // Create payment record
      const payment = await Payment.create({
        userId: order.userId,
        customerId: order.customerId,
        orderId: order._id,
        amount: order.total,
        currency: order.currency,
        paymentMethod: 'ozow',
        status: 'pending',
        paymentLinkId: response.data.Reference,
        description: `Payment for order ${order.orderNumber}`,
        metadata: {
          ozowId: response.data.OzowId,
          reference: response.data.Reference,
        },
      });

      logger.info('Ozow payment link generated', {
        orderId: order._id,
        paymentId: payment._id,
        amount: order.total,
      });

      return {
        paymentId: payment._id,
        paymentUrl: response.data.PaymentUrl,
        reference: response.data.Reference,
        ozowId: response.data.OzowId,
      };
    } catch (error) {
      logger.error('Error generating Ozow payment link', {
        orderId: order._id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verify Ozow payment webhook
   */
  async verifyOzowWebhook(webhookData) {
    try {
      const { Signature, Reference, Amount, OzowId, Status } = webhookData;

      // Create signature
      const signatureString = `${Amount}${OZOW_PRIVATE_KEY}${Reference}`;
      const expectedSignature = crypto
        .createHash('sha512')
        .update(signatureString)
        .digest('hex');

      if (Signature !== expectedSignature) {
        logger.warn('Ozow webhook signature mismatch', { Reference, OzowId });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error verifying Ozow webhook', { error: error.message });
      return false;
    }
  }

  /**
   * Handle successful Ozow payment
   */
  async handleOzowPaymentSuccess(webhookData) {
    try {
      const { Reference, Amount, OzowId, Status, OrderReference } = webhookData;

      // Find payment by reference
      const payment = await Payment.findOne({ paymentLinkId: Reference });

      if (!payment) {
        logger.warn('Payment not found for Ozow webhook', { Reference });
        return null;
      }

      // Verify amount matches
      if (Math.round(payment.amount * 100) !== Amount) {
        logger.error('Ozow payment amount mismatch', {
          paymentId: payment._id,
          expectedAmount: payment.amount,
          receivedAmount: Amount / 100,
        });
        return null;
      }

      // Update payment
      payment.status = Status === 'complete' ? 'completed' : 'pending';
      payment.transactionId = OzowId;
      payment.paidAt = Status === 'complete' ? new Date() : null;
      payment.webhookData = webhookData;
      await payment.save();

      // Update order
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = Status === 'complete' ? 'paid' : 'failed';
        order.paymentId = payment._id;
        
        if (Status === 'complete') {
          order.status = 'confirmed';
          order.statusHistory.push({
            status: 'confirmed',
            timestamp: new Date(),
            note: 'Payment confirmed via Ozow',
          });
        }
        
        await order.save();
      }

      logger.info('Ozow payment success processed', {
        paymentId: payment._id,
        orderId: order._id,
        amount: payment.amount,
      });

      return { payment, order };
    } catch (error) {
      logger.error('Error handling Ozow payment success', { error: error.message });
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('orderId')
        .populate('customerId');

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      logger.error('Error fetching payment status', { paymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Refund payment (Ozow)
   */
  async refundOzowPayment(paymentId, reason = '') {
    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentMethod !== 'ozow') {
        throw new Error('Can only refund Ozow payments');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      // Create refund request
      const refundRef = `REFUND-${paymentId}-${Date.now()}`;
      const signatureString = `${payment.amount}${OZOW_PRIVATE_KEY}${refundRef}`;
      const signature = crypto
        .createHash('sha512')
        .update(signatureString)
        .digest('hex');

      const requestPayload = {
        ApiKey: OZOW_API_KEY,
        Amount: Math.round(payment.amount * 100),
        Reference: refundRef,
        Signature: signature,
        OzowTransactionId: payment.transactionId,
      };

      const response = await axios.post(`${OZOW_API_URL}/CreateRefund`, requestPayload, {
        timeout: 15000,
      });

      if (response.data.Status === 'Error') {
        throw new Error(response.data.ErrorMessage);
      }

      // Update payment
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.metadata.refundRef = refundRef;
      payment.metadata.refundReason = reason;
      await payment.save();

      logger.info('Ozow refund initiated', {
        paymentId: payment._id,
        refundRef,
        amount: payment.amount,
      });

      return payment;
    } catch (error) {
      logger.error('Error refunding Ozow payment', { paymentId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user's payment history
   */
  async getUserPaymentHistory(userId, filters = {}) {
    try {
      const { page = 1, limit = 20, status } = filters;
      const skip = (page - 1) * limit;

      const query = { userId };
      if (status) query.status = status;

      const [payments, total] = await Promise.all([
        Payment.find(query)
          .populate('orderId')
          .populate('customerId')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Payment.countDocuments(query),
      ]);

      return {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching payment history', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate payment statistics
   */
  async getPaymentStats(userId, dateRange = {}) {
    try {
      const match = { userId };

      // Add date filtering if provided
      if (dateRange.startDate || dateRange.endDate) {
        match.createdAt = {};
        if (dateRange.startDate) {
          match.createdAt.$gte = new Date(dateRange.startDate);
        }
        if (dateRange.endDate) {
          match.createdAt.$lte = new Date(dateRange.endDate);
        }
      }

      const stats = await Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          },
        },
      ]);

      const totalStats = {
        totalPayments: 0,
        totalAmount: 0,
        completedPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        refundedPayments: 0,
      };

      stats.forEach(stat => {
        totalStats.totalPayments += stat.count;
        totalStats.totalAmount += stat.total;

        if (stat._id === 'completed') totalStats.completedPayments = stat.count;
        if (stat._id === 'failed') totalStats.failedPayments = stat.count;
        if (stat._id === 'pending') totalStats.pendingPayments = stat.count;
        if (stat._id === 'refunded') totalStats.refundedPayments = stat.count;
      });

      return totalStats;
    } catch (error) {
      logger.error('Error calculating payment stats', { userId, error: error.message });
      throw error;
    }
  }
}

export default new PaymentService();
