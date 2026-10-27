import Icon from './Icon.jsx';

export function Spinner({ label = 'Loading' }) {
  return <span className="spinner" role="status" aria-label={label} />;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state-block">
      <Spinner label={label} />
      <span className="state-text">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'receipt', title, message, action }) {
  return (
    <div className="state-block">
      <span className="state-icon"><Icon name={icon} size={22} /></span>
      <p className="state-title">{title}</p>
      {message && <p className="state-text">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-block" role="alert">
      <span className="state-icon state-icon-error"><Icon name="alert" size={22} /></span>
      <p className="state-title">Couldn’t load this data</p>
      <p className="state-text">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
