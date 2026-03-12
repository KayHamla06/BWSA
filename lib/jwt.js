import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

let _jwtSecret;
let _refreshSecret;
let _asserted = false;

function getSecrets() {
  if (!_asserted) {
    _jwtSecret = process.env.JWT_SECRET;
    _refreshSecret = process.env.REFRESH_TOKEN_SECRET;
  }
  return { jwtSecret: _jwtSecret, refreshSecret: _refreshSecret };
}

export function assertJwtConfiguration() {
  const { jwtSecret, refreshSecret } = getSecrets();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (!refreshSecret) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
  }

  if (jwtSecret === refreshSecret) {
    throw new Error('JWT_SECRET and REFRESH_TOKEN_SECRET must be different values');
  }

  _asserted = true;
}

// Generate access token (short-lived)
export function generateAccessToken(payload, expiresIn = '15m') {
  const { jwtSecret } = getSecrets();
  return jwt.sign(payload, jwtSecret, { expiresIn });
}

// Generate refresh token (long-lived)
export function generateRefreshToken(payload, expiresIn = '7d') {
  const { refreshSecret } = getSecrets();
  return jwt.sign(payload, refreshSecret, { expiresIn });
}

// Legacy function for backward compatibility
export function generateToken(payload, expiresIn = '7d') {
  return generateAccessToken(payload, expiresIn);
}

// Verify access token
export function verifyToken(token) {
  try {
    const { jwtSecret } = getSecrets();
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    const { refreshSecret } = getSecrets();
    return jwt.verify(token, refreshSecret);
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
