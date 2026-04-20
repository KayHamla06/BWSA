import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Coupon from '../models/Coupon.js';
import SellerPayment from '../models/SellerPayment.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import User from '../models/User.js';
import { payfastService } from '../services/payfast.service.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { ApiError } from '../errors/ApiError.js';
import { paymentService } from '../services/payment.service.js';
import { decryptSensitive, encryptSensitive } from '../utils/crypto.util.js';
import { auditService } from '../services/audit.service.js';

function buildReference(prefix = 'PAY') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function sanitizeWithdrawal(withdrawal) {
  return {
    _id: withdrawal._id,
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    payoutMethod: withdrawal.payoutMethod,
    status: withdrawal.status,
    requestedAt: withdrawal.requestedAt,
    processedAt: withdrawal.processedAt,
    completedAt: withdrawal.completedAt,
    processingMessage: withdrawal.processingMessage,
    createdAt: withdrawal.createdAt,
    updatedAt: withdrawal.updatedAt,
  };
}

function encryptWithdrawalDestination(destination) {
  return {
    bankName: destination.bankName || '',
    accountHolder: destination.accountHolder ? encryptSensitive(destination.accountHolder) : '',
    accountNumber: destination.accountNumber ? encryptSensitive(destination.accountNumber) : '',
    accountType: destination.accountType || '',
    payshapId: destination.payshapId ? encryptSensitive(destination.payshapId) : '',
    qrPaymentDetails: destination.qrPaymentDetails ? encryptSensitive(destination.qrPaymentDetails) : '',
    capitecNumber: destination.capitecNumber ? encryptSensitive(destination.capitecNumber) : '',
    capitecSurname: destination.capitecSurname ? encryptSensitive(destination.capitecSurname) : '',
  };
}

function buildWithdrawalDestination(method, savedSettings, body) {
  const decrypted = {
    accountHolder: decryptSensitive(savedSettings.accountHolder),
    accountNumber: decryptSensitive(savedSettings.accountNumber),
    payshapId: decryptSensitive(savedSettings.payshapId),
    qrPaymentDetails: decryptSensitive(savedSettings.qrPaymentDetails),
    capitecNumber: decryptSensitive(savedSettings.capitecNumber),
    capitecSurname: decryptSensitive(savedSettings.capitecSurname),
  };

  if (method === 'bank' || method === 'immediate') {
    if (!savedSettings.bankName || !decrypted.accountHolder || !decrypted.accountNumber) {
      throw ApiError.badRequest('Please save your bank details in Settings first.');
    }

    return {
      bankName: savedSettings.bankName,
      accountHolder: decrypted.accountHolder,
      accountNumber: decrypted.accountNumber,
      accountType: savedSettings.accountType || '',
    };
  }

  if (method === 'payshap') {
    const payshapId = String(body.payshapId || decrypted.payshapId || '').trim();
    if (!payshapId) {
      throw ApiError.badRequest('Provide a PayShap ID or save one in Settings first.');
    }
    return { payshapId };
  }

  if (method === 'qr') {
    const qrPaymentDetails = String(body.qrPaymentDetails || decrypted.qrPaymentDetails || '').trim();
    if (!qrPaymentDetails) {
      throw ApiError.badRequest('Provide QR payment details or save them in Settings first.');
    }
    return { qrPaymentDetails };
  }

  if (method === 'capitec') {
    const capitecNumber = String(body.capitecNumber || decrypted.capitecNumber || '').trim();
    const capitecSurname = String(body.capitecSurname || decrypted.capitecSurname || '').trim();
    if (!capitecNumber || !capitecSurname) {
      throw ApiError.badRequest('Provide both the Capitec number and surname.');
    }
    return { capitecNumber, capitecSurname };
  }

  throw ApiError.badRequest('Unsupported withdrawal method.');
}

