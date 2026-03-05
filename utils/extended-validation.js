// utils/validation.js
import { body, param, query, validationResult } from 'express-validator';

export const validators = {
  // Product validators
  createProduct: [
    body('name')
      .trim()
      .notEmpty().withMessage('Product name is required')
      .isLength({ min: 3, max: 200 }).withMessage('Product name must be 3-200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description must be max 2000 characters'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Category must be max 100 characters'),
    body('stock.quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
    body('stock.lowStockThreshold')
      .optional()
      .isInt({ min: 0 }).withMessage('Low stock threshold must be non-negative'),
  ],

  updateProduct: [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Product name must be 3-200 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('stock.quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock quantity must be non-negative'),
  ],

  deleteProduct: [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
  ],

  // Order validators
  createOrder: [
    body('customerId')
      .notEmpty().withMessage('Customer ID is required')
      .isMongoId().withMessage('Invalid customer ID'),
    body('items')
      .isArray({ min: 1 }).withMessage('Order must include at least one item'),
    body('items.*.productId')
      .isMongoId().withMessage('Invalid product ID'),
    body('items.*.quantity')
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress.name')
      .optional()
      .trim()
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('shippingAddress.phone')
      .optional()
      .trim()
      .isMobilePhone().withMessage('Invalid phone number'),
  ],

  updateOrder: [
    param('id')
      .isMongoId().withMessage('Invalid order ID'),
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],

  // Payment validators
  createPayment: [
    body('orderId')
      .notEmpty().withMessage('Order ID is required')
      .isMongoId().withMessage('Invalid order ID'),
    body('amount')
      .notEmpty().withMessage('Amount is required')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod')
      .notEmpty().withMessage('Payment method is required')
      .isIn(['ozow', 'payshap', 'stripe']).withMessage('Invalid payment method'),
  ],

  // Invoice validators
  getInvoice: [
    param('id')
      .isMongoId().withMessage('Invalid invoice ID'),
  ],

  // Authentication validators
  register: [
    body('email')
      .trim()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('businessName')
      .trim()
      .notEmpty().withMessage('Business name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
    body('whatsappNumber')
      .trim()
      .notEmpty().withMessage('WhatsApp number is required'),
  ],

  login: [
    body('email')
      .trim()
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],

  // Query validators
  paginationQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be at least 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],

  searchQuery: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Search term must be max 200 characters'),
  ],
};

/**
 * Validation error handler middleware
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};

/**
 * Custom validation functions
 */
export const customValidations = {
  /**
   * Validate phone number format
   */
  validatePhoneNumber: (phone) => {
    // Accept various formats: +27123456789, 27123456789, 0123456789, etc.
    const phoneRegex = /^(\+?\d{1,3})?[\s.-]?\d{3,}[\s.-]?\d{3,}[\s.-]?\d{3,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate Cloudinary URL
   */
  validateCloudinaryUrl: (url) => {
    return /^https:\/\/res\.cloudinary\.com\//.test(url);
  },

  /**
   * Validate Ozow reference
   */
  validateOzowReference: (reference) => {
    return reference && reference.length > 0 && reference.length <= 50;
  },

  /**
   * Validate order items
   */
  validateOrderItems: (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    for (const item of items) {
      if (!item.productId || !item.quantity) {
        throw new Error('Each item must have productId and quantity');
      }
      if (item.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }
    }

    return true;
  },

  /**
   * Validate price
   */
  validatePrice: (price) => {
    const parsed = parseFloat(price);
    return !isNaN(parsed) && parsed > 0;
  },

  /**
   * Validate invoice items
   */
  validateInvoiceItems: (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Invoice must contain at least one item');
    }

    for (const item of items) {
      if (!item.description || !item.quantity || !item.unitPrice || !item.total) {
        throw new Error('Each item must have description, quantity, unitPrice, and total');
      }
      if (item.quantity < 1 || item.unitPrice < 0 || item.total < 0) {
        throw new Error('Item values must be positive');
      }
    }

    return true;
  },

  /**
   * Validate currency code
   */
  validateCurrency: (currency) => {
    const validCurrencies = ['ZAR', 'USD', 'EUR', 'GBP', 'ZWL'];
    return validCurrencies.includes(currency.toUpperCase());
  },

  /**
   * Validate order status
   */
  validateOrderStatus: (status) => {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    return validStatuses.includes(status.toLowerCase());
  },

  /**
   * Validate payment status
   */
  validatePaymentStatus: (status) => {
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    return validStatuses.includes(status.toLowerCase());
  },

  /**
   * Validate payment method
   */
  validatePaymentMethod: (method) => {
    const validMethods = ['ozow', 'payshap', 'stripe'];
    return validMethods.includes(method.toLowerCase());
  },
};

/**
 * Sanitization functions
 */
export const sanitize = {
  /**
   * Sanitize phone number
   */
  sanitizePhone: (phone) => {
    return phone.replace(/^\+/, '').replace(/\D/g, '');
  },

  /**
   * Sanitize HTML content
   */
  sanitizeHtml: (content) => {
    if (!content) return '';
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Sanitize number
   */
  sanitizeNumber: (num) => {
    const parsed = parseFloat(num);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  },

  /**
   * Sanitize string
   */
  sanitizeString: (str) => {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ').substring(0, 1000);
  },
};

export default {
  validators,
  handleValidationErrors,
  customValidations,
  sanitize,
};
