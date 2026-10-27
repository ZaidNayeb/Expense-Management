// Test setup: runs against a real PostgreSQL database named by TEST_DB_NAME,
// which must end in "_test" because every table is emptied before each test file.
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET ||= 'test-session-secret-that-is-long-enough-1234567890';
process.env.LOGIN_RATE_LIMIT_MAX = '5';

const { config } = await import('../src/config/env.js');
if (!config.db.database.endsWith('_test')) {
  throw new Error(`Refusing to run tests: TEST_DB_NAME "${config.db.database}" must end in "_test".`);
}

const { pool } = await import('../src/config/database.js');
const { migrate } = await import('../scripts/migrate.js');
const { createApp } = await import('../src/app.js');
const { createUser } = await import('../src/services/userService.js');

export { pool, createUser };

export async function resetDatabase() {
  await migrate({ log: () => {} });
  await pool.query('TRUNCATE expenses, users, user_sessions RESTART IDENTITY CASCADE');
}

export async function startServer() {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl, close: () => new Promise((resolve) => server.close(resolve)) };
}

// A minimal browser-like client: keeps the session cookie and sends the CSRF token.
export class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = '';
    this.csrfToken = '';
  }

  async request(method, path, body, { csrf = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (csrf && this.csrfToken && method !== 'GET') headers['X-CSRF-Token'] = this.csrfToken;

    const res = await fetch(this.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (json?.data?.csrfToken) this.csrfToken = json.data.csrfToken;
    return { status: res.status, body: json, headers: res.headers };
  }

  get(path) { return this.request('GET', path); }
  post(path, body, opts) { return this.request('POST', path, body, opts); }
  put(path, body, opts) { return this.request('PUT', path, body, opts); }
  delete(path, opts) { return this.request('DELETE', path, undefined, opts); }

  async login(email, password) {
    await this.get('/api/auth/csrf');
    return this.post('/api/auth/login', { email, password });
  }
}
