import crypto from 'node:crypto';
import { HttpError } from '../errors.js';

// Synchronizer-token CSRF protection: the token lives in the server-side session and the
// client must echo it in the X-CSRF-Token header on every state-changing request.
// A cross-site page can make the browser send the cookie, but it cannot read the token.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(req) {
  req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

export function getOrIssueCsrfToken(req) {
  return req.session.csrfToken || issueCsrfToken(req);
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const expected = req.session?.csrfToken;
  const received = req.get('X-CSRF-Token');

  // No token in the session means the session expired (or never existed). Report that as
  // 401 so the client can send the user back to the login page. Login itself still needs a
  // token from GET /api/auth/csrf first.
  if (!expected && req.path !== '/auth/login') {
    return next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
  const valid =
    typeof expected === 'string' &&
    typeof received === 'string' &&
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));

  if (!valid) {
    return next(new HttpError(403, 'Your session token is missing or expired. Please refresh the page and try again.'));
  }
  next();
}
