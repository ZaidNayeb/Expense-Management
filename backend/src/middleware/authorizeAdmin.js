import { HttpError } from '../errors.js';

// Must run after authenticate.
export function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return next(new HttpError(403, 'You do not have permission to perform this action.'));
  }
  next();
}
