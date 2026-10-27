import { query } from '../config/database.js';

// Admins see figures across all users; everyone else sees only their own.
// $1 is the owner id, or NULL for "all users".
const scopeOf = (actor) => (actor.role === 'admin' ? null : actor.id);

export async function getSummary(actor) {
  const ownerId = scopeOf(actor);
  const { rows } = await query(
    `SELECT count(*)::int AS "expenseCount",
            COALESCE(sum(amount), 0)::numeric(14,2) AS "totalAmount",
            COALESCE(round(avg(amount), 2), 0)::numeric(14,2) AS "averageAmount"
     FROM expenses
     WHERE ($1::int IS NULL OR user_id = $1)`,
    [ownerId],
  );
  const summary = rows[0];
  if (ownerId === null) {
    const users = await query('SELECT count(*)::int AS total FROM users');
    summary.userCount = users.rows[0].total;
  }
  return summary;
}

export async function getRecentExpenses(actor, limit = 5) {
  const { rows } = await query(
    `SELECT e.id, e.name, e.amount, e.date, e.user_id AS "userId", u.name AS "ownerName",
            e.created_at AS "createdAt", e.updated_at AS "updatedAt"
     FROM expenses e JOIN users u ON u.id = e.user_id
     WHERE ($1::int IS NULL OR e.user_id = $1)
     ORDER BY e.date DESC, e.id DESC
     LIMIT $2`,
    [scopeOf(actor), limit],
  );
  return rows;
}

// Daily buckets for ranges up to ~3 months, monthly buckets beyond that.
const DAILY_LIMIT_DAYS = 93;

export function daysBetween(startDate, endDate) {
  return Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
}

// Returns one point per day or month in the range, including empty periods (total 0).
export async function getSpendingTrend(actor, startDate, endDate) {
  const granularity = daysBetween(startDate, endDate) <= DAILY_LIMIT_DAYS ? 'day' : 'month';
  const { rows } = await query(
    `SELECT to_char(p.period, 'YYYY-MM-DD') AS period,
            COALESCE(sum(e.amount), 0)::numeric(14,2) AS total
     FROM generate_series(
            date_trunc($4, $2::date::timestamp), date_trunc($4, $3::date::timestamp), ('1 ' || $4)::interval
          ) AS p(period)
     LEFT JOIN expenses e
       ON date_trunc($4, e.date::timestamp) = p.period
      AND e.date BETWEEN $2::date AND $3::date
      AND ($1::int IS NULL OR e.user_id = $1)
     GROUP BY p.period
     ORDER BY p.period`,
    [scopeOf(actor), startDate, endDate, granularity],
  );
  return { granularity, startDate, endDate, points: rows };
}
