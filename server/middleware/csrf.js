export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (!isStateChanging) return next();

  // Webhooks are machine-to-machine and should not use browser CSRF checks.
  if (req.path.startsWith('/api/webhooks') || req.path === '/webhook' || req.path === '/payment/webhook') {
    return next();
  }

  const allowedOrigins = [
    process.env.APP_URL,
    'https://ubuntu-market.onrender.com',
    'http://localhost:3000',
  ].filter(Boolean);

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const source = origin || referer || '';

  // If browser headers are present, enforce allowed origins.
  if (source) {
    const trusted = allowedOrigins.some((allowed) => source.startsWith(allowed));
    if (!trusted) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF source.' });
    }
  }

  return next();
}
