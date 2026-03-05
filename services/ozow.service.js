// services/ozow.service.js
import crypto from 'crypto';
import axios from 'axios';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.middleware.js';
import whatsappService from './whatsapp.service.js';

class OzowService {
  constructor() {
    this.siteCode = process.env.OZOW_SITE_CODE;
    this.privateKey = process.env.OZOW_PRIVATE_KEY;
    this.apiKey = process.env.OZOW_API_KEY;
    this.baseURL = process.env.OZOW_BASE_URL || 'https://api.ozow.com';
    this.isTest = process.env.OZOW_IS_TEST === 'true';
  }

  // Generate hash for Ozow request
  generateHash(fields) {
    const str = fields.join('').toLowerCase();
    return crypto
      .createHash('sha512')
      .update(str + this.privateKey)
      .digest('hex')
      .toLowerCase();
  }

  // Verify webhook signature
  verifyWebhookSignature(data, receivedHash) {
    const fields = Object.keys(data)
      .filter(key => key !== 'HashCheck')
      .sort()
      .map(key => data[key]);
    
    const expectedHash = this.generateHash(fields);
    return expectedHash === receivedHash.toLowerCase();
  }

  // Create payment link
  async createPaymentLink(userId, paymentData) {
    try {
      const { customerId, amount, description, metadata = {} } = paymentData;

      // Get customer details
      const customer = await Customer.findOne({ _id: customerId, userId });
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      // Create payment record
      const payment = await Payment.create({
        userId,
        customerId,
        amount,
        currency: 'ZAR',
        paymentMethod: 'ozow',
        status: 'pending',
        description,
        metadata,
      });

      // Generate unique payment link ID
      const paymentLinkId = `PAY-${Date.now()}-${payment._id.toString().slice(-6)}`;
      payment.paymentLinkId = paymentLinkId;
      await payment.save();

      // Prepare Ozow request parameters
      const siteCode = this.siteCode;
      const countryCode = 'ZA';
      const currencyCode = 'ZAR';
      const amountInCents = Math.round(amount * 100);
      const transactionReference = payment._id.toString();
      const bankReference = `Payment for ${description}`;
      const cancelUrl = `${process.env.APP_URL}/payment/cancelled`;
      const errorUrl = `${process.env.APP_URL}/payment/error`;
      const successUrl = `${process.env.APP_URL}/payment/success`;
      const notifyUrl = `${process.env.APP_URL}/api/webhooks/ozow`;
      const isTest = this.isTest ? 'true' : 'false';

      // Optional customer details
      const customer1 = customer.name;
      const customer2 = customer.email || '';
      const customer3 = customer.whatsappNumber;

      // Generate hash
      const hashFields = [
        siteCode,
        countryCode,
        currencyCode,
        amountInCents.toString(),
        transactionReference,
        bankReference,
        cancelUrl,
        errorUrl,
        successUrl,
        notifyUrl,
        isTest,
      ];

      const hashCheck = this.generateHash(hashFields);

      // Construct payment URL
      const params = new URLSearchParams({
        SiteCode: siteCode,
        CountryCode: countryCode,
        CurrencyCode: currencyCode,
        Amount: amountInCents.toString(),
        TransactionReference: transactionReference,
        BankReference: bankReference,
        CancelUrl: cancelUrl,
        ErrorUrl: errorUrl,
        SuccessUrl: successUrl,
        NotifyUrl: notifyUrl,
        IsTest: isTest,
        HashCheck: hashCheck,
        Customer: customer1,
        ...(customer2 && { Optional1: customer2 }),
        ...(customer3 && { Optional2: customer3 }),
      });

      const paymentUrl = `${this.baseURL}/PostPaymentRequest?${params.toString()}`;

      // Update payment with URL
      payment.metadata.paymentUrl = paymentUrl;
      await payment.save();

      logger.info('Payment link created', {
        userId,
        paymentId: payment._id,
        amount,
        customerId,
      });

      return {
        payment,
        paymentUrl,
        paymentLinkId,
      };
    } catch (error) {
      logger.error('Error creating payment link:', error);
      throw error;
    }
  }

  // Handle webhook notification
  async handleWebhook(webhookData) {
    try {
      logger.info('Processing Ozow webhook', { data: webhookData });

      const {
        TransactionId,
        TransactionReference,
        Amount,
        Status,
        CurrencyCode,
        StatusMessage,
        HashCheck,
      } = webhookData;

      // Verify signature
      if (!this.verifyWebhookSignature(webhookData, HashCheck)) {
        throw new AppError('Invalid webhook signature', 401);
      }

      // Find payment
      const payment = await Payment.findById(TransactionReference)
        .populate('userId')
        .populate('customerId');

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      // Update payment status
      const oldStatus = payment.status;
      
      if (Status === 'Complete' || Status === 'PendingInvestigation') {
        payment.status = 'completed';
        payment.paidAt = new Date();
        payment.transactionId = TransactionId;
      } else if (Status === 'Cancelled') {
        payment.status = 'failed';
        payment.failureReason = 'Payment cancelled by user';
      } else if (Status === 'Error') {
        payment.status = 'failed';
        payment.failureReason = StatusMessage || 'Payment error';
      }

      payment.webhookData = webhookData;
      await payment.save();

      logger.info('Payment status updated', {
        paymentId: payment._id,
        oldStatus,
        newStatus: payment.status,
        transactionId: TransactionId,
      });

      // Update customer stats
      if (payment.status === 'completed') {
        await Customer.findByIdAndUpdate(payment.customerId, {
          $inc: {
            totalSpent: payment.amount,
            paymentCount: 1,
          },
          lastPaymentDate: new Date(),
        });

        // Send WhatsApp confirmation
        if (payment.customerId.whatsappNumber) {
          await whatsappService.sendPaymentConfirmation(
            payment.customerId.whatsappNumber,
            payment.amount,
            TransactionId
          );
        }

        // Trigger payment_received flow
        await whatsappService.triggerFlows(
          'payment_received',
          null,
          payment.customerId,
          payment.customerId.whatsappNumber
        );
      }

      return payment;
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Check payment status (manual check)
  async checkPaymentStatus(paymentId, userId) {
    try {
      const payment = await Payment.findOne({ _id: paymentId, userId });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      // In production, you might want to query Ozow API for status
      // For now, return stored status

      return {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
      };
    } catch (error) {
      logger.error('Error checking payment status:', error);
      throw error;
    }
  }

  // Refund payment (if supported by Ozow)
  async refundPayment(paymentId, userId, reason = '') {
    try {
      const payment = await Payment.findOne({ _id: paymentId, userId });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (payment.status !== 'completed') {
        throw new AppError('Only completed payments can be refunded', 400);
      }

      // Update payment status
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.failureReason = reason;
      await payment.save();

      // Update customer stats
      await Customer.findByIdAndUpdate(payment.customerId, {
        $inc: {
          totalSpent: -payment.amount,
        },
      });

      logger.info('Payment refunded', { paymentId, userId, reason });

      return payment;
    } catch (error) {
      logger.error('Error refunding payment:', error);
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStats(userId, startDate, endDate) {
    try {
      const matchQuery = { userId, paymentMethod: 'ozow' };

      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }

      const stats = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            successfulAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] },
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
          },
        },
      ]);

      return stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        successfulAmount: 0,
        failedPayments: 0,
        pendingPayments: 0,
      };
    } catch (error) {
      logger.error('Error fetching payment stats:', error);
      throw error;
    }
  }
}

export default new OzowService();
