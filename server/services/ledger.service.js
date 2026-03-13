import crypto from 'crypto';
import LedgerEntry from '../models/LedgerEntry.js';
import { auditService } from './audit.service.js';
import { logger } from '../utils/logger.js';

function walletAccount(userId) {
  return `wallet:${userId}`;
}

function buildLedgerId() {
  return `LED-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveLedgerSecret() {
  return process.env.LEDGER_SECRET_KEY || process.env.JWT_SECRET || 'ubuntu-ledger-default-secret';
}

export function buildLedgerSignature(transactionId, amount) {
  const source = `${transactionId}${Number(amount).toFixed(2)}${resolveLedgerSecret()}`;
  return crypto.createHash('sha256').update(source).digest('hex');
}

export function verifyLedgerSignature(entry) {
  const expected = buildLedgerSignature(entry.transactionId, entry.amount);
  return expected === entry.signatureHash;
}

export async function createLedgerEntry({
  userId,
  transactionId,
  accountFrom,
  accountTo,
  amount,
  reference,
  transactionType,
  timestamp = new Date(),
}) {
  const parsedAmount = Number(amount || 0);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Invalid ledger amount');
  }

  return LedgerEntry.create({
    ledgerId: buildLedgerId(),
    transactionId,
    userId,
    accountFrom,
    accountTo,
    amount: Number(parsedAmount.toFixed(2)),
    reference: reference || '',
    transactionType,
    timestamp,
    signatureHash: buildLedgerSignature(transactionId, parsedAmount),
  });
}

export async function calculateWalletBalance(userId, { verifyIntegrity = true, ipAddress = '' } = {}) {
  const account = walletAccount(userId);
  const entries = await LedgerEntry.find({
    userId,
    $or: [{ accountFrom: account }, { accountTo: account }],
  })
    .sort({ timestamp: 1 })
    .select('transactionId accountFrom accountTo amount signatureHash transactionType timestamp reference');

  let credits = 0;
  let debits = 0;

  for (const entry of entries) {
    if (verifyIntegrity && !verifyLedgerSignature(entry)) {
      const description = `Ledger signature mismatch for transaction ${entry.transactionId}`;
      logger.error(description);
      await auditService.logFinancialAction({
        userId,
        actionType: 'security_alert',
        description,
        ipAddress,
      });
      throw new Error('Ledger integrity verification failed');
    }

    if (entry.accountTo === account) credits += Number(entry.amount || 0);
    if (entry.accountFrom === account) debits += Number(entry.amount || 0);
  }

  return {
    balance: Number((credits - debits).toFixed(2)),
    credits: Number(credits.toFixed(2)),
    debits: Number(debits.toFixed(2)),
    count: entries.length,
  };
}

export const ledgerService = {
  walletAccount,
  buildLedgerSignature,
  verifyLedgerSignature,
  createLedgerEntry,
  calculateWalletBalance,
};