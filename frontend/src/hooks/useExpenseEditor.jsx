import { useState } from 'react';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { deleteExpense } from '../services/expenseService.js';
import { formatMoney } from '../utils/format.js';
import { useUserOptions } from './useUserOptions.js';

// Shared add / edit / delete flow. Render `dialogs` somewhere in the component;
// `onChanged` runs after any successful change so callers can refresh their data.
export function useExpenseEditor(onChanged) {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [editing, setEditing] = useState(null); // null | 'new' | expense
  const [deleting, setDeleting] = useState(null);
  const users = useUserOptions(isAdmin && editing !== null);

  function handleSaved(_saved, wasEdit) {
    setEditing(null);
    toast.success(wasEdit ? 'Expense updated.' : 'Expense added.');
    onChanged();
  }

  async function handleDelete() {
    try {
      await deleteExpense(deleting.id);
      toast.success('Expense deleted.');
    } catch (err) {
      if (err.status === 404) toast.error('This expense was already deleted.');
      else if (err.status !== 401) {
        toast.error(err.message);
        return; // keep the dialog open so the user can retry
      }
    }
    setDeleting(null);
    onChanged();
  }

  const dialogs = (
    <>
      {editing !== null && (
        <ExpenseFormModal
          expense={editing === 'new' ? null : editing}
          isAdmin={isAdmin}
          users={users}
          defaultOwnerId={isAdmin ? user.id : undefined}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete expense?"
          message={
            <>
              <strong>{deleting.name}</strong> ({formatMoney(deleting.amount)}) will be permanently deleted. This cannot be undone.
            </>
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );

  return {
    openCreate: () => setEditing('new'),
    openEdit: (expense) => setEditing(expense),
    requestDelete: (expense) => setDeleting(expense),
    dialogs,
  };
}
