export function validateProduct(req, res, next) {
  const { name, price, stock } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('Product name must be at least 2 characters');
  if (price === undefined || isNaN(price) || Number(price) <= 0) errors.push('Price must be a positive number');
  if (stock !== undefined && (isNaN(stock) || Number(stock) < 0)) errors.push('Stock must be zero or a positive number');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
}

export function validateRegistration(req, res, next) {
  const { email, password, confirmPassword, businessName, name } = req.body;
  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (password !== confirmPassword) errors.push('Passwords do not match');
  const resolvedName = businessName || name;
  if (!resolvedName || resolvedName.trim().length < 2) errors.push('Business name is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, type: 'VALIDATION', message: errors.join(', ') });
  }
  next();
}

export function validatePaymentLink(req, res, next) {
  const { customerName, customerPhone, amount, productId } = req.body;
  const errors = [];

  if (!customerName || customerName.trim().length < 2) errors.push('Customer name is required');
  if (!customerPhone) errors.push('Customer phone number is required');
  if (!productId && (!amount || isNaN(amount) || Number(amount) <= 0)) errors.push('Valid amount is required');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  next();
}

export function validateWithdrawalRequest(req, res, next) {
  const { amount, payoutMethod, disclaimerAccepted } = req.body;
  const errors = [];

  if (!amount || isNaN(amount) || Number(amount) <= 0) errors.push('Valid withdrawal amount is required');
  if (!payoutMethod) errors.push('Payout method is required');
  if (payoutMethod === 'immediate' && !disclaimerAccepted) {
    errors.push('Immediate payment requires accepting the warning');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }

  next();
}
