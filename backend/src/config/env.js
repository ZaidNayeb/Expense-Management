import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}. See backend/.env.example.`);
  }
  return value;
}

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Environment variable ${name} must be a non-negative integer.`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: integer('PORT', 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  trustProxy: integer('TRUST_PROXY', 0),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: integer('DB_PORT', 5432),
    database: nodeEnv === 'test' ? required('TEST_DB_NAME') : required('DB_NAME'),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
  },
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionMaxAgeMs: integer('SESSION_MAX_AGE_MINUTES', 120) * 60 * 1000,
  loginRateLimitMax: integer('LOGIN_RATE_LIMIT_MAX', 10),
};

// Only the API server needs the session secret; scripts such as migrations do not.
export function assertServerConfig() {
  if (config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters long. See backend/.env.example.');
  }
}
