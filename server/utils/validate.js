// utils/validate.js

export function validateIdentifier(input) {
  if (!input || typeof input !== 'string') return null;

  const clean = input.trim().toLowerCase();

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(clean)) {
    return { cleanIdentifier: clean, type: 'email' };
  }

  // Phone regex (allows optional +, numbers, dashes, spaces; 7-15 digits)
  const phoneDigits = clean.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  
  if (phoneRegex.test(phoneDigits)) {
    return { cleanIdentifier: phoneDigits, type: 'phone' };
  }

  return null; // Invalid input
}