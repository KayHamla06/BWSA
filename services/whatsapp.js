import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_API_TOKEN;

export async function sendWhatsAppMessage(phoneNumber, message, mediaUrl = null) {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber.replace(/\D/g, ''),
      type: mediaUrl ? 'document' : 'text',
    };

    if (mediaUrl) {
      payload.document = { link: mediaUrl };
    } else {
      payload.text = { body: message };
    }

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    return { success: true, messageId: response.data.messages[0].id };
  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.error?.message || error.message };
  }
}

export async function sendPaymentLink(phoneNumber, paymentLink, customerName) {
  const message = `Hi ${customerName},\n\nYou have a payment request. Please click the link below to complete your payment:\n\n${paymentLink}\n\nThank you!`;
  return sendWhatsAppMessage(phoneNumber, message);
}

export async function sendPaymentConfirmation(phoneNumber, amount, transactionId) {
  const message = `Thank you for your payment!\n\nAmount: R${amount}\nTransaction ID: ${transactionId}\n\nYour payment has been confirmed.`;
  return sendWhatsAppMessage(phoneNumber, message);
}