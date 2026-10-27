import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './database.js';
import { config } from './env.js';

export const SESSION_COOKIE_NAME = 'expensepro.sid';

const PgSession = connectPgSimple(session);

export function createSessionMiddleware() {
  return session({
    name: SESSION_COOKIE_NAME,
    store: new PgSession({
      pool,
      tableName: 'user_sessions', // created by migrations/001_initial_schema.sql
      pruneSessionInterval: config.nodeEnv === 'test' ? false : 15 * 60,
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // idle timeout: each request extends the session
    cookie: {
      httpOnly: true,
      // The frontend is served from the same site (Vite proxy in development, Express in
      // production), so Lax works and blocks the cookie on cross-site subrequests.
      sameSite: 'lax',
      secure: config.isProduction,
      maxAge: config.sessionMaxAgeMs,
    },
  });
}
