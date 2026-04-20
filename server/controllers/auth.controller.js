import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';
import { ApiError } from '../errors/ApiError.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { createDefaultSubscription } from '../services/subscription.service.js';

export async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword, businessName, whatsappNumber, phone, plan } = req.body;

    const resolvedName = name || businessName || '';
    const resolvedPhone = whatsappNumber || phone || '';

    if (!resolvedName) {
      throw ApiError.badRequest('Name is required');
    }
    if (!resolvedPhone) {
      throw ApiError.badRequest('Phone number is required');
    }
    if (!password || password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters');
    }
    if (password !== confirmPassword) {
      throw ApiError.badRequest('Passwords do not match');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    // In local/dev testing, keep PIN predictable for QA.
    const pin = isProduction ? crypto.randomInt(100000, 999999).toString() : '123456';

    const user = await User.create({
      name: resolvedName,
      email: email.toLowerCase(),
      password,
      businessName: businessName || resolvedName,
      whatsappNumber: resolvedPhone,
      plan: plan || 'free',
      verificationPin: pin,
      verificationPinExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send WhatsApp PIN only in production.
    if (isProduction) {
      await whatsappService.sendTextMessage(
        resolvedPhone,
        `Ubuntu Market Verification Code: ${pin}. Enter this code on the website to verify your account.`
      );
    }
    const resolvedPlanKey = ['payg','starter','business','pro'].includes(plan) ? plan : 'payg';
    await createDefaultSubscription(user._id, resolvedPlanKey);
    const token = generateAccessToken({ userId: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user._id });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      refreshToken,
      requiresVerification: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        plan: user.plan,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPin(req, res, next) {
  try {
    const { pin } = req.body;
    if (!pin) throw ApiError.badRequest('Verification PIN is required');

    const user = await User.findById(req.user.userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.isVerified) {
      return res.json({ success: true, status: 'VERIFIED', message: 'Account already verified' });
    }

    if (!user.verificationPin || !user.verificationPinExpires) {
      throw ApiError.badRequest('No verification PIN found. Please request a new one.');
    }

    if (new Date() > user.verificationPinExpires) {
      throw ApiError.badRequest('Verification PIN has expired. Please request a new one.');
    }

    if (user.verificationPin !== pin) {
      throw ApiError.badRequest('Invalid verification PIN. Please try again.');
    }

    user.isVerified = true;
    user.verificationPin = null;
    user.verificationPinExpires = null;
    await user.save();

    res.json({ success: true, status: 'VERIFIED', message: 'Account verified successfully' });
  } catch (error) {
    next(error);
  }
}

export async function resendPin(req, res, next) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const user = await User.findById(req.user.userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.isVerified) {
      return res.json({ success: true, message: 'Account already verified' });
    }

    const pin = isProduction ? crypto.randomInt(100000, 999999).toString() : '123456';
    user.verificationPin = pin;
    user.verificationPinExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    if (isProduction) {
      await whatsappService.sendTextMessage(
        user.whatsappNumber,
        `Ubuntu Market Verification Code: ${pin}. Enter this code on the website to verify your account.`
      );
    }

    res.json({ success: true, message: 'Verification PIN sent to your WhatsApp' });
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
        isVerified: user.isVerified,
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
