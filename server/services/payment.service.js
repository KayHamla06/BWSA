import TransactionLog from '../models/TransactionLog.js';
import UbuntuPayAccount from '../models/UbuntuPayAccount.js';
import { ledgerService } from './ledger.service.js';

export function mapGatewayStatus(input) {
  const normalized = String(input || '').trim().toUpperCase();

  if (['COMPLETE', 'COMPLETED', 'APPROVED', 'SUCCESS'].includes(normalized)) {
    return 'APPROVED';
  }
  if (['DECLINED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(normalized)) {
    return 'DECLINED';
  }
  return 'FAILED';
}

export async function recordTransactionLog(payload) {
  return TransactionLog.create(payload);
}

export async function ensureUbuntuPayAccount(userId) {
  return UbuntuPayAccount.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true }
  );
}

export async function lockWallet(userId, reason = 'withdrawal_in_progress') {
  await ensureUbuntuPayAccount(userId);

  const locked = await UbuntuPayAccount.findOneAndUpdate(
    { userId, walletStatus: 'active' },
    {
      $set: {
        walletStatus: 'locked',
        lockReason: reason,
        lockedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!locked) {
    throw new Error('Wallet is currently locked');
  }

  return locked;
}

export async function unlockWallet(userId) {
  return UbuntuPayAccount.findOneAndUpdate(
    { userId },
    {
      $set: {
        walletStatus: 'active',
        lockReason: '',
        lockedAt: null,
        lastCalculatedAt: new Date(),
      },
    },
    { new: true }
  );
}

export async function postPaymentCredit({ userId, transactionId, amount, reference }) {
  return ledgerService.createLedgerEntry({
    userId,
    transactionId,
    accountFrom: 'payfast_platform',
    accountTo: ledgerService.walletAccount(userId),
    amount,
    reference,
    transactionType: 'payment_credit',
  });
}

export async function postWithdrawalDebit({ userId, transactionId, amount, reference, payoutMethod }) {
  return ledgerService.createLedgerEntry({
    userId,
    transactionId,
    accountFrom: ledgerService.walletAccount(userId),
    accountTo: `payout:${payoutMethod || 'bank'}`,
    amount,
    reference,
    transactionType: 'withdrawal_debit',
  });
}

export async function postRefund({ userId, transactionId, amount, reference }) {
  return ledgerService.createLedgerEntry({
    userId,
    transactionId,
    accountFrom: `payout:refund`,
    accountTo: ledgerService.walletAccount(userId),
    amount,
    reference,
    transactionType: 'refund',
  });
}

export async function postAdjustment({ userId, transactionId, amount, reference, direction = 'credit' }) {
  return ledgerService.createLedgerEntry({
    userId,
    transactionId,
    accountFrom: direction === 'credit' ? 'adjustment:system' : ledgerService.walletAccount(userId),
    accountTo: direction === 'credit' ? ledgerService.walletAccount(userId) : 'adjustment:system',
    amount,
    reference,
    transactionType: 'adjustment',
  });
}

export async function getWalletBalance(userId, options = {}) {
  return ledgerService.calculateWalletBalance(userId, options);
}

export const paymentService = {
  mapGatewayStatus,
  recordTransactionLog,
  ensureUbuntuPayAccount,
  lockWallet,
  unlockWallet,
  postPaymentCredit,
  postWithdrawalDebit,
  postRefund,
  postAdjustment,
  getWalletBalance,
};
