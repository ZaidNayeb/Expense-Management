import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon.jsx';
import { formatDate } from '../../utils/format.js';

// Toolbar: search on the left, a Filters popover (date range, and owner for admins)
// and the primary action on the right. Active filters show as removable chips.
export default function ExpenseFilters({ filters, onChange, users, showOwnerFilter, action }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (!popoverRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const update = (patch) => onChange({ ...filters, ...patch });
  const owner = users.find((u) => String(u.id) === String(filters.userId));
  const dateInvalid = filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  const chips = [];
  if (filters.startDate || filters.endDate) {
    const label =
      filters.startDate && filters.endDate
        ? `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`
        : filters.startDate
          ? `From ${formatDate(filters.startDate)}`
          : `Until ${formatDate(filters.endDate)}`;
    chips.push({ key: 'date', label, clear: { startDate: '', endDate: '' } });
  }
  if (showOwnerFilter && filters.userId) {
    chips.push({ key: 'owner', label: `Owner: ${owner?.name ?? 'Selected user'}`, clear: { userId: '' } });
  }

  return (
    <div className="toolbar-block">
      <div className="toolbar">
        <label className="search-box">
          <Icon name="search" size={17} />
          <span className="sr-only">Search expenses by name</span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search by name…"
            maxLength={100}
          />
        </label>

        <div className="toolbar-actions">
          <div className="popover-anchor">
            <button
              ref={buttonRef}
              type="button"
              className={`btn btn-secondary${chips.length ? ' btn-active' : ''}`}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="dialog"
            >
              <Icon name="filter" size={17} />
              Filters
              {chips.length > 0 && <span className="badge">{chips.length}</span>}
            </button>

            {open && (
              <div ref={popoverRef} className="popover" role="dialog" aria-label="Filter expenses">
                <fieldset className="popover-section">
                  <legend className="field-label">Date range</legend>
                  <div className="form-row">
                    <label className="field">
                      <span className="field-hint">From</span>
                      <input
                        className="input"
                        type="date"
                        value={filters.startDate}
                        max={filters.endDate || undefined}
                        onChange={(e) => update({ startDate: e.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span className="field-hint">To</span>
                      <input
                        className="input"
                        type="date"
                        value={filters.endDate}
                        min={filters.startDate || undefined}
                        onChange={(e) => update({ endDate: e.target.value })}
                      />
                    </label>
                  </div>
                  {dateInvalid && <p className="field-error">The start date must be on or before the end date.</p>}
                </fieldset>

                {showOwnerFilter && (
                  <label className="field popover-section">
                    <span className="field-label">Owner</span>
                    <select className="input" value={filters.userId} onChange={(e) => update({ userId: e.target.value })}>
                      <option value="">All users</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="popover-footer">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => update({ startDate: '', endDate: '', userId: '' })}
                    disabled={!chips.length}
                  >
                    Clear filters
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          {action}
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="chip-list" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key} className="chip">
              {chip.label}
              <button type="button" onClick={() => update(chip.clear)} aria-label={`Remove filter: ${chip.label}`}>
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
