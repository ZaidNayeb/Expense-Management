const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';
const LOCALE = 'en-US';

const moneyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' });

// Amounts arrive from the API as exact decimal strings ("45.50"); Number is fine for display.
export const formatMoney = (amount) => moneyFormatter.format(Number(amount || 0));

export const currencySymbol = moneyFormatter.formatToParts(0).find((p) => p.type === 'currency')?.value ?? '$';

// Parses 'YYYY-MM-DD' as a local calendar date (new Date('2026-10-27') would be UTC midnight).
export function parseISODate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Accepts a calendar date ('YYYY-MM-DD') or a full timestamp (shown in local time).
export function formatDate(iso) {
  if (!iso) return '';
  return dateFormatter.format(iso.length > 10 ? new Date(iso) : parseISODate(iso));
}
export const formatShortDate = (iso) => shortDateFormatter.format(parseISODate(iso));
export const formatMonth = (iso) => monthFormatter.format(parseISODate(iso));

export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const todayISO = () => toISODate(new Date());

export function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(iso, months) {
  const date = parseISODate(iso);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return toISODate(date);
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || '?';
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
