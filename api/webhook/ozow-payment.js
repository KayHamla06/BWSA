// api/webhook/ozow-payment.js
import { sendWhatsappConfirmation } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  const payload = req.body;
  const customerPhone = payload.Optional1; // we stored WhatsApp number here
  const amount = payload.Amount;
  const ref = payload.BankReference;

  if (payload.Status === 'Complete') {
    await sendWhatsappConfirmation(customerPhone, amount, ref);
  }

  res.status(200).send('OK');
}