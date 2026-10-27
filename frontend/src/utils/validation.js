// Client-side checks mirror the server rules for faster feedback.
// The server validates everything again; these are never relied on for security.

const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return y >= 1900 && y <= 2999 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function validateExpenseForm({ name, amount, date, userId }, { requireOwner = false } = {}) {
  const errors = {};
  const trimmedName = name.trim();
  if (!trimmedName) errors.name = 'Expense name is required.';
  else if (trimmedName.length > 100) errors.name = 'Expense name must be 100 characters or fewer.';

  const trimmedAmount = amount.trim();
  if (!trimmedAmount) errors.amount = 'Amount is required.';
  else if (!AMOUNT_PATTERN.test(trimmedAmount)) {
    errors.amount = 'Enter a positive amount with at most two decimal places.';
  } else if (Number(trimmedAmount) <= 0) errors.amount = 'Amount must be greater than zero.';

  if (!date) errors.date = 'Date is required.';
  else if (!isValidDate(date)) errors.date = 'Please enter a valid date.';

  if (requireOwner && !userId) errors.userId = 'Please select who this expense belongs to.';
  return errors;
}

export function validateUserForm({ name, email, password, role }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required.';
  else if (name.trim().length > 100) errors.name = 'Name must be 100 characters or fewer.';
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Initial password is required.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  else if (new TextEncoder().encode(password).length > 72) errors.password = 'Password is too long.';
  if (!['admin', 'user'].includes(role)) errors.role = 'Please choose a role.';
  return errors;
}

export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}
