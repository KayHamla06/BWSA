// lib/ozow.js
import crypto from 'crypto';

export const OZOW = {
  siteCode: process.env.OZOW_SITE_CODE,
  privateKey: process.env.OZOW_PRIVATE_KEY,
};

export function generateHash(fields) {
  const str = fields.join('').toLowerCase();
  return crypto.createHash('sha512').update(str + OZOW.privateKey).digest('hex');
}