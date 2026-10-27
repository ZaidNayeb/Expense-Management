import { api } from './api.js';

export const getProfile = () => api.get('/users/me').then((r) => r.data);

// params: { page, limit, search }
export const listUsers = (params) => api.get('/users', params);

export const createUser = (user) => api.post('/users', user).then((r) => r.data);

export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);
