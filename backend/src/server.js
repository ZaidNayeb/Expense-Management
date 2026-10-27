import { assertServerConfig, config } from './config/env.js';
import { pool } from './config/database.js';
import { createApp } from './app.js';

async function start() {
  assertServerConfig();

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error(
      `Cannot connect to PostgreSQL at ${config.db.host}:${config.db.port}/${config.db.database} (${err.code || err.message}).`,
      'Check the DB_* settings in backend/.env and that PostgreSQL is running.',
    );
    process.exit(1);
  }

  const server = createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
