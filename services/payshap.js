import axios from 'axios';

const PAYSHAP_API_URL = 'https://api.payshap.io';
const PAYSHAP_API_KEY = process.env.PAYSHAP_API_KEY;

export async function createPaymentLink(amount, customerId, description = '', metadata = {}) {
  try {
    const payload = {
      amount: amount,
      customer_id: customerId,
      description: description,
      currency: 'ZAR',
      metadata: metadata,
    };

    const response = await axios.post(`${PAYSHAP_API_URL}/payments/links`, payload, {
      headers: {
        Authorization: `Bearer ${PAYSHAP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('PayShap API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

export async function getPaymentStatus(paymentId) {
  try {
    const response = await axios.get(`${PAYSHAP_API_URL}/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${PAYSHAP_API_KEY}`,
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('PayShap API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

export async function listPayments(customerId) {
  try {
    const response = await axios.get(`${PAYSHAP_API_URL}/payments`, {
      params: { customer_id: customerId },
      headers: {
        Authorization: `Bearer ${PAYSHAP_API_KEY}`,
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('PayShap API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}
