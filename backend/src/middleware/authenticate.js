import { HttpError } from '../errors.js';
import { findById } from '../services/userService.js';

// Loads the signed-in user from the database on every request, so a deleted account
// loses access immediately and the role always comes from PostgreSQL, never the client.
export async function authenticate(req, res, next) {
  const userId = req.session?.userId;
  if (!userId) return next(new HttpError(401, 'Please sign in to continue.'));

  const user = await findById(userId);
  if (!user) {
    req.session.destroy(() => {});
    return next(new HttpError(401, 'Please sign in to continue.'));
  }
  req.user = user;
  next();
}
