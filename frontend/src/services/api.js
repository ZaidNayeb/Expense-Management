// Thin fetch wrapper: JSON in/out, session cookie, CSRF header, and consistent errors.

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

// Kept in memory only. It is re-issued by /api/auth/me after a reload.
let csrfToken = null;
let unauthorizedHandler = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

// Called when an authenticated request gets 401 (e.g. the session expired).
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export async function request(method, path, { body, params, skipAuthRedirect = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(`/api${path}${toQueryString(params)}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      (response.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'The request failed.');
    if (response.status === 401 && !skipAuthRedirect && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(response.status, message, payload?.error?.fields);
  }
  return payload;
}

export const api = {
  get: (path, params, options) => request('GET', path, { params, ...options }),
  post: (path, body, options) => request('POST', path, { body, ...options }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
};
