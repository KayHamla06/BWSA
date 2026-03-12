import crypto from 'crypto';

function getOzowConfig() {
  return {
    siteCode: process.env.OZOW_SITE_CODE || process.env.OZOW_SITE_CODE_LIVE,
    privateKey: process.env.OZOW_PRIVATE_KEY,
    baseUrl: process.env.OZOW_BASE_URL || 'https://pay.ozow.com',
    isTest: process.env.OZOW_IS_TEST === 'true',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  };
}

function isConfigured() {
  const { siteCode, privateKey } = getOzowConfig();
  return Boolean(siteCode && privateKey);
}

function generateHash(fields, privateKey) {
  const value = fields.join('').toLowerCase();
  return crypto
    .createHash('sha512')
    .update(value + privateKey)
    .digest('hex')
    .toLowerCase();
}

async function createPaymentRequest(
  amount,
  reference,
  successUrl,
  errorUrl,
  cancelUrl,
  customer = {}
) {
  try {
    const config = getOzowConfig();

    if (!isConfigured()) {
      return {
        success: false,
        error: 'Ozow integration is not configured yet. Add OZOW_SITE_CODE and OZOW_PRIVATE_KEY in .env.local.',
      };
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return { success: false, error: 'Invalid payment amount' };
    }

    const amountInCents = Math.round(parsedAmount * 100).toString();
    const notifyUrl = `${config.appUrl}/api/webhooks/ozow`;

    const fields = [
      config.siteCode,
      'ZA',
      'ZAR',
      amountInCents,
      reference,
      `Payment ${reference}`,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl,
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
      ...(customer.customerName && { Customer: customer.customerName }),
      ...(customer.customerEmail && { Optional1: customer.customerEmail }),
      ...(customer.phoneNumber && { Optional2: customer.phoneNumber }),
    });

    return {
      success: true,
      data: {
        redirectUrl: `${config.baseUrl}/PostPaymentRequest?${params.toString()}`,
        reference,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to create payment request',
    };
  }
}

function verifyOzowWebhook(body, signature) {
  const { privateKey } = getOzowConfig();

  if (!privateKey || !body || typeof body !== 'object') return false;

  const providedSignature = String(signature || body.HashCheck || '')
    .replace('sha512=', '')
    .trim()
    .toLowerCase();

  if (!providedSignature) return false;

  const data = { ...body };
  delete data.HashCheck;

  const fields = Object.keys(data)
    .sort()
    .map((key) => data[key]);

  const expectedHash = generateHash(fields, privateKey);
  const expectedBuffer = Buffer.from(expectedHash, 'utf8');
  const providedBuffer = Buffer.from(providedSignature, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export const ozowService = {
  isConfigured,
  createPaymentRequest,
  verifyOzowWebhook,
  generateHash,
  getOzowConfig,
};
