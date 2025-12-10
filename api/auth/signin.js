// api/auth/signin.js
import { connectDB } from '../../lib/db.js';
import User from '../../models/User.js';

export default async function handler(req, res) {
  await connectDB();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, apiKey } = req.body || {};

  if (!email || !apiKey) {
    return res.status(400).json({ success: false, message: 'Missing email or apiKey' });
  }

  try {
    const user = await User.findOne({ email: email.trim(), apiKey: apiKey.trim() }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Set a cookie for convenience (HttpOnly). Also return minimal user info.
    const maxAge = 7 * 24 * 60 * 60; // 7 days
    const cookie = `apiKey=${apiKey}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
    res.setHeader('Set-Cookie', cookie);

    return res.json({
      success: true,
      message: 'Signed in',
      user: { businessName: user.businessName, email: user.email, plan: user.plan }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
