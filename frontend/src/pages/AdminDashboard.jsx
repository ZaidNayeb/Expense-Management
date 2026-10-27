import { Link, useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon.jsx';
import SummaryCard from '../components/common/SummaryCard.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import RecentExpenses from '../components/dashboard/RecentExpenses.jsx';
import SpendingChart from '../components/dashboard/SpendingChart.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { useExpenseEditor } from '../hooks/useExpenseEditor.jsx';
import { getRecentExpenses, getSummary } from '../services/dashboardService.js';
import { formatMoney } from '../utils/format.js';

export default function AdminDashboard() {
  const { dataVersion, notifyDataChanged } = useOutletContext();
  const summary = useApiData(getSummary, [dataVersion]);
  const recent = useApiData(getRecentExpenses, [dataVersion]);
  const editor = useExpenseEditor(notifyDataChanged);
  const s = summary.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of expenses across all users."
        actions={
          <>
            <Link to="/admin/users" className="btn btn-secondary">
              <Icon name="users" size={17} /> Manage users
            </Link>
            <button type="button" className="btn btn-primary" onClick={editor.openCreate}>
              <Icon name="plus" size={17} /> Add expense
            </button>
          </>
        }
      />
      {summary.error && (
        <div className="alert alert-error" role="alert">
          Couldn’t load the totals: {summary.error.message}{' '}
          <button type="button" className="link-button" onClick={summary.reload}>Retry</button>
        </div>
      )}
      <div className="summary-grid">
        <SummaryCard icon="wallet" label="Total amount" value={s && formatMoney(s.totalAmount)} hint="All recorded expenses" loading={!s} />
        <SummaryCard icon="receipt" label="Total expenses" value={s?.expenseCount.toLocaleString()} hint="Across all users" loading={!s} />
        <SummaryCard icon="users" label="Registered users" value={s?.userCount.toLocaleString()} hint="Including administrators" loading={!s} />
      </div>
      <div className="dashboard-grid">
        <SpendingChart dataVersion={dataVersion} title="Spending over time (all users)" />
        <RecentExpenses
          state={recent}
          viewAllTo="/admin/expenses"
          showOwner
          onEdit={editor.openEdit}
          onDelete={editor.requestDelete}
        />
      </div>
      {editor.dialogs}
    </>
  );
}
