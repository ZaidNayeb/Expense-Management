import { HttpError } from '../errors.js';
import { getOrIssueCsrfToken, issueCsrfToken } from '../middleware/csrf.js';
import { findByEmailWithHash } from '../services/userService.js';
import { verifyAgainstDummy, verifyPassword } from '../services/passwordService.js';
import { validateLogin } from '../validators/userValidator.js';
import { SESSION_COOKIE_NAME } from '../config/session.js';

const promisify = (fn) => new Promise((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));

export async function csrfToken(req, res) {
  const token = getOrIssueCsrfToken(req);
  // Persist before responding, so a token is never handed out that the store did not keep.
  await promisify((cb) => req.session.save(cb));
  res.json({ data: { csrfToken: token } });
}

export async function login(req, res) {
  const { email, password } = validateLogin(req.body);
  const account = await findByEmailWithHash(email);
  const valid = account
    ? await verifyPassword(password, account.passwordHash)
    : await verifyAgainstDummy(password);

  if (!valid) throw new HttpError(401, 'Incorrect email or password.');

  // New session id after authentication prevents session fixation.
  await promisify((cb) => req.session.regenerate(cb));
  req.session.userId = account.id;
  const token = issueCsrfToken(req);
  await promisify((cb) => req.session.save(cb));

  const { passwordHash, ...user } = account; // eslint-disable-line no-unused-vars
  res.json({ data: { user, csrfToken: token } });
}

export function me(req, res) {
  res.json({ data: { user: req.user, csrfToken: getOrIssueCsrfToken(req) } });
}

export async function logout(req, res) {
  await promisify((cb) => req.session.destroy(cb));
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.status(204).end();
}
