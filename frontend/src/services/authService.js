import { api, setCsrfToken } from './api.js';

// Returns the signed-in user, or null when there is no valid session.
export async function fetchCurrentUser() {
  try {
    const { data } = await api.get('/auth/me', undefined, { skipAuthRedirect: true });
    setCsrfToken(data.csrfToken);
    return data.user;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export async function login(email, password) {
  const { data: csrf } = await api.get('/auth/csrf', undefined, { skipAuthRedirect: true });
  setCsrfToken(csrf.csrfToken);
  const { data } = await api.post('/auth/login', { email, password }, { skipAuthRedirect: true });
  setCsrfToken(data.csrfToken);
  return data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout', undefined, { skipAuthRedirect: true });
  } finally {
    setCsrfToken(null);
  }
}
