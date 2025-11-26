// api/payment/initiate.js
import { connectDB } from '../../lib/db.js';
import { OZOW, generateHash } from '../../lib/ozow.js';
import User from '../../models/User.js';
import { chargeUser } from '../billing/charge.js';
import axios from 'axios';
import crypto from 'crypto';

export default async function handler(req, res) {
  await connectDB();

  const { amount, ref, customerPhone, shapId } = req.body;
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) return res.status(401).json({ error: "API key required" });

  const user = await User.findOne({ apiKey });
  if (!user || user.status !== 'active') {
    return res.status(403).json({ error: "Invalid or inactive account" });
  }

  // Enforce limits
  const limit = user.plan === 'basic' ? 100 : user.plan === 'pro' ? 1000 : Infinity;
  if (user.usage.transactions >= limit) {
    return res.status(429).json({ error: "Limit reached. Upgrade plan." });
  }

  try {
    const transactionRef = `WHATSAPP_${ref}_${Date.now()}`;
    const fields = [OZOW.siteCode, 'ZAR', 'ZAR', amount, transactionRef, ref, false, customerPhone, shapId];
    const hash = generateHash(fields);

    const payload = {
      SiteCode: OZOW.siteCode,
      CountryCode: 'ZAR',
      CurrencyCode: 'ZAR',
      Amount: parseFloat(amount).toFixed(2),
      TransactionReference: transactionRef,
      BankReference: ref,
      Optional1: customerPhone,
      Customer: shapId,
      IsTest: false,
      HashCheck: hash
    };

    const ozowRes = await axios.post('https://api.ozow.com/postpaymentrequest', payload);

    if (ozowRes.data?.url) {
      // Success → increment usage
      await User.updateOne({ apiKey }, { $inc: { 'usage.transactions': 1 } });

      // Charge client if pay-per-use
      if (user.plan === 'payperuse') {
        await chargeUser(user, 700); // R7.00
      }

      res.json({ success: true, redirectUrl: ozowRes.data.url });
    } else {
      res.status(400).json({ error: "Ozow failed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}