import crypto from 'crypto';

function resolveEncryptionKey() {
  const configured = process.env.BANK_ENCRYPTION_KEY || process.env.JWT_SECRET || 'ubuntu-market-default-key';
  return crypto.createHash('sha256').update(String(configured)).digest();
}

export function encryptSensitive(value) {
  const plainText = String(value || '').trim();
  if (!plainText) return '';

  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSensitive(value) {
  const payload = String(value || '').trim();
  if (!payload) return '';

  // Backward compatibility for legacy plain-text fields.
  if (!payload.includes(':')) return payload;

  const parts = payload.split(':');
  if (parts.length !== 3) return payload;

  try {
    const key = resolveEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return '';
  }
}

export function maskSensitive(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 4) return '*'.repeat(text.length);
  return `${'*'.repeat(text.length - 4)}${text.slice(-4)}`;
}