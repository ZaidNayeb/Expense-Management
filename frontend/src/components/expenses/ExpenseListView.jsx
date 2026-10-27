import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ExpenseFilters from './ExpenseFilters.jsx';
import ExpenseTable from './ExpenseTable.jsx';
import Icon from '../common/Icon.jsx';
import Pagination from '../common/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../common/States.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useExpenseEditor } from '../../hooks/useExpenseEditor.jsx';
import { useUserOptions } from '../../hooks/useUserOptions.js';
import { listExpenses } from '../../services/expenseService.js';

const PAGE_SIZE = 10;
const EMPTY_FILTERS = { search: '', startDate: '', endDate: '', userId: '' };

// The full expense list used by both "My expenses" and the admin "All expenses" page.
// Searching, filtering and pagination all happen on the server.
export default function ExpenseListView({ isAdmin }) {
  const { dataVersion, notifyDataChanged } = useOutletContext();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search.trim(), 300);
  const users = useUserOptions(isAdmin);
  const editor = useExpenseEditor(notifyDataChanged);

  const datesValid = !(filters.startDate && filters.endDate && filters.startDate > filters.endDate);
  const query = {
    page,
    limit: PAGE_SIZE,
    search,
    startDate: datesValid ? filters.startDate : '',
    endDate: datesValid ? filters.endDate : '',
    userId: isAdmin ? filters.userId : '',
  };

  const { data, loading, error, reload } = useApiData(
    async () => {
      const result = await listExpenses(query);
      // If the current page no longer exists (e.g. after deleting its last row), go back.
      const { totalPages } = result.pagination;
      if (totalPages > 0 && page > totalPages) setPage(totalPages);
      return result;
    },
    [page, search, query.startDate, query.endDate, query.userId, dataVersion],
  );

  function handleFiltersChange(next) {
    setFilters(next);
    setPage(1); // any change to search or filters starts from the first page
  }

  const hasFilters = Boolean(search || query.startDate || query.endDate || query.userId);
  const expenses = data?.data ?? [];

  let content;
  if (error && !data) content = <ErrorState error={error} onRetry={reload} />;
  else if (!data) content = <LoadingState label="Loading expenses…" />;
  else if (expenses.length === 0) {
    content = hasFilters ? (
      <EmptyState
        icon="search"
        title="No matching expenses"
        message="Try a different search term or adjust the filters."
        action={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleFiltersChange(EMPTY_FILTERS)}>
            Clear search and filters
          </button>
        }
      />
    ) : (
      <EmptyState
        title="No expenses yet"
        message={isAdmin ? 'Expenses recorded by any user will appear here.' : 'Add your first expense to start tracking your spending.'}
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={editor.openCreate}>
            <Icon name="plus" size={16} /> Add expense
          </button>
        }
      />
    );
  } else {
    content = (
      <>
        <ExpenseTable
          expenses={expenses}
          showOwner={isAdmin}
          onEdit={editor.openEdit}
          onDelete={editor.requestDelete}
          caption={isAdmin ? 'All expenses' : 'My expenses'}
        />
        <Pagination pagination={data.pagination} onPageChange={setPage} itemLabel="expenses" />
      </>
    );
  }

  return (
    <>
      <ExpenseFilters
        filters={filters}
        onChange={handleFiltersChange}
        users={users}
        showOwnerFilter={isAdmin}
        action={
          <button type="button" className="btn btn-primary" onClick={editor.openCreate}>
            <Icon name="plus" size={17} /> <span>Add expense</span>
          </button>
        }
      />
      <section className={`card card-flush${loading && data ? ' is-refreshing' : ''}`} aria-busy={loading}>
        {error && data && (
          <div className="alert alert-error alert-inline" role="alert">
            {error.message}{' '}
            <button type="button" className="link-button" onClick={reload}>Retry</button>
          </div>
        )}
        {content}
      </section>
      {editor.dialogs}
    </>
  );
}
