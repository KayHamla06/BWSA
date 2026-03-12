import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;

export function assertJwtConfiguration() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (!REFRESH_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
  }

  if (JWT_SECRET === REFRESH_SECRET) {
    throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET must be different values');
  }
}

assertJwtConfiguration();

// Generate access token (short-lived)
export function generateAccessToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Generate refresh token (long-lived)
export function generateRefreshToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn });
}

// Legacy function for backward compatibility
export function generateToken(payload, expiresIn = '7d') {
  return generateAccessToken(payload, expiresIn);
}

// Verify access token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// Decode token without verification
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

// Create and store refresh token in database
export async function createRefreshToken(userId, deviceInfo = {}) {
  const payload = { userId, tokenId: crypto.randomUUID() };
  const token = generateRefreshToken(payload, '7d');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    userId,
    token,
    expiresAt,
    deviceInfo,
  });

  return token;
}

// Revoke refresh token
export async function revokeRefreshToken(token) {
  await RefreshToken.updateOne({ token }, { isRevoked: true });
}

// Revoke all user's refresh tokens (logout from all devices)
export async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
}

// Validate refresh token from database
export async function validateRefreshToken(token) {
  const payload = verifyRefreshToken(token);
  if (!payload) return null;

  const dbToken = await RefreshToken.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!dbToken) return null;

  return payload;
}
