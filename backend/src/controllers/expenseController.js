import * as expenses from '../services/expenseService.js';
import {
  paginated,
  parseDateRange,
  parseId,
  parseOptionalInt,
  parsePagination,
  parseSearch,
} from '../validators/common.js';
import { validateExpense, validateOwnerId } from '../validators/expenseValidator.js';

const isAdmin = (req) => req.user.role === 'admin';

export async function list(req, res) {
  const pagination = parsePagination(req.query);
  const filters = {
    search: parseSearch(req.query.search),
    ...parseDateRange(req.query),
    // userId is an admin-only filter; for regular users the service scopes by session anyway.
    userId: isAdmin(req) ? parseOptionalInt(req.query.userId, 'userId') : undefined,
  };
  const { rows, total } = await expenses.listExpenses(req.user, filters, pagination);
  res.json(paginated(rows, total, pagination));
}

export async function get(req, res) {
  const expense = await expenses.getExpense(req.user, parseId(req.params.id, 'Expense'));
  res.json({ data: expense });
}

export async function create(req, res) {
  const input = validateExpense(req.body);
  // A userId sent by a regular user is ignored: the owner comes from the session.
  const ownerId = isAdmin(req) ? validateOwnerId(req.body?.userId) : undefined;
  const expense = await expenses.createExpense(req.user, input, ownerId);
  res.status(201).json({ data: expense });
}

export async function update(req, res) {
  const id = parseId(req.params.id, 'Expense');
  const input = validateExpense(req.body);
  const ownerId = isAdmin(req) ? validateOwnerId(req.body?.userId) : undefined;
  const expense = await expenses.updateExpense(req.user, id, input, ownerId);
  res.json({ data: expense });
}

export async function remove(req, res) {
  await expenses.deleteExpense(req.user, parseId(req.params.id, 'Expense'));
  res.status(204).end();
}
