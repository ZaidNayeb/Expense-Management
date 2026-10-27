import ExpenseListView from '../components/expenses/ExpenseListView.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';

export default function AdminExpenses() {
  return (
    <>
      <PageHeader title="All expenses" subtitle="Expenses recorded by every user." />
      <ExpenseListView isAdmin />
    </>
  );
}
