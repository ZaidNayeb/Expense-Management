import { Link } from 'react-router-dom';
import ExpenseTable from '../expenses/ExpenseTable.jsx';
import Icon from '../common/Icon.jsx';
import { EmptyState, ErrorState, LoadingState } from '../common/States.jsx';

export default function RecentExpenses({ state, viewAllTo, showOwner, onEdit, onDelete, onAdd }) {
  const { data, error, reload } = state;
  return (
    <section className="card card-flush">
      <div className="card-header card-header-padded">
        <h2 className="card-title">Recent expenses</h2>
        <Link to={viewAllTo} className="link">
          View all <Icon name="arrowRight" size={15} />
        </Link>
      </div>
      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <LoadingState label="Loading recent expenses…" />
      ) : data.length === 0 ? (
        <EmptyState
          title="No expenses yet"
          message="Recent expenses will show up here."
          action={
            onAdd && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
                <Icon name="plus" size={16} /> Add expense
              </button>
            )
          }
        />
      ) : (
        <ExpenseTable expenses={data} showOwner={showOwner} onEdit={onEdit} onDelete={onDelete} caption="Recent expenses" />
      )}
    </section>
  );
}
