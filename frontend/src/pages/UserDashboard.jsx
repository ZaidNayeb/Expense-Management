import { useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon.jsx';
import SummaryCard from '../components/common/SummaryCard.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import RecentExpenses from '../components/dashboard/RecentExpenses.jsx';
import SpendingChart from '../components/dashboard/SpendingChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { useExpenseEditor } from '../hooks/useExpenseEditor.jsx';
import { getRecentExpenses, getSummary } from '../services/dashboardService.js';
import { formatMoney, greeting } from '../utils/format.js';

export default function UserDashboard() {
  const { user } = useAuth();
  const { dataVersion, notifyDataChanged, openAddExpense } = useOutletContext();
  const summary = useApiData(getSummary, [dataVersion]);
  const recent = useApiData(getRecentExpenses, [dataVersion]);
  const editor = useExpenseEditor(notifyDataChanged);
  const s = summary.data;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}!`}
        subtitle="Here’s an overview of your spending."
        actions={
          <button type="button" className="btn btn-primary" onClick={openAddExpense}>
            <Icon name="plus" size={17} /> Add expense
          </button>
        }
      />
      {summary.error && (
        <div className="alert alert-error" role="alert">
          Couldn’t load your totals: {summary.error.message}{' '}
          <button type="button" className="link-button" onClick={summary.reload}>Retry</button>
        </div>
      )}
      <div className="summary-grid">
        <SummaryCard icon="wallet" label="Total spent" value={s && formatMoney(s.totalAmount)} hint="All time" loading={!s} />
        <SummaryCard icon="receipt" label="Expenses" value={s?.expenseCount.toLocaleString()} hint="Recorded in total" loading={!s} />
        <SummaryCard icon="gauge" label="Average expense" value={s && formatMoney(s.averageAmount)} hint="Per expense" loading={!s} />
      </div>
      <div className="dashboard-grid">
        <RecentExpenses
          state={recent}
          viewAllTo="/expenses"
          onEdit={editor.openEdit}
          onDelete={editor.requestDelete}
          onAdd={openAddExpense}
        />
        <SpendingChart dataVersion={dataVersion} />
      </div>
      {editor.dialogs}
    </>
  );
}
