import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, createUser, pool, resetDatabase, startServer } from './helpers.js';

let server;
let admin, alice, bob; // logged-in clients
let ids; // user ids

before(async () => {
  await resetDatabase();
  const users = {
    admin: await createUser({ name: 'Ada Admin', email: 'admin@example.com', password: 'admin-pass-1', role: 'admin' }),
    alice: await createUser({ name: 'Alice', email: 'alice@example.com', password: 'alice-pass-1', role: 'user' }),
    bob: await createUser({ name: 'Bob', email: 'bob@example.com', password: 'bob-pass-12', role: 'user' }),
  };
  ids = Object.fromEntries(Object.entries(users).map(([k, u]) => [k, u.id]));
  server = await startServer();

  admin = new Client(server.baseUrl);
  alice = new Client(server.baseUrl);
  bob = new Client(server.baseUrl);
  assert.equal((await admin.login('admin@example.com', 'admin-pass-1')).status, 200);
  assert.equal((await alice.login('alice@example.com', 'alice-pass-1')).status, 200);
  assert.equal((await bob.login('bob@example.com', 'bob-pass-12')).status, 200);
});

after(async () => {
  await server?.close();
  await pool.end();
});

describe('authentication', () => {
  test('rejects unauthenticated requests with 401', async () => {
    const anon = new Client(server.baseUrl);
    for (const path of ['/api/auth/me', '/api/expenses', '/api/dashboard/summary', '/api/users/me']) {
      assert.equal((await anon.get(path)).status, 401, path);
    }
  });

  test('rejects a wrong password without revealing which field was wrong', async () => {
    const anon = new Client(server.baseUrl);
    const res = await anon.login('alice@example.com', 'wrong-password');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Incorrect email or password.');
  });

  test('login is case-insensitive on email and never returns the password hash', async () => {
    const c = new Client(server.baseUrl);
    const res = await c.login('  ALICE@example.com ', 'alice-pass-1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.role, 'user');
    assert.equal(JSON.stringify(res.body).includes('password'), false);
  });

  test('session cookie is HttpOnly and SameSite=Lax', async () => {
    const c = new Client(server.baseUrl);
    await c.get('/api/auth/csrf');
    const res = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: c.cookie, 'X-CSRF-Token': c.csrfToken },
      body: JSON.stringify({ email: 'bob@example.com', password: 'bob-pass-12' }),
    });
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
  });

  test('regenerates the session id on login (no session fixation)', async () => {
    const c = new Client(server.baseUrl);
    await c.get('/api/auth/csrf');
    const before = c.cookie;
    await c.post('/api/auth/login', { email: 'bob@example.com', password: 'bob-pass-12' });
    assert.notEqual(c.cookie, before);
  });

  test('/me reports the current user and role', async () => {
    const res = await admin.get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'admin@example.com');
    assert.equal(res.body.data.user.role, 'admin');
  });

  test('logout destroys the session', async () => {
    const c = new Client(server.baseUrl);
    await c.login('bob@example.com', 'bob-pass-12');
    const oldCookie = c.cookie;
    assert.equal((await c.post('/api/auth/logout')).status, 204);
    c.cookie = oldCookie; // replaying the old cookie must not work
    assert.equal((await c.get('/api/auth/me')).status, 401);
  });

  test('expired sessions are rejected', async () => {
    const c = new Client(server.baseUrl);
    await c.login('bob@example.com', 'bob-pass-12');
    await pool.query("UPDATE user_sessions SET expire = now() - interval '1 minute'");
    assert.equal((await c.get('/api/auth/me')).status, 401);
    // A write with an expired session is a 401 too, not a CSRF 403.
    const write = await c.post('/api/expenses', { name: 'x', amount: '1', date: '2026-10-01' });
    assert.equal(write.status, 401);
    // Restore the shared clients' sessions.
    for (const client of [admin, alice, bob]) client.cookie = '';
    await admin.login('admin@example.com', 'admin-pass-1');
    await alice.login('alice@example.com', 'alice-pass-1');
    await bob.login('bob@example.com', 'bob-pass-12');
  });
});

describe('CSRF protection', () => {
  test('rejects state-changing requests without a valid token', async () => {
    const missing = await alice.post('/api/expenses', { name: 'x', amount: '1', date: '2026-10-01' }, { csrf: false });
    assert.equal(missing.status, 403);
    const token = alice.csrfToken;
    alice.csrfToken = 'a'.repeat(64);
    const wrong = await alice.post('/api/expenses', { name: 'x', amount: '1', date: '2026-10-01' });
    alice.csrfToken = token;
    assert.equal(wrong.status, 403);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM expenses');
    assert.equal(rows[0].n, 0);
  });
});

