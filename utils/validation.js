// utils/validation.js
import { body, param, query, validationResult } from 'express-validator';

// Validation middleware executor
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Common validation rules
export const validateEmail = () =>
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address');

export const validatePassword = () =>
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number');

export const validatePhone = () =>
  body('whatsappNumber')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format');

export const validateMongoId = (field = 'id') =>
  param(field)
    .isMongoId()
    .withMessage('Invalid ID format');

export const validateAmount = () =>
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0');

export const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// User registration validation
export const validateRegistration = () => [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  validateEmail(),
  validatePassword(),
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Business name is required'),
  validatePhone(),
];

// Product validation
export const validateProduct = () => [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be 0 or greater'),
  body('stock.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be 0 or greater'),
];

// Order validation
export const validateOrder = () => [
  body('customerId')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

// Payment validation
export const validatePayment = () => [
  body('customerId')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  validateAmount(),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
];
