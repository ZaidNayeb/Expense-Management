import { query, withTransaction } from '../config/database.js';
import { HttpError, notFound } from '../errors.js';
import { likePattern } from '../validators/common.js';
import { hashPassword } from './passwordService.js';

// Columns that are safe to return to clients. password_hash is never included.
const PUBLIC_COLUMNS = 'id, name, email, role, created_at AS "createdAt"';

export async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

// Only used by login; the hash never leaves the auth controller.
export async function findByEmailWithHash(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] || null;
}

export async function listUsers({ search, limit, offset }) {
  const params = [];
  let where = '';
  if (search) {
    params.push(likePattern(search));
    where = 'WHERE name ILIKE $1 OR email ILIKE $1';
  }
  const countResult = await query(`SELECT count(*)::int AS total FROM users ${where}`, params);
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS} FROM users ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  return { rows, total: countResult.rows[0].total };
}

export async function createUser({ name, email, password, role }, db = { query }) {
  const passwordHash = await hashPassword(password);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_COLUMNS}`,
      [name, email, passwordHash, role],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.', {
        email: 'An account with this email already exists.',
      });
    }
    throw err;
  }
}

export async function countAdmins() {
  const { rows } = await query("SELECT count(*)::int AS total FROM users WHERE role = 'admin'");
  return rows[0].total;
}

// Deletes a user, their expenses and their sessions in one transaction.
export async function deleteUser(targetId, actingUserId) {
  if (targetId === actingUserId) {
    throw new HttpError(409, 'You cannot delete your own account while signed in.');
  }
  return withTransaction(async (client) => {
    // Lock all admin rows so two concurrent deletions cannot remove the last admin.
    const admins = await client.query("SELECT id FROM users WHERE role = 'admin' FOR UPDATE");
    const target = await client.query('SELECT id, role FROM users WHERE id = $1 FOR UPDATE', [targetId]);
    if (!target.rows[0]) throw notFound('User');

    if (target.rows[0].role === 'admin' && admins.rows.length <= 1) {
      throw new HttpError(409, 'The last administrator account cannot be deleted.');
    }

    const expenses = await client.query('DELETE FROM expenses WHERE user_id = $1', [targetId]);
    await client.query("DELETE FROM user_sessions WHERE sess->>'userId' = $1", [String(targetId)]);
    await client.query('DELETE FROM users WHERE id = $1', [targetId]);
    return { deletedExpenses: expenses.rowCount };
  });
}
