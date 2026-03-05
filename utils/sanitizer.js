// utils/sanitizer.js
import mongoSanitize from 'express-mongo-sanitize';

// Remove any keys that start with '$' or contain '.'
export function sanitizeInput(input) {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(input)) {
    // Skip keys with $ or .
    if (key.includes('$') || key.includes('.')) {
      continue;
    }
    sanitized[key] = sanitizeInput(value);
  }

  return sanitized;
}

// Express middleware
export const sanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request`);
  },
});

// Sanitize phone numbers (remove non-digits)
export function sanitizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

// Sanitize email
export function sanitizeEmail(email) {
  if (!email) return '';
  return email.toLowerCase().trim();
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
