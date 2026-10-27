# ExpensePro — Expense Management System

A small, complete expense tracker with two interfaces:

- **User interface** — a personal dashboard, plus adding, editing, deleting, searching and date-filtering your own expenses.
- **Admin panel** — every user's expenses (with an owner filter), user accounts (create and delete), and dashboard totals for the whole application.

Stack: **React 19 + Vite** (plain CSS, no UI libraries), **Node.js + Express 5**, **PostgreSQL** via `pg` (plain parameterized SQL, no ORM), and server-side sessions stored in PostgreSQL.

---

## Contents

1. [Project structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Environment variables](#environment-variables)
5. [Running the app](#running-the-app)
6. [Administrator recovery](#administrator-recovery)
7. [API reference](#api-reference)
8. [Security design](#security-design)
9. [Tests](#tests)
10. [Verification checklist](#verification-checklist)
11. [Known limitations](#known-limitations)

---

## Project structure

```
backend/
  migrations/001_initial_schema.sql   users, expenses, user_sessions tables, constraints, indexes
  scripts/migrate.js                  applies pending migrations (tracked in schema_migrations)
  scripts/create-admin.js             creates the first administrator
  src/
    app.js / server.js                Express app and process entry point
    config/   env.js database.js session.js
    routes/   auth, user, expense, dashboard routes
    controllers/                      HTTP request/response handling
    services/                         SQL queries and business rules (ownership, last-admin guard, ...)
    validators/                       server-side input validation
    middleware/                       authenticate, authorizeAdmin, csrf, errorHandler
    errors.js                         HttpError (messages that are safe to show the client)
  tests/      api.test.js helpers.js  API tests against a real PostgreSQL database
frontend/
  src/
    pages/                            Login, UserDashboard, MyExpenses, Profile,
                                      AdminDashboard, AdminExpenses, AdminUsers
    components/layout|common|expenses|dashboard|users
    services/                         api.js (fetch + CSRF + errors) and one module per resource
    context/                          AuthContext (current user), ToastContext (notifications)
    hooks/                            useApiData, useExpenseEditor, useDebouncedValue, useUserOptions
    styles/                           variables.css (design tokens), base, layout, components
    utils/                            formatting and client-side validation
```

## Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL 13+** running locally ([download](https://www.postgresql.org/download/)). Docker is optional; for example
  `docker run --name expense-pg -e POSTGRES_PASSWORD=change-me -p 5432:5432 -d postgres:17`.

No paid or external services are needed.

## Setup

### 1. Install dependencies

```bash
cd backend && npm install
```

```bash
cd frontend && npm install
```

### 2. Create the database

With the PostgreSQL command-line tools:

```bash
createdb -U postgres expense_manager
```

Or from `psql`: `CREATE DATABASE expense_manager;`

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`: set `DB_*` to match your PostgreSQL server and replace `SESSION_SECRET` with a long random value:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The frontend works without a `.env`. Copy `frontend/.env.example` to `frontend/.env` only to change the API proxy target or the currency.

### 4. Initialize the schema

```bash
cd backend && npm run migrate
```

This creates the `users`, `expenses` and `user_sessions` tables. Running it again only applies new migrations. The database starts **empty**: no users and no expenses are inserted.

### 5. Create the first administrator

Interactive (recommended; the password is typed hidden and never written to disk):

```bash
cd backend && npm run create-admin
```

Non-interactive alternative: set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` (or in the environment), run `npm run create-admin`, then remove `ADMIN_PASSWORD` from the file.

The script hashes the password with bcrypt before storing it. It **refuses to run if an administrator already exists**. There is no HTTP endpoint for creating administrators or for public sign-up. All further accounts are created by an admin in the app.

## Environment variables

### `backend/.env`

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` enables Secure cookies and serves `frontend/dist` |
| `PORT` | no | `4000` | API port |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | Only origin allowed by CORS (with credentials) |
| `DB_HOST` | no | `localhost` | PostgreSQL host |
| `DB_PORT` | no | `5432` | PostgreSQL port |
| `DB_NAME` | **yes** | – | Database name |
| `DB_USER` | **yes** | – | Database user |
| `DB_PASSWORD` | no | empty | Database password |
| `SESSION_SECRET` | **yes** (server) | – | Signs session cookies; at least 32 characters |
| `SESSION_MAX_AGE_MINUTES` | no | `120` | Idle session lifetime (extended on activity) |
| `LOGIN_RATE_LIMIT_MAX` | no | `10` | Failed logins allowed per IP per 15 minutes |
| `TRUST_PROXY` | no | `0` | Set to `1` behind a reverse proxy that terminates HTTPS |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | no | – | Optional input for `npm run create-admin` |
| `TEST_DB_NAME` | for tests | – | Test database; **must end in `_test`** |

### `frontend/.env` (optional)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_PROXY_TARGET` | `http://localhost:4000` | Where the Vite dev server forwards `/api` |
| `VITE_CURRENCY` | `USD` | The single display currency (ISO 4217 code) |

`.env` files are git-ignored. Only the `.env.example` files with placeholders are committed.

## Running the app

### Development

Run these in two terminals:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

Open <http://localhost:5173> and sign in with the administrator you created. The Vite dev server proxies `/api` to the backend, so the browser sees a single origin.

### Production-style

```bash
cd frontend && npm run build
```

```bash
cd backend && NODE_ENV=production npm start
```

With `NODE_ENV=production`, Express serves the built frontend from `frontend/dist` on the same origin as the API. Session cookies are then marked `Secure`, so serve the app over HTTPS (set `TRUST_PROXY=1` behind a TLS-terminating proxy).

## Administrator recovery

If every administrator has lost access (for example, a forgotten password), someone with shell access to the server can create one additional administrator:

```bash
cd backend && npm run create-admin -- --recover
```

Recovery mode only runs interactively, shows how many admins already exist, and requires typing `RECOVER` to continue. Afterwards, sign in as the new admin and delete the inaccessible account if needed.

## API reference

All endpoints are under `/api` and use JSON. Success responses are `{ "data": ... }`, and paginated lists add `"pagination": { page, limit, total, totalPages }`. Errors are `{ "error": { "message", "fields"? } }`.

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/auth/csrf` | public | Issues the CSRF token for the current session |
| POST | `/auth/login` | public (rate-limited) | `{ email, password }`; regenerates the session |
| GET | `/auth/me` | signed in | Current user (`id, name, email, role`) and CSRF token |
| POST | `/auth/logout` | signed in | Destroys the session |
| GET | `/users/me` | signed in | Profile |
| GET | `/users` | admin | `page`, `limit`, `search` (name or email) |
| POST | `/users` | admin | `{ name, email, password, role }` |
| DELETE | `/users/:id` | admin | Deletes the user and their expenses in one transaction |
| GET | `/expenses` | signed in | `page`, `limit` (default 10, max 100), `search`, `startDate`, `endDate`, `userId` (admin only). Users only ever get their own expenses |
| POST | `/expenses` | signed in | `{ name, amount, date }`; admins may add `userId` |
| GET / PUT / DELETE | `/expenses/:id` | owner or admin | Others get 404 |
| GET | `/dashboard/summary` | signed in | `totalAmount`, `expenseCount`, `averageAmount` (+ `userCount` for admins) |
| GET | `/dashboard/recent-expenses` | signed in | 5 most recent by date |
| GET | `/dashboard/spending-trend` | signed in | `startDate`, `endDate`; daily buckets up to 93 days, monthly beyond |

Status codes: `400` malformed query or JSON, `401` not signed in or session expired, `403` not allowed or bad CSRF token, `404` not found or not yours, `409` duplicate email or protected account, `422` invalid fields, `429` too many logins, `503` database unavailable, `500` anything else (generic message).

## Security design

- **Passwords**: bcrypt (cost 12). Hashes are never selected into API responses. Login takes the same time whether or not the email exists.
- **Sessions**: `express-session` with a PostgreSQL store (`user_sessions`), so sessions survive backend restarts. Cookies are `HttpOnly`, `SameSite=Lax` and `Secure` in production, with an idle expiry. The session id is regenerated at login, and logout destroys the session server-side.
- **Authorization** is enforced on the server for every request. The user and role are reloaded from PostgreSQL on each request, so a deleted user loses access immediately and a client can never claim a role. Ownership is applied in SQL (`WHERE user_id = $n`) for regular users. A `userId` sent by a regular user is ignored.
- **CSRF**: synchronizer token stored in the session and required in an `X-CSRF-Token` header on every non-GET request (including login), alongside SameSite cookies.
- **Login rate limiting**: failed attempts per IP per 15 minutes (`LOGIN_RATE_LIMIT_MAX`).
- **SQL injection**: every query is parameterized. Search text is matched literally (`%` and `_` are escaped).
- **Input validation** on the server, plus database constraints as the last line of defence: positive `NUMERIC(12,2)` amounts, non-blank names, valid roles, unique lowercase emails, foreign keys.
- **Errors**: a central handler returns generic messages for unexpected errors. Database details and stack traces never reach the client, and request bodies are never logged.
- **Account protection**: admins cannot delete themselves, and the last administrator cannot be deleted. The deletion locks the admin rows so concurrent requests cannot bypass this.
- `helmet` security headers, and CORS limited to `FRONTEND_ORIGIN`.

## Tests

The API tests use Node's built-in test runner against a **real PostgreSQL database**. Create a separate test database (its name must end in `_test`, because every table in it is emptied):

```bash
createdb -U postgres expense_manager_test
```

Set `TEST_DB_NAME=expense_manager_test` in `backend/.env` (it uses the same `DB_HOST`, `DB_USER`, etc.), then run:

```bash
cd backend && npm test
```

The suite applies the migrations itself and covers authentication, sessions and expiry, CSRF, validation, exact decimal storage, ownership and admin authorization, privilege escalation attempts, search/filter/pagination, dashboard aggregation, user deletion, the last-admin guard, database constraints and login rate limiting.

## Verification checklist

| # | Scenario | How to check | Automated |
| --- | --- | --- | --- |
| 1 | Initial database has no expenses | `npm run migrate`, then `SELECT count(*) FROM expenses;` returns 0 | ✓ |
| 2 | First admin created securely | `npm run create-admin`; `password_hash` starts with `$2b$`; a second run is refused | manual |
| 3 | Admin can log in | Sign in, land on `/admin` | ✓ |
| 4 | Admin creates a user | Users → Create user | ✓ |
| 5 | User can log in | Sign in as the new user, land on `/dashboard` | ✓ |
| 6 | User creates an expense | Add expense | ✓ |
| 7 | Expense saved in PostgreSQL | `SELECT * FROM expenses;` | ✓ |
| 8 | Appears on the dashboard | Recent expenses + chart | ✓ |
| 9 | Totals update | Summary cards change after add, edit and delete | ✓ |
| 10 | User edits an expense | Pencil icon → Save changes | ✓ |
| 11 | User deletes an expense | Trash icon → confirm | ✓ |
| 12 | Search and date filtering | Search box; Filters → date range | ✓ |
| 13 | Pagination | More than 10 expenses → Next / Previous | ✓ |
| 14 | Admin sees all users' expenses | Admin → Expenses (Owner column) | ✓ |
| 15 | Admin filters by user | Filters → Owner | ✓ |
| 16 | Admin edits/deletes any expense | Row actions on Admin → Expenses | ✓ |
| 17 | No access to others' expenses by ID | `GET /api/expenses/<other id>` as a user → 404 | ✓ |
| 18 | User cannot reach admin endpoints | `GET /api/users` as a user → 403; `/admin` redirects | ✓ |
| 19 | No self-promotion | No endpoint changes roles; extra `role` fields are ignored | ✓ |
| 20 | Deleting a user deletes their expenses | Users → delete; the toast reports how many expenses went with them | ✓ |
| 21 | Invalid input handled | Blank name, `0`, `-5`, `1.234`, `2026-02-30` are rejected | ✓ |
| 22 | Expired sessions | Wait for expiry (or set `SESSION_MAX_AGE_MINUTES=1`); the next action returns you to login with a notice | ✓ |
| 23 | Works with no expenses | Fresh user sees empty states, not broken charts | ✓ |
| 24 | Desktop and mobile layouts | Narrow the window below 860px: top bar, bottom tabs, stacked rows | manual |

## Known limitations

- The admin owner pickers (expense form and owner filter) list the first 100 users, which is the API's maximum page size. That is fine for a small installation, but larger ones would need a searchable picker.
- The login rate limiter keeps its counters in memory, so they reset when the backend restarts and are not shared between multiple instances.
- There is intentionally no profile editing, password change or password reset. Admins create accounts with an initial password, and lost admin access uses the recovery script above.
- One currency, set at build time (`VITE_CURRENCY`). Dates in the chart's "last N days" ranges use the browser's local date.
