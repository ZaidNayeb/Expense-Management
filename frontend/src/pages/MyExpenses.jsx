import ExpenseListView from '../components/expenses/ExpenseListView.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';

export default function MyExpenses() {
  return (
    <>
      <PageHeader title="My expenses" subtitle="Search, filter and manage everything you’ve recorded." />
      <ExpenseListView isAdmin={false} />
    </>
  );
}
