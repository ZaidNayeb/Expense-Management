import { isValidDate } from './common.js';
import { validationError } from '../errors.js';

// Up to 10 integer digits and 2 decimals, matching NUMERIC(12,2).
const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

// Validates the three business fields. Returns normalized values or throws 422.
export function validateExpense(body) {
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) errors.name = 'Expense name is required.';
  else if (name.length > 100) errors.name = 'Expense name must be 100 characters or fewer.';

  let amount = input.amount;
  if (typeof amount === 'number' && Number.isFinite(amount)) amount = String(amount);
  amount = typeof amount === 'string' ? amount.trim() : '';
  if (!amount) errors.amount = 'Amount is required.';
  else if (!AMOUNT_PATTERN.test(amount)) {
    errors.amount = 'Amount must be a positive number with at most two decimal places.';
  } else if (Number(amount) <= 0) errors.amount = 'Amount must be greater than zero.';

  const date = typeof input.date === 'string' ? input.date.trim() : '';
  if (!date) errors.date = 'Date is required.';
  else if (!isValidDate(date)) errors.date = 'Please enter a valid date.';

  if (Object.keys(errors).length) throw validationError(errors);
  return { name, amount, date };
}

// Admin-only optional owner id. Returns undefined when not supplied.
export function validateOwnerId(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw validationError({ userId: 'Please select a valid user.' });
  }
  return id;
}
