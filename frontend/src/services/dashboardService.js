import { api } from './api.js';

export const getSummary = () => api.get('/dashboard/summary').then((r) => r.data);

export const getRecentExpenses = () => api.get('/dashboard/recent-expenses').then((r) => r.data);

export const getSpendingTrend = (startDate, endDate) =>
  api.get('/dashboard/spending-trend', { startDate, endDate }).then((r) => r.data);
