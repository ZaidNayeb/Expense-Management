import { HttpError } from '../errors.js';
import * as dashboard from '../services/dashboardService.js';
import { parseDateRange } from '../validators/common.js';

const MAX_TREND_DAYS = 366 * 5;

const isoDate = (date) => date.toISOString().slice(0, 10);

export async function summary(req, res) {
  res.json({ data: await dashboard.getSummary(req.user) });
}

export async function recentExpenses(req, res) {
  res.json({ data: await dashboard.getRecentExpenses(req.user) });
}

// Defaults to the last 30 days ending today when no range is given.
export async function spendingTrend(req, res) {
  let { startDate, endDate } = parseDateRange(req.query);
  endDate ??= isoDate(new Date());
  startDate ??= isoDate(new Date(Date.parse(endDate) - 29 * 86400000));
  if (startDate > endDate) throw new HttpError(400, 'The start date must be on or before the end date.');
  if (dashboard.daysBetween(startDate, endDate) > MAX_TREND_DAYS) {
    throw new HttpError(400, 'The date range can be at most five years.');
  }
  res.json({ data: await dashboard.getSpendingTrend(req.user, startDate, endDate) });
}
