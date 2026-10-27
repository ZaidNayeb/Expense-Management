import { HttpError } from '../errors.js';
import { config } from '../config/env.js';

// PostgreSQL / network error codes that mean "database unavailable".
const DB_UNAVAILABLE = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '57P01', '57P03', '53300']);

export function notFoundHandler(req, res, next) {
  next(new HttpError(404, 'The requested endpoint does not exist.'));
}

// Centralized error handler. Only messages from HttpError reach the client verbatim;
// everything else becomes a generic message so database details are never exposed.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // The response already started (e.g. the session store failed while saving):
  // let Express close the connection instead of sending a second response.
  if (res.headersSent) {
    console.error(`[${req.method} ${req.path}] error after response started:`, err.code || err.message);
    return next(err);
  }

  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let fields;

  if (err instanceof HttpError) {
    ({ status, message, fields } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request body is too large.';
  } else if (DB_UNAVAILABLE.has(err.code) || /timeout exceeded when trying to connect/i.test(err.message)) {
    status = 503;
    message = 'The service is temporarily unavailable. Please try again shortly.';
  } else if (err.code === '22P02' || err.code === '22003' || err.code === '22008') {
    // Invalid input syntax / out of range — validation should catch these first.
    status = 422;
    message = 'One or more values are invalid.';
  }

  if (status >= 500) {
    // Log the code and message only: no request bodies, so passwords never reach the logs.
    console.error(`[${req.method} ${req.path}]`, err.code || '', config.isProduction ? err.message : err.stack);
  }

  const body = { error: { message } };
  if (fields) body.error.fields = fields;
  res.status(status).json(body);
}
