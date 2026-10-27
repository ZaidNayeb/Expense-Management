import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../common/States.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { getSpendingTrend } from '../../services/dashboardService.js';
import { addDays, addMonths, formatDate, formatMoney, formatMonth, formatShortDate, todayISO } from '../../utils/format.js';

const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
];

function rangeDates(id) {
  const end = todayISO();
  if (id === '12m') return { start: addMonths(end, -11), end }; // first day of the month, 11 months back
  const days = { '7d': 7, '30d': 30, '90d': 90 }[id];
  return { start: addDays(end, -(days - 1)), end };
}

// Rounds the axis maximum up to 1, 2, 2.5 or 5 times a power of ten.
function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value);
  return step * magnitude;
}

const compactMoney = (value) =>
  value >= 1000 ? `${formatMoney(value / 1000).replace(/\.00$/, '')}k` : formatMoney(value).replace(/\.00$/, '');

// Callback ref, so the observer attaches whenever the element mounts (it may appear
// later, e.g. after an empty state is replaced by the chart).
function useElementWidth() {
  const [width, setWidth] = useState(0);
  const observerRef = useRef(null);
  const ref = useCallback((node) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    observerRef.current = observer;
  }, []);
  useEffect(() => () => observerRef.current?.disconnect(), []);
  return [ref, width];
}

export default function SpendingChart({ dataVersion, title = 'Spending over time' }) {
  const [range, setRange] = useState('30d');
  const { start, end } = rangeDates(range);
  const { data, error, reload } = useApiData(() => getSpendingTrend(start, end), [start, end, dataVersion]);

  return (
    <section className="card chart-card">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        <label className="select-compact">
          <span className="sr-only">Chart period</span>
          <select className="input input-sm" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>
      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <LoadingState label="Loading chart…" />
      ) : (
        <ChartBody trend={data} />
      )}
    </section>
  );
}

function ChartBody({ trend }) {
  const [containerRef, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const points = trend.points.map((p) => ({ period: p.period, total: Number(p.total) }));
  const sum = points.reduce((acc, p) => acc + p.total, 0);
  const monthly = trend.granularity === 'month';
  const labelFor = (period) => (monthly ? formatMonth(period) : formatShortDate(period));

  if (sum === 0) {
    return (
      <EmptyState
        icon="chart"
        title="No spending in this period"
        message="Expenses you record in this date range will be charted here."
      />
    );
  }

  const height = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 56 };
  const innerW = Math.max(width - pad.left - pad.right, 10);
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...points.map((p) => p.total)));
  const n = points.length;
  const x = (i) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelCount = Math.min(n, width < 480 ? 4 : 6);
  const xTicks = [...new Set(Array.from({ length: labelCount }, (_, k) => Math.round((k * (n - 1)) / Math.max(labelCount - 1, 1))))];

  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = (event.clientX - rect.left - pad.left) / innerW;
    setHover(Math.min(n - 1, Math.max(0, Math.round(relative * (n - 1)))));
  }

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div className="chart" ref={containerRef}>
      <p className="chart-total">
        <span className="chart-total-value">{formatMoney(sum)}</span>
        <span className="chart-total-label">
          {formatDate(trend.startDate)} – {formatDate(trend.endDate)} · {monthly ? 'monthly' : 'daily'} totals
        </span>
      </p>
      <div className="chart-plot">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Spending chart: ${formatMoney(sum)} in total between ${formatDate(trend.startDate)} and ${formatDate(trend.endDate)}.`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={pad.left - 10} y={y(t)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
                {compactMoney(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={height - 8} className="chart-axis" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {labelFor(points[i].period)}
            </text>
          ))}
          <path d={area} fill="url(#chart-fill)" />
          <path d={line} className="chart-line" />
          {hovered && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} className="chart-cursor" />
              <circle cx={x(hover)} cy={y(hovered.total)} r="4.5" className="chart-dot" />
            </g>
          )}
        </svg>
      )}
      {hovered && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: y(hovered.total) - 12 }}
        >
          <strong>{formatMoney(hovered.total)}</strong>
          <span>{monthly ? formatMonth(hovered.period) : formatDate(hovered.period)}</span>
        </div>
      )}
      </div>
    </div>
  );
}
