export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password.length >= 8;
}

export function validatePhoneNumber(phone) {
  const re = /^[\d\s\-\+\(\)]{10,}$/;
  return re.test(phone);
}

export function validateApiKey(apiKey) {
  return apiKey && apiKey.length > 0;
}

export function sanitizeInput(input) {
  return input ? String(input).trim() : '';
}

export function validateBusinessName(name) {
  return name && name.trim().length >= 2;
}

export function validateAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}