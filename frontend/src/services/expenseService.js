import { api } from './api.js';

// filters: { page, limit, search, startDate, endDate, userId }
export const listExpenses = (filters) => api.get('/expenses', filters);

export const createExpense = (expense) => api.post('/expenses', expense).then((r) => r.data);

export const updateExpense = (id, expense) => api.put(`/expenses/${id}`, expense).then((r) => r.data);

export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