describe('expenses as a regular user', () => {
  let expenseId;

  test('starts with no expenses and an empty dashboard', async () => {
    const list = await alice.get('/api/expenses');
    assert.deepEqual(list.body.data, []);
    assert.deepEqual(list.body.pagination, { page: 1, limit: 10, total: 0, totalPages: 0 });
    const summary = await alice.get('/api/dashboard/summary');
    assert.deepEqual(summary.body.data, { expenseCount: 0, totalAmount: '0.00', averageAmount: '0.00' });
  });

  test('creates an expense that is stored in PostgreSQL', async () => {
    const res = await alice.post('/api/expenses', { name: '  Groceries ', amount: '45.50', date: '2026-10-27' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Groceries');
    assert.equal(res.body.data.amount, '45.50');
    assert.equal(res.body.data.date, '2026-10-27');
    assert.equal(res.body.data.userId, ids.alice);
    expenseId = res.body.data.id;
    const { rows } = await pool.query('SELECT name, amount::text, date::text FROM expenses WHERE id = $1', [expenseId]);
    assert.deepEqual(rows[0], { name: 'Groceries', amount: '45.50', date: '2026-10-27' });
  });

  test('ignores a userId sent by a regular user', async () => {
    const res = await alice.post('/api/expenses', { name: 'Taxi', amount: 12, date: '2026-10-26', userId: ids.bob });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.userId, ids.alice);
  });

  test('rejects invalid input with 422 and field messages', async () => {
    const cases = [
      [{ amount: '1', date: '2026-10-01' }, 'name'],
      [{ name: '   ', amount: '1', date: '2026-10-01' }, 'name'],
      [{ name: 'x', amount: '-5', date: '2026-10-01' }, 'amount'],
      [{ name: 'x', amount: '0', date: '2026-10-01' }, 'amount'],
      [{ name: 'x', amount: '0.00', date: '2026-10-01' }, 'amount'],
      [{ name: 'x', amount: '1.234', date: '2026-10-01' }, 'amount'],
      [{ name: 'x', amount: 'abc', date: '2026-10-01' }, 'amount'],
      [{ name: 'x', amount: '1e3', date: '2026-10-01' }, 'amount'],
      [{ name: 'x', amount: '1', date: '2026-02-30' }, 'date'],
      [{ name: 'x', amount: '1', date: '27/10/2026' }, 'date'],
      [{ name: 'x', amount: '1' }, 'date'],
    ];
    for (const [body, field] of cases) {
      const res = await alice.post('/api/expenses', body);
      assert.equal(res.status, 422, JSON.stringify(body));
      assert.ok(res.body.error.fields[field], `${JSON.stringify(body)} should flag ${field}`);
    }
  });

  test('rejects malformed JSON with 400', async () => {
    const res = await alice.post('/api/expenses', '{"name": ');
    assert.equal(res.status, 400);
  });

  test('stores amounts exactly (no floating-point drift)', async () => {
    await alice.post('/api/expenses', { name: 'Cent A', amount: '0.10', date: '2026-01-01' });
    await alice.post('/api/expenses', { name: 'Cent B', amount: '0.20', date: '2026-01-01' });
    const res = await alice.get('/api/expenses?startDate=2026-01-01&endDate=2026-01-01');
    const { rows } = await pool.query("SELECT sum(amount)::text AS s FROM expenses WHERE date = '2026-01-01'");
    assert.equal(res.body.pagination.total, 2);
    assert.equal(rows[0].s, '0.30');
  });

  test('dashboard totals reflect the database', async () => {
    const summary = await alice.get('/api/dashboard/summary');
    assert.deepEqual(summary.body.data, { expenseCount: 4, totalAmount: '57.80', averageAmount: '14.45' });
    const recent = await alice.get('/api/dashboard/recent-expenses');
    assert.deepEqual(recent.body.data.map((e) => e.name), ['Groceries', 'Taxi', 'Cent B', 'Cent A']);
  });

  test('edits an expense and the totals update', async () => {
    const res = await alice.put(`/api/expenses/${expenseId}`, { name: 'Groceries (week)', amount: '50', date: '2026-10-25' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.amount, '50.00');
    assert.equal(res.body.data.name, 'Groceries (week)');
    const summary = await alice.get('/api/dashboard/summary');
    assert.equal(summary.body.data.totalAmount, '62.30');
  });

  test('deletes an expense; deleting it again returns 404', async () => {
    assert.equal((await alice.delete(`/api/expenses/${expenseId}`)).status, 204);
    assert.equal((await alice.delete(`/api/expenses/${expenseId}`)).status, 404);
    assert.equal((await alice.put(`/api/expenses/${expenseId}`, { name: 'x', amount: '1', date: '2026-10-01' })).status, 404);
    assert.equal((await alice.get('/api/dashboard/summary')).body.data.expenseCount, 3);
  });

  test('a non-numeric id is a 404, not a server error', async () => {
    assert.equal((await alice.get('/api/expenses/abc')).status, 404);
    assert.equal((await alice.get('/api/expenses/99999999999')).status, 404);
  });
});

describe('search, filters and pagination', () => {
  before(async () => {
    await pool.query('DELETE FROM expenses');
    for (let day = 1; day <= 25; day++) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      const name = day % 5 === 0 ? `Coffee 100%_${day}` : `Lunch ${day}`;
      await alice.post('/api/expenses', { name, amount: '10.00', date });
    }
    await bob.post('/api/expenses', { name: 'Bob coffee', amount: '3.00', date: '2026-09-10' });
  });

  test('paginates with a default page size of 10, newest first', async () => {
    const p1 = await alice.get('/api/expenses');
    assert.equal(p1.body.data.length, 10);
    assert.equal(p1.body.data[0].date, '2026-09-25');
    assert.deepEqual(p1.body.pagination, { page: 1, limit: 10, total: 25, totalPages: 3 });
    const p3 = await alice.get('/api/expenses?page=3');
    assert.equal(p3.body.data.length, 5);
    assert.equal(p3.body.data.at(-1).date, '2026-09-01');
  });

  test('out-of-range pages return an empty list, invalid parameters return 400', async () => {
    const far = await alice.get('/api/expenses?page=50');
    assert.equal(far.status, 200);
    assert.deepEqual(far.body.data, []);
    assert.equal(far.body.pagination.total, 25);
    for (const q of ['page=0', 'page=-1', 'page=abc', 'limit=101', 'limit=0', 'startDate=2026-13-01', 'startDate=2026-09-10&endDate=2026-09-01']) {
      assert.equal((await alice.get(`/api/expenses?${q}`)).status, 400, q);
    }
  });

  test('search is case-insensitive and treats % and _ literally', async () => {
    const coffee = await alice.get('/api/expenses?search=COFFEE');
    assert.equal(coffee.body.pagination.total, 5); // Bob's coffee is not visible to Alice
    const literal = await alice.get(`/api/expenses?search=${encodeURIComponent('100%_1')}`);
    assert.deepEqual(literal.body.data.map((e) => e.name), ['Coffee 100%_15', 'Coffee 100%_10']);
    const percentOnly = await alice.get(`/api/expenses?search=${encodeURIComponent('%')}`);
    assert.equal(percentOnly.body.pagination.total, 5);
  });

  test('filters by date range before paginating', async () => {
    const res = await alice.get('/api/expenses?startDate=2026-09-05&endDate=2026-09-18&limit=5');
    assert.equal(res.body.pagination.total, 14);
    assert.equal(res.body.pagination.totalPages, 3);
    assert.equal(res.body.data[0].date, '2026-09-18');
  });

  test('a regular user cannot use the userId filter to see someone else', async () => {
    const res = await alice.get(`/api/expenses?userId=${ids.bob}`);
    assert.equal(res.body.pagination.total, 25);
    assert.ok(res.body.data.every((e) => e.userId === ids.alice));
  });

  test('spending trend aggregates daily with empty days filled in', async () => {
    const res = await alice.get('/api/dashboard/spending-trend?startDate=2026-09-24&endDate=2026-09-27');
    assert.equal(res.body.data.granularity, 'day');
    assert.deepEqual(res.body.data.points, [
      { period: '2026-09-24', total: '10.00' },
      { period: '2026-09-25', total: '10.00' },
      { period: '2026-09-26', total: '0.00' },
      { period: '2026-09-27', total: '0.00' },
    ]);
  });

  test('spending trend aggregates monthly for long ranges', async () => {
    const res = await alice.get('/api/dashboard/spending-trend?startDate=2026-01-01&endDate=2026-10-31');
    assert.equal(res.body.data.granularity, 'month');
    assert.equal(res.body.data.points.length, 10);
    assert.deepEqual(res.body.data.points[8], { period: '2026-09-01', total: '250.00' });
  });
});

describe('authorization between users', () => {
  let bobExpenseId;
  before(async () => {
    const { rows } = await pool.query('SELECT id FROM expenses WHERE user_id = $1 LIMIT 1', [ids.bob]);
    bobExpenseId = rows[0].id;
  });

  test("a user cannot read, edit or delete another user's expense by id", async () => {
    assert.equal((await alice.get(`/api/expenses/${bobExpenseId}`)).status, 404);
    assert.equal((await alice.put(`/api/expenses/${bobExpenseId}`, { name: 'Hacked', amount: '1', date: '2026-10-01' })).status, 404);
    assert.equal((await alice.delete(`/api/expenses/${bobExpenseId}`)).status, 404);
    const { rows } = await pool.query('SELECT name FROM expenses WHERE id = $1', [bobExpenseId]);
    assert.equal(rows[0].name, 'Bob coffee');
  });

  test('a regular user cannot access admin endpoints (403)', async () => {
    assert.equal((await alice.get('/api/users')).status, 403);
    assert.equal((await alice.post('/api/users', { name: 'X', email: 'x@example.com', password: 'password1', role: 'admin' })).status, 403);
    assert.equal((await alice.delete(`/api/users/${ids.bob}`)).status, 403);
  });

  test('a user cannot promote themselves to admin', async () => {
    // There is no endpoint that changes a role; extra fields are ignored and the role is
    // always re-read from the database.
    await alice.put('/api/users/me', { role: 'admin' });
    await alice.post('/api/expenses', { name: 'x', amount: '1', date: '2026-10-01', role: 'admin' });
    const me = await alice.get('/api/auth/me');
    assert.equal(me.body.data.user.role, 'user');
    assert.equal((await alice.get('/api/users')).status, 403);
  });

  test('a user dashboard only counts their own expenses', async () => {
    const res = await bob.get('/api/dashboard/summary');
    assert.equal(res.body.data.expenseCount, 1);
    assert.equal(res.body.data.userCount, undefined);
  });
});

describe('admin', () => {
  test('sees expenses across all users and can filter by user', async () => {
    const all = await admin.get('/api/expenses?limit=100');
    const owners = new Set(all.body.data.map((e) => e.ownerName));
    assert.ok(owners.has('Alice') && owners.has('Bob'));
    const bobOnly = await admin.get(`/api/expenses?userId=${ids.bob}`);
    assert.equal(bobOnly.body.pagination.total, 1);
    assert.equal(bobOnly.body.data[0].ownerName, 'Bob');
  });

  test('admin dashboard covers all users', async () => {
    const res = await admin.get('/api/dashboard/summary');
    const { rows } = await pool.query('SELECT count(*)::int AS n, sum(amount)::numeric(14,2)::text AS s FROM expenses');
    assert.equal(res.body.data.expenseCount, rows[0].n);
    assert.equal(res.body.data.totalAmount, rows[0].s);
    assert.equal(res.body.data.userCount, 3);
    const recent = await admin.get('/api/dashboard/recent-expenses');
    assert.equal(recent.body.data.length, 5);
    assert.ok(recent.body.data.every((e) => e.ownerName));
  });

  test('creates an expense for a selected user, validating the user', async () => {
    const ok = await admin.post('/api/expenses', { name: 'Assigned', amount: '9.99', date: '2026-10-02', userId: ids.bob });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.data.userId, ids.bob);
    const missing = await admin.post('/api/expenses', { name: 'Assigned', amount: '9.99', date: '2026-10-02', userId: 999999 });
    assert.equal(missing.status, 422);
    assert.ok(missing.body.error.fields.userId);
    const mine = await admin.post('/api/expenses', { name: 'Admin own', amount: '1.00', date: '2026-10-02' });
    assert.equal(mine.body.data.userId, ids.admin);
  });

  test("edits and deletes any user's expense", async () => {
    const { rows } = await pool.query('SELECT id FROM expenses WHERE user_id = $1 LIMIT 1', [ids.alice]);
    const id = rows[0].id;
    const edit = await admin.put(`/api/expenses/${id}`, { name: 'Edited by admin', amount: '11.00', date: '2026-09-01' });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.data.userId, ids.alice); // owner unchanged when not specified
    assert.equal((await admin.delete(`/api/expenses/${id}`)).status, 204);
  });

  test('lists and searches users without exposing password hashes', async () => {
    const res = await admin.get('/api/users');
    assert.equal(res.body.pagination.total, 3);
    assert.equal(JSON.stringify(res.body).includes('password'), false);
    const search = await admin.get('/api/users?search=ALI');
    assert.deepEqual(search.body.data.map((u) => u.email), ['alice@example.com']);
  });

  test('creates users; duplicate emails return 409', async () => {
    const res = await admin.post('/api/users', { name: 'Carol', email: 'Carol@Example.com', password: 'carol-pass-1', role: 'user' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.email, 'carol@example.com');
    assert.equal(res.body.data.passwordHash, undefined);
    const dup = await admin.post('/api/users', { name: 'Carol 2', email: 'carol@example.com', password: 'carol-pass-1', role: 'user' });
    assert.equal(dup.status, 409);
    assert.ok(dup.body.error.fields.email);
    const bad = await admin.post('/api/users', { name: '', email: 'not-an-email', password: 'short', role: 'owner' });
    assert.equal(bad.status, 422);
    assert.deepEqual(Object.keys(bad.body.error.fields).sort(), ['email', 'name', 'password', 'role']);

    const carol = new Client(server.baseUrl);
    assert.equal((await carol.login('carol@example.com', 'carol-pass-1')).status, 200);
  });

  test('cannot delete itself or the last administrator', async () => {
    const self = await admin.delete(`/api/users/${ids.admin}`);
    assert.equal(self.status, 409);

    // A second admin trying to delete the first: allowed only while another admin remains.
    const second = await admin.post('/api/users', { name: 'Second Admin', email: 'admin2@example.com', password: 'admin-pass-2', role: 'admin' });
    const admin2 = new Client(server.baseUrl);
    await admin2.login('admin2@example.com', 'admin-pass-2');
    // admin2 deletes admin -> fine (admin2 remains). Then admin2 is the last admin.
    assert.equal((await admin2.delete(`/api/users/${ids.admin}`)).status, 200);
    assert.equal((await admin.get('/api/auth/me')).status, 401, 'deleted admin loses access immediately');
    admin.cookie = admin2.cookie;
    admin.csrfToken = admin2.csrfToken;
    ids.admin = second.body.data.id;
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin'");
    assert.equal(rows[0].n, 1);
  });

  test('the service refuses to delete the last administrator', async () => {
    // Over HTTP the acting admin is always a second admin, so test the guard directly.
    const { deleteUser } = await import('../src/services/userService.js');
    await assert.rejects(deleteUser(ids.admin, ids.bob), { status: 409, message: 'The last administrator account cannot be deleted.' });
  });

  test('deleting a user deletes their expenses in the same transaction', async () => {
    const before = await pool.query('SELECT count(*)::int AS n FROM expenses WHERE user_id = $1', [ids.alice]);
    assert.ok(before.rows[0].n > 0);
    const res = await admin.delete(`/api/users/${ids.alice}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.deletedExpenses, before.rows[0].n);
    const after = await pool.query('SELECT count(*)::int AS n FROM expenses WHERE user_id = $1', [ids.alice]);
    assert.equal(after.rows[0].n, 0);
    assert.equal((await alice.get('/api/expenses')).status, 401, 'deleted user is signed out');
    assert.equal((await admin.delete(`/api/users/${ids.alice}`)).status, 404);
  });

  test('the database refuses invalid rows even if validation were bypassed', async () => {
    const bad = [
      ["INSERT INTO expenses (name, amount, date, user_id) VALUES ('x', 0, '2026-01-01', $1)", [ids.bob]],
      ["INSERT INTO expenses (name, amount, date, user_id) VALUES ('  ', 5, '2026-01-01', $1)", [ids.bob]],
      ["INSERT INTO expenses (name, amount, date, user_id) VALUES ('x', 5, '2026-01-01', 999999)", []],
      ["INSERT INTO users (name, email, password_hash, role) VALUES ('x', 'y@example.com', 'h', 'root')", []],
      ["INSERT INTO users (name, email, password_hash) VALUES ('x', 'BOB@example.com', 'h')", []],
      ["INSERT INTO users (name, email, password_hash) VALUES ('x', 'bob@example.com', 'h')", []],
    ];
    for (const [sql, params] of bad) {
      await assert.rejects(pool.query(sql, params), undefined, sql);
    }
  });
});

describe('login rate limiting', () => {
  test('blocks repeated failed logins with 429', async () => {
    const c = new Client(server.baseUrl);
    await c.get('/api/auth/csrf');
    let status;
    for (let i = 0; i < 8 && status !== 429; i++) {
      status = (await c.post('/api/auth/login', { email: 'bob@example.com', password: `wrong-${i}` })).status;
    }
    assert.equal(status, 429);
  });
});
