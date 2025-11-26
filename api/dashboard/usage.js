// api/dashboard/usage.js
import { connectDB } from '../../lib/db.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  await connectDB();
  const apiKey = req.headers['x-api-key'];

  const user = await User.findOne({ apiKey });
  if (!user) return res.status(403).json({ error: 'Invalid API key' });

  res.json({
    businessName: user.businessName,
    plan: user.plan,
    status: user.status,
    usage: user.usage.transactions,
    limit: user.plan === 'basic' ? 100 : user.plan === 'pro' ? 1000 : 'Unlimited'
  });
}