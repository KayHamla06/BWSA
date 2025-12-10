



import axios from 'axios';
import crypto from 'crypto';

const OZOW_API_URL = 'https://api.ozow.com';
const OZOW_API_KEY = process.env.OZOW_API_KEY;
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY;

function generateSignature(data) {
  return crypto
    .createHmac('sha512', OZOW_PRIVATE_KEY)
    .update(JSON.stringify(data))
    .digest('hex');
}

export async function createPaymentRequest(amount, reference, successUrl, failUrl, cancelUrl, metadata = {}) {
  try {
    const payload = {
      amount: Math.round(amount * 100), // Convert to cents
      reference: reference,
      currency: 'ZAR',
      successUrl: successUrl,
      failUrl: failUrl,
      cancelUrl: cancelUrl,
      customerFirstName: metadata.customerName || 'Customer',
      customerEmail: metadata.customerEmail || '',
      customerPhone: metadata.phoneNumber || '',
      isTest: process.env.NODE_ENV === 'development',
    };

    const signature = generateSignature(payload);

    const response = await axios.post(`${OZOW_API_URL}/payments/create`, payload, {
      headers: {
        Authorization: `Bearer ${OZOW_API_KEY}`,
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Ozow API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

export async function getPaymentStatus(transactionId) {
  try {
    const response = await axios.get(`${OZOW_API_URL}/payments/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${OZOW_API_KEY}`,
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Ozow API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

export function verifyOzowWebhook(payload, signature) {
  const expectedSignature = generateSignature(payload);
  return signature === expectedSignature;
}