// lib/whatsapp.js
import axios from 'axios';

export async function sendWhatsappConfirmation(toPhone, amount, ref) {
  const payload = {
    messaging_product: "whatsapp",
    to: toPhone.replace(/^\+/, ''),
    type: "text",
    text: { body: `Payment successful!\n\nAmount: R${amount}\nReference: ${ref}\n\nThank you!` }
  };

  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }}
    );
  } catch (err) {
    console.error('WhatsApp send failed:', err.response?.data || err.message);
  }
}