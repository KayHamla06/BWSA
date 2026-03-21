const required = ['MONGODB_URI', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'PAYFAST_PASSPHRASE'];

export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function getEnv(key, fallback = '') {
  return process.env[key] || fallback;
}
