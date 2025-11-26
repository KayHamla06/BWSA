// api/billing/signup.js
import { connectDB } from '../../lib/db.js';
import User from '../../models/User.js';
import { chargeUser } from './charge.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  await connectDB();

  const { businessName, email, shapId, plan = 'payperuse' } = req.body;

  const apiKey = crypto.randomUUID();

  const user = await User.create({
    businessName,
    email,
    shapId,
    apiKey,
    plan,
    status: 'pending',
    usage: { transactions: 0 }
  });

  // First bill
  if (plan === 'basic') await chargeUser(user, 9900);
  if (plan === 'pro') await chargeUser(user, 29900);

  res.json({
    success: true,
    apiKey,
    message: "Check your bank app to approve. Your API is ready!"
  });
}