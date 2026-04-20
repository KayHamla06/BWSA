import crypto from 'crypto';
import SellerPayment from '../models/SellerPayment.js';

function generateHash(fields, privateKey) {
  const value = fields.join('').toLowerCase();
  return crypto.createHash('sha512').update(value + privateKey).digest('hex').toLowerCase();
}

// Platform-level Ozow configuration (fallback)
function getPlatformConfig() {
  return {
    siteCode: process.env.OZOW_SITE_CODE,
    privateKey: process.env.OZOW_PRIVATE_KEY,
    apiKey: process.env.OZOW_API_KEY,
    baseUrl: process.env.OZOW_BASE_URL || 'https://pay.ozow.com',
    isTest: process.env.OZOW_IS_TEST === 'true',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  };
}

// Get seller-specific Ozow config, falling back to platform config
export async function getSellerConfig(sellerId) {
  const sellerPayment = await SellerPayment.findOne({ userId: sellerId });

  if (sellerPayment && sellerPayment.isConfigured) {
    return {
      siteCode: sellerPayment.ozowSiteCode,
      privateKey: sellerPayment.ozowPrivateKey,
      apiKey: sellerPayment.ozowApiKey,
      baseUrl: process.env.OZOW_BASE_URL || 'https://pay.ozow.com',
      isTest: process.env.OZOW_IS_TEST === 'true',
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      isSeller: true,
    };
  }

  return { ...getPlatformConfig(), isSeller: false };
}

export async function createPaymentRequest(sellerId, amount, reference, customer = {}) {
  const config = await getSellerConfig(sellerId);

  if (!config.siteCode || !config.privateKey) {
    return { success: false, error: 'Payment gateway not configured' };
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: 'Invalid payment amount' };
  }

  const amountInCents = Math.round(parsedAmount * 100).toString();
  const notifyUrl = `${config.appUrl}/api/webhooks/ozow`;
  const successUrl = `${config.appUrl}/payment-success`;
  const errorUrl = `${config.appUrl}/payment-failed`;
  const cancelUrl = `${config.appUrl}/payment-cancelled`;

  const fields = [
    config.siteCode, 'ZA', 'ZAR', amountInCents, reference,
    `Payment ${reference}`, cancelUrl, errorUrl, successUrl, notifyUrl,
    config.isTest ? 'true' : 'false',
  ];

  const hash = generateHash(fields, config.privateKey);

  const params = new URLSearchParams({
    SiteCode: config.siteCode,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: amountInCents,
    TransactionReference: reference,
    BankReference: `Payment ${reference}`,
    CancelUrl: cancelUrl,
    ErrorUrl: errorUrl,
    SuccessUrl: successUrl,
    NotifyUrl: notifyUrl,
    IsTest: config.isTest ? 'true' : 'false',
    HashCheck: hash,
    ...(customer.name && { Customer: customer.name }),
    ...(customer.email && { Optional1: customer.email }),
    ...(customer.phone && { Optional2: customer.phone }),
  });

  return {
    success: true,
    data: {
      redirectUrl: `${config.baseUrl}/PostPaymentRequest?${params.toString()}`,
      reference,
    },
  };
}

export function verifyWebhook(body, signature) {
  const config = getPlatformConfig();
  if (!config.privateKey || !body) return false;

  const sig = String(signature || body.HashCheck || '').replace('sha512=', '').trim().toLowerCase();
  if (!sig) return false;

  const data = { ...body };
  delete data.HashCheck;
  const fields = Object.keys(data).sort().map((k) => data[k]);
  const expected = generateHash(fields, config.privateKey);

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(sig.padEnd(expected.length, '0'), 'hex').subarray(0, Buffer.from(expected, 'hex').length)
  );
}

export const ozowService = {
  getSellerConfig,
  createPaymentRequest,
  verifyWebhook,
  generateHash,
  getPlatformConfig,
};
