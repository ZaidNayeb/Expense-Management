import { HttpError } from '../errors.js';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// True for a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-30).
export function isValidDate(value) {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [y, m, d] = match.slice(1).map(Number);
  if (y < 1900 || y > 2999) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const INT_MAX = 2147483647;

// Route ids that are not positive integers can never match a row, so they are reported as 404.
export function parseId(value, what = 'Resource') {
  if (!/^\d{1,10}$/.test(String(value)) || Number(value) < 1 || Number(value) > INT_MAX) {
    throw new HttpError(404, `${what} not found.`);
  }
  return Number(value);
}

// Optional integer query parameter; throws 400 when present but invalid.
export function parseOptionalInt(value, name, { min = 1, max = INT_MAX } = {}) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{1,10}$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new HttpError(400, `Query parameter "${name}" must be an integer between ${min} and ${max}.`);
  }
  return Number(value);
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(query) {
  const page = parseOptionalInt(query.page, 'page', { max: 1000000 }) ?? 1;
  const limit = parseOptionalInt(query.limit, 'limit', { max: MAX_PAGE_SIZE }) ?? DEFAULT_PAGE_SIZE;
  return { page, limit, offset: (page - 1) * limit };
}

export function parseSearch(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, 'Query parameter "search" must be text.');
  const trimmed = value.trim();
  if (trimmed.length > 100) throw new HttpError(400, 'Search text must be 100 characters or fewer.');
  return trimmed || undefined;
}

// Validates optional startDate/endDate query parameters.
export function parseDateRange(query) {
  const range = {};
  for (const key of ['startDate', 'endDate']) {
    const value = query[key];
    if (value === undefined || value === '') continue;
    if (!isValidDate(value)) {
      throw new HttpError(400, `Query parameter "${key}" must be a valid date (YYYY-MM-DD).`);
    }
    range[key] = value;
  }
  if (range.startDate && range.endDate && range.startDate > range.endDate) {
    throw new HttpError(400, 'The start date must be on or before the end date.');
  }
  return range;
}

// Escapes LIKE wildcards so search text is matched literally.
export function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function paginated(rows, total, { page, limit }) {
  return {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
