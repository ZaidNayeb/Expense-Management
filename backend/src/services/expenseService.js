import { query } from '../config/database.js';
import { notFound, validationError } from '../errors.js';
import { likePattern } from '../validators/common.js';

const SELECT_EXPENSE = `
  SELECT e.id, e.name, e.amount, e.date, e.user_id AS "userId", u.name AS "ownerName",
         e.created_at AS "createdAt", e.updated_at AS "updatedAt"
  FROM expenses e
  JOIN users u ON u.id = e.user_id`;

const isAdmin = (actor) => actor.role === 'admin';

// Builds the WHERE clause shared by the list and count queries.
// Regular users are always restricted to their own rows, whatever they send.
function buildFilters(actor, { search, startDate, endDate, userId }) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };

  if (!isAdmin(actor)) add('e.user_id = ?', actor.id);
  else if (userId) add('e.user_id = ?', userId);
  if (search) add("e.name ILIKE ? ESCAPE '\\'", likePattern(search));
  if (startDate) add('e.date >= ?', startDate);
  if (endDate) add('e.date <= ?', endDate);

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function listExpenses(actor, filters, { limit, offset }) {
  const { where, params } = buildFilters(actor, filters);
  const countResult = await query(`SELECT count(*)::int AS total FROM expenses e ${where}`, params);
  const { rows } = await query(
    `${SELECT_EXPENSE} ${where}
     ORDER BY e.date DESC, e.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows, total: countResult.rows[0].total };
}

// Returns the expense only if the actor may access it; otherwise 404 (existence is not revealed).
export async function getExpense(actor, id) {
  const params = [id];
  let sql = `${SELECT_EXPENSE} WHERE e.id = $1`;
  if (!isAdmin(actor)) {
    params.push(actor.id);
    sql += ' AND e.user_id = $2';
  }
  const { rows } = await query(sql, params);
  if (!rows[0]) throw notFound('Expense');
  return rows[0];
}

async function assertUserExists(userId) {
  const { rows } = await query('SELECT 1 FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw validationError({ userId: 'The selected user does not exist.' });
}

// ownerId is only honoured for admins; regular users always own what they create.
async function resolveOwner(actor, ownerId, fallback) {
  if (!isAdmin(actor)) return actor.id;
  if (ownerId === undefined) return fallback;
  await assertUserExists(ownerId);
  return ownerId;
}

export async function createExpense(actor, { name, amount, date }, ownerId) {
  const userId = await resolveOwner(actor, ownerId, actor.id);
  const { rows } = await query(
    'INSERT INTO expenses (name, amount, date, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, amount, date, userId],
  );
  return getExpense(actor, rows[0].id);
}

export async function updateExpense(actor, id, { name, amount, date }, ownerId) {
  const existing = await getExpense(actor, id);
  const userId = await resolveOwner(actor, ownerId, existing.userId);
  const params = [name, amount, date, userId, id];
  let sql = 'UPDATE expenses SET name = $1, amount = $2, date = $3, user_id = $4 WHERE id = $5';
  if (!isAdmin(actor)) {
    params.push(actor.id);
    sql += ' AND user_id = $6';
  }
  const result = await query(sql, params);
  if (result.rowCount === 0) throw notFound('Expense'); // deleted in the meantime
  return getExpense(actor, id);
}

export async function deleteExpense(actor, id) {
  const params = [id];
  let sql = 'DELETE FROM expenses WHERE id = $1';
  if (!isAdmin(actor)) {
    params.push(actor.id);
    sql += ' AND user_id = $2';
  }
  const result = await query(sql, params);
  if (result.rowCount === 0) throw notFound('Expense');
}