export async function createPaymentLink(req, res, next) {
  try {
    const { customerName, customerPhone, customerEmail, amount, productId, reason, couponCode } = req.body;
    const userId = req.user.userId;
    let finalAmount = Number(amount);

    if (productId) {
      const stockProduct = await Product.findOne({ _id: productId, userId });
      if (!stockProduct) {
        throw ApiError.notFound('Product not found');
      }
      if (Number(stockProduct.stock) <= 0) {
        throw ApiError.badRequest('This product is out of stock.');
      }
      finalAmount = Number(stockProduct.price);
    }

    if (couponCode) {
      const coupon = await Coupon.findOne({
        userId,
        couponCode: String(couponCode).trim().toUpperCase(),
        isActive: true,
        expirationDate: { $gte: new Date() },
      });

      if (!coupon) {
        throw ApiError.badRequest('Invalid or expired coupon code.');
      }

      finalAmount = Number((finalAmount * (1 - coupon.discountPercentage / 100)).toFixed(2));
    }

    // Find or create customer
    let customer = await Customer.findOne({ userId, whatsappNumber: customerPhone });
    if (!customer) {
      customer = await Customer.create({
        userId,
        name: customerName,
        email: customerEmail || '',
        whatsappNumber: customerPhone,
        phoneNumber: customerPhone,
        lastContactDate: new Date(),
      });
    } else {
      customer.lastContactDate = new Date();
      await customer.save();
    }

    const reference = buildReference('PAY');

    const result = await payfastService.createPaymentRequest(userId, finalAmount, reference, {
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    }, {
      itemName: reason || 'Payment',
    });

    if (!result.success) {
      throw ApiError.badRequest(result.error);
    }

    if (result.data.paymentFlow === 'ubuntu_pay') {
      await paymentService.ensureUbuntuPayAccount(userId);
    }

    let order = null;
    if (productId) {
      const product = await Product.findOne({ _id: productId, userId });
      if (product) {
        order = await Order.create({
          userId,
          productId: product._id,
          customerId: customer._id,
          customerPhone,
          amount: finalAmount,
          paymentReference: reference,
          paymentUrl: result.data.redirectUrl,
          productSnapshot: { name: product.name, description: product.description || '', price: product.price, image_url: product.image_url },
        });
      }
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      orderId: order?._id,
      customerId: customer._id,
      amount: finalAmount,
      paymentReference: reference,
      paymentMethod: 'payfast',
      paymentProvider: 'payfast',
      paymentFlow: result.data.paymentFlow,
      destinationType: result.data.paymentFlow === 'payfast_direct' ? 'seller_direct' : 'platform_wallet',
      paymentUrl: result.data.redirectUrl,
      withdrawalEligible: result.data.paymentFlow === 'ubuntu_pay',
    });

    await whatsappService.sendPaymentLink(
      customerPhone,
      reason || order?.productSnapshot?.name || 'Payment',
      finalAmount,
      result.data.redirectUrl
    );

    res.status(201).json({
      success: true,
      message: 'Payment link created and sent',
      payment: {
        id: payment._id,
        reference,
        amount: finalAmount,
        paymentUrl: result.data.redirectUrl,
        orderId: order?._id,
        paymentFlow: result.data.paymentFlow,
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

export async function getWalletSummary(req, res, next) {
  try {
    const [settings, account, recentWithdrawals, wallet, pendingWithdrawalAmount] = await Promise.all([
      SellerPayment.findOne({ userId: req.user.userId }),
      paymentService.ensureUbuntuPayAccount(req.user.userId),
      WithdrawalRequest.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(5),
      paymentService.getWalletBalance(req.user.userId, { ipAddress: req.ip }),
      WithdrawalRequest.aggregate([
        { $match: { userId: req.user.userId, status: { $in: ['pending', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      paymentFlow: settings?.paymentFlow || 'ubuntu_pay',
      directPayfastConfigured: Boolean(
        settings?.paymentFlow === 'payfast_direct' && settings?.payfastMerchantId && settings?.payfastMerchantKey
      ),
      ubuntuPayAccount: {
        walletStatus: account.walletStatus,
        currency: account.currency,
        availableBalance: wallet.balance,
        pendingBalance: pendingWithdrawalAmount[0]?.total || 0,
        totalCredits: wallet.credits,
        totalDebits: wallet.debits,
      },
      recentWithdrawals: recentWithdrawals.map((item) => sanitizeWithdrawal(item)),
    });
  } catch (error) {
    next(error);
  }
}

export async function listWithdrawals(req, res, next) {
  try {
    const withdrawals = await WithdrawalRequest.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, withdrawals: withdrawals.map((item) => sanitizeWithdrawal(item)) });
  } catch (error) {
    next(error);
  }
}

export async function createWithdrawalRequest(req, res, next) {
  let walletLocked = false;
  try {
    const { amount, payoutMethod, disclaimerAccepted } = req.body;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw ApiError.badRequest('Enter a valid withdrawal amount.');
    }

    if (!['immediate', 'bank', 'payshap', 'qr', 'capitec'].includes(String(payoutMethod || ''))) {
      throw ApiError.badRequest('Choose a valid payout method.');
    }

    const settings = await SellerPayment.findOne({ userId: req.user.userId });
    if (settings?.paymentFlow === 'payfast_direct') {
      throw ApiError.badRequest('Direct PayFast sellers do not have an Ubuntu Pay balance to withdraw.');
    }

    if (payoutMethod === 'immediate' && !disclaimerAccepted) {
      throw ApiError.badRequest('Accept the immediate payment warning before continuing.');
    }

    const account = await paymentService.ensureUbuntuPayAccount(req.user.userId);
    if (account.walletStatus === 'locked') {
      throw ApiError.badRequest('Your wallet is currently locked while another withdrawal is processing.');
    }

    await paymentService.lockWallet(req.user.userId, 'withdrawal_in_progress');
    walletLocked = true;

    const destination = buildWithdrawalDestination(payoutMethod, settings || {}, req.body);
    const encryptedDestination = encryptWithdrawalDestination(destination);
    const wallet = await paymentService.getWalletBalance(req.user.userId, { ipAddress: req.ip });
    if (wallet.balance < parsedAmount) {
      await paymentService.unlockWallet(req.user.userId);
      throw ApiError.badRequest('You do not have enough Ubuntu Pay balance for that withdrawal.');
    }

    const withdrawalTransactionId = buildReference('WDR');
    await paymentService.postWithdrawalDebit({
      userId: req.user.userId,
      transactionId: withdrawalTransactionId,
      amount: parsedAmount,
      reference: `Withdrawal request ${withdrawalTransactionId}`,
      payoutMethod,
    });

    const withdrawal = await WithdrawalRequest.create({
      userId: req.user.userId,
      amount: Number(parsedAmount.toFixed(2)),
      ledgerTransactionId: withdrawalTransactionId,
      payoutMethod,
      destination: encryptedDestination,
      status: 'processing',
      processedAt: new Date(),
      disclaimerAccepted: Boolean(disclaimerAccepted),
      disclaimerAcceptedAt: disclaimerAccepted ? new Date() : null,
    });

    await auditService.logFinancialAction({
      userId: req.user.userId,
      actionType: 'withdrawal',
      description: `Withdrawal initiated: R${Number(parsedAmount).toFixed(2)} via ${payoutMethod}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: withdrawal.processingMessage,
      withdrawal,
    });
  } catch (error) {
    if (walletLocked) {
      await paymentService.unlockWallet(req.user.userId);
    }
    next(error);
  }
}

export async function getPayment(req, res, next) {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!payment) throw ApiError.notFound('Payment not found');
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
}

export async function updateWithdrawalStatus(req, res, next) {
  try {
    const { status, adminNotes } = req.body;
    if (!['completed', 'rejected', 'cancelled'].includes(String(status || ''))) {
      throw ApiError.badRequest('Invalid withdrawal status');
    }

    const allowedAdminEmails = String(process.env.FINANCE_ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedAdminEmails.length) {
      throw ApiError.forbidden('Finance admin allow-list is not configured');
    }

    const actingUser = await User.findById(req.user.userId).select('email');
    const actingEmail = String(actingUser?.email || '').toLowerCase();

    if (allowedAdminEmails.length && !allowedAdminEmails.includes(actingEmail)) {
      throw ApiError.forbidden('You are not allowed to update withdrawal status');
    }

    const withdrawal = await WithdrawalRequest.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!withdrawal) {
      throw ApiError.notFound('Withdrawal request not found');
    }

    if (!['pending', 'processing'].includes(withdrawal.status)) {
      throw ApiError.badRequest('Withdrawal is already finalized');
    }

    withdrawal.status = status;
    withdrawal.adminNotes = adminNotes || '';
    if (status === 'completed') {
      withdrawal.completedAt = new Date();
    }
    if (['rejected', 'cancelled'].includes(status)) {
      await paymentService.postRefund({
        userId: withdrawal.userId,
        transactionId: buildReference('REV'),
        amount: withdrawal.amount,
        reference: `Reversal for withdrawal ${withdrawal.ledgerTransactionId || withdrawal._id}`,
      });

      await auditService.logFinancialAction({
        userId: withdrawal.userId,
        actionType: 'admin_adjustment',
        description: `Reversal posted for withdrawal ${withdrawal._id}`,
        ipAddress: req.ip,
      });
    }

    await withdrawal.save();
    await paymentService.unlockWallet(withdrawal.userId);

    await auditService.logFinancialAction({
      userId: withdrawal.userId,
      actionType: 'wallet_update',
      description: `Withdrawal ${withdrawal._id} marked as ${status}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, withdrawal });
  } catch (error) {
    next(error);
  }
}
