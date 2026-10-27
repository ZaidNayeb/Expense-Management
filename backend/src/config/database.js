import pg from 'pg';
import { config } from './env.js';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Dates, avoiding timezone shifts.
// NUMERIC columns are already returned as strings, which keeps amounts exact.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool({
  ...config.db,
  max: 10,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // An idle client failed (e.g. the database restarted). The pool replaces it on demand.
  console.error('PostgreSQL pool error:', err.code || err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

// Runs `work(client)` inside a transaction, rolling back if it throws.
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
