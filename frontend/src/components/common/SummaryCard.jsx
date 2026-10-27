import Icon from './Icon.jsx';

export default function SummaryCard({ icon, label, value, hint, loading }) {
  return (
    <div className="card summary-card">
      <span className="summary-icon"><Icon name={icon} size={22} /></span>
      <div className="summary-body">
        <p className="summary-label">{label}</p>
        <p className="summary-value">{loading ? <span className="skeleton skeleton-value" /> : value}</p>
        {hint && <p className="summary-hint">{hint}</p>}
      </div>
    </div>
  );
}
