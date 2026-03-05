import axios from 'axios';

function getWhatsAppConfig() {
  return {
    phoneId: process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_API_TOKEN,
    version: process.env.WHATSAPP_API_VERSION || 'v20.0',
  };
}

function isConfigured() {
  const { phoneId, token } = getWhatsAppConfig();
  return Boolean(phoneId && token);
}

async function sendTextMessage(toPhone, body) {
  const config = getWhatsAppConfig();

  if (!isConfigured()) {
    return {
      success: false,
      skipped: true,
      message: 'WhatsApp integration not configured. Add WHATSAPP_PHONE_ID and WHATSAPP_TOKEN.',
    };
  }

  const to = String(toPhone || '').replace(/^\+/, '');

  await axios.post(
    `https://graph.facebook.com/${config.version}/${config.phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { success: true };
}

async function sendPaymentLink(toPhone, paymentLink, customerName = 'Customer') {
  try {
    return await sendTextMessage(
      toPhone,
      `Hi ${customerName}, here is your payment link:\n${paymentLink}\n\nPlease complete your payment securely.`
    );
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to send payment link',
    };
  }
}

async function sendPaymentConfirmation(toPhone, amount, reference) {
  try {
    return await sendTextMessage(
      toPhone,
      `✅ Payment successful!\nAmount: R${amount}\nReference: ${reference}\n\nThank you for your payment.`
    );
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to send confirmation',
    };
  }
}

export const whatsappService = {
  isConfigured,
  sendTextMessage,
  sendPaymentLink,
  sendInvoice: sendPaymentLink, // alias for compatibility
  sendPaymentConfirmation,
  getWhatsAppConfig,
};
