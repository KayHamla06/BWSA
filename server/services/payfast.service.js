import crypto from 'crypto';
import SellerPayment from '../models/SellerPayment.js';

function encode(value) {
  return encodeURIComponent(String(value ?? '').trim()).replace(/%20/g, '+');
}

function buildSignature(data, passphrase = '') {
  const filtered = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .sort(([left], [right]) => left.localeCompare(right));

  let payload = filtered.map(([key, value]) => `${key}=${encode(value)}`).join('&');
  if (passphrase) {
    payload += `${payload ? '&' : ''}passphrase=${encode(passphrase)}`;
  }

  return crypto.createHash('md5').update(payload).digest('hex');
}

function getPlatformConfig() {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    baseUrl: process.env.PAYFAST_SANDBOX === 'true'
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    sandbox: process.env.PAYFAST_SANDBOX === 'true',
  };
}

export async function getSellerConfig(sellerId) {
  const sellerPayment = await SellerPayment.findOne({ userId: sellerId });

  if (
    sellerPayment
    && sellerPayment.paymentFlow === 'payfast_direct'
    && sellerPayment.payfastMerchantId
    && sellerPayment.payfastMerchantKey
  ) {
    return {
      merchantId: sellerPayment.payfastMerchantId,
      merchantKey: sellerPayment.payfastMerchantKey,
      passphrase: sellerPayment.payfastPassphrase || '',
      returnUrl: sellerPayment.payfastReturnUrl || '',
      cancelUrl: sellerPayment.payfastCancelUrl || '',
      ...getPlatformConfig(),
      merchantId: sellerPayment.payfastMerchantId,
      merchantKey: sellerPayment.payfastMerchantKey,
      passphrase: sellerPayment.payfastPassphrase || '',
      isSellerDirect: true,
      paymentFlow: 'payfast_direct',
    };
  }

  return {
    ...getPlatformConfig(),
    isSellerDirect: false,
    paymentFlow: 'ubuntu_pay',
  };
}

export async function createPaymentRequest(sellerId, amount, reference, customer = {}, metadata = {}) {
  const config = await getSellerConfig(sellerId);

  if (!config.merchantId || !config.merchantKey) {
    return { success: false, error: 'PayFast is not configured yet.' };
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { success: false, error: 'Invalid payment amount.' };
  }

  const returnUrl = config.returnUrl || `${config.appUrl}/payments`;
  const cancelUrl = config.cancelUrl || `${config.appUrl}/payments`;
  const notifyUrl = `${config.appUrl}/payment/webhook`;

  const data = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    name_first: customer.name || 'Customer',
    email_address: customer.email || 'payments@ubuntu.market',
    m_payment_id: reference,
    amount: parsedAmount.toFixed(2),
    item_name: metadata.itemName || `Ubuntu Market Payment ${reference}`,
    item_description: metadata.description || metadata.itemName || 'WhatsApp commerce payment',
    custom_str1: sellerId.toString(),
    custom_str2: config.paymentFlow,
    custom_str3: metadata.orderId || '',
    custom_str4: customer.phone || '',
  };

  const signature = buildSignature(data, config.passphrase);
  const params = new URLSearchParams({ ...data, signature });

  return {
    success: true,
    data: {
      redirectUrl: `${config.baseUrl}?${params.toString()}`,
      reference,
      provider: 'payfast',
      paymentFlow: config.paymentFlow,
    },
  };
}

export function verifyWebhook(body) {
  const signature = String(body?.signature || '').trim().toLowerCase();
  if (!signature) return false;

  const payload = { ...body };
  delete payload.signature;

  const platformExpected = buildSignature(payload, process.env.PAYFAST_PASSPHRASE || '');
  if (platformExpected === signature) return true;

  return false;
}

export const payfastService = {
  buildSignature,
  getPlatformConfig,
  getSellerConfig,
  createPaymentRequest,
  verifyWebhook,
};