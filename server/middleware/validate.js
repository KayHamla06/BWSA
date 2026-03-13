export function validateProduct(req, res, next) {
  const { name, price } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('Product name must be at least 2 characters');
  if (price === undefined || isNaN(price) || Number(price) <= 0) errors.push('Price must be a positive number');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
}

export function validateRegistration(req, res, next) {
  const { email, password, businessName, name } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  const resolvedName = businessName || name;
  if (!resolvedName || resolvedName.trim().length < 2) errors.push('Business name is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
}

export function validatePaymentLink(req, res, next) {
  const { customerName, customerPhone, amount } = req.body;
  const errors = [];

  if (!customerName || customerName.trim().length < 2) errors.push('Customer name is required');
  if (!customerPhone) errors.push('Customer phone number is required');
  if (!amount || isNaN(amount) || Number(amount) <= 0) errors.push('Valid amount is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
}
