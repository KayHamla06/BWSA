import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';

export async function register(req, res, next) {
  try {
    const { name, email, password, businessName, whatsappNumber, phone, plan } = req.body;

    const resolvedName = name || businessName || '';
    const resolvedPhone = whatsappNumber || phone || '';

    if (!resolvedName) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!resolvedPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name: resolvedName,
      email: email.toLowerCase(),
      password,
      businessName: businessName || resolvedName,
      whatsappNumber: resolvedPhone,
      plan: plan || 'free',
    });

    const token = generateAccessToken({ userId: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user._id });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateAccessToken({ userId: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user._id });

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}
