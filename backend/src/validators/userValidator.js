import { validationError } from '../errors.js';

// Deliberately simple: one "@", no spaces, a dot in the domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ROLES = ['admin', 'user'];
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password.
export const PASSWORD_MAX_BYTES = 72;

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateEmail(email) {
  if (!email) return 'Email is required.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Please enter a valid email address.';
  return null;
}

export function validatePassword(password) {
  if (typeof password !== 'string' || !password) return 'Password is required.';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Password must be at most ${PASSWORD_MAX_BYTES} bytes.`;
  }
  return null;
}

export function validateName(name) {
  if (!name) return 'Name is required.';
  if (name.length > 100) return 'Name must be 100 characters or fewer.';
  return null;
}

export function validateNewUser(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const nameError = validateName(name);
  if (nameError) errors.name = nameError;

  const email = normalizeEmail(input.email);
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;

  const role = input.role === undefined || input.role === '' ? 'user' : input.role;
  if (!ROLES.includes(role)) errors.role = 'Role must be admin or user.';

  if (Object.keys(errors).length) throw validationError(errors);
  return { name, email, password: input.password, role };
}

export function validateLogin(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const email = normalizeEmail(input.email);
  if (!email) errors.email = 'Email is required.';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!password) errors.password = 'Password is required.';
  if (Object.keys(errors).length) throw validationError(errors);
  return { email, password };
}
