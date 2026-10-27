import Icon from './Icon.jsx';

export default function Pagination({ pagination, onPageChange, itemLabel = 'items', itemLabelSingular }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, limit, total, totalPages } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-info">
        Showing {from}–{to} of {total} {total === 1 ? itemLabelSingular || itemLabel.replace(/s$/, '') : itemLabel}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <Icon name="chevronLeft" size={16} /> Previous
        </button>
        <span className="pagination-page" aria-current="page">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </nav>
  );
}
