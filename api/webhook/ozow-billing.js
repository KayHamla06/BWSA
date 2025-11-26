// api/webhook/ozow-billing.js
import { connectDB } from '../../lib/db.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  await connectDB();
  const payload = req.body;
  const userId = payload.Optional1;

  if (payload.Status === 'Complete' && userId) {
    await User.updateOne({ _id: userId }, { status: 'active' });
    console.log(`User ${userId} activated after billing`);
  }

  res.status(200).send('OK');
}