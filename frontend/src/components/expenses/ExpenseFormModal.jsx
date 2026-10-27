import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import FormField from '../common/FormField.jsx';
import { createExpense, updateExpense } from '../../services/expenseService.js';
import { currencySymbol, todayISO } from '../../utils/format.js';
import { validateExpenseForm } from '../../utils/validation.js';

// Add and edit share this form. Admins also choose the owner.
export default function ExpenseFormModal({ expense, isAdmin, users = [], defaultOwnerId, onClose, onSaved }) {
  const editing = Boolean(expense);
  const [values, setValues] = useState({
    name: expense?.name ?? '',
    amount: expense?.amount ?? '',
    date: expense?.date ?? todayISO(),
    userId: String(expense?.userId ?? defaultOwnerId ?? ''),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return; // guard against double submission
    const clientErrors = validateExpenseForm(values, { requireOwner: isAdmin });
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length) return;

    const payload = { name: values.name.trim(), amount: values.amount.trim(), date: values.date };
    if (isAdmin) payload.userId = Number(values.userId);

    setSaving(true);
    try {
      const saved = editing ? await updateExpense(expense.id, payload) : await createExpense(payload);
      onSaved(saved, editing);
    } catch (err) {
      setSaving(false);
      if (err.status === 401) return onClose(); // session expired; the app redirects to login
      setErrors(err.fields || {});
      setFormError(
        err.status === 404 ? 'This expense no longer exists. It may have been deleted.' : err.message,
      );
    }
  }

  return (
    <Modal
      title={editing ? 'Edit expense' : 'Add expense'}
      description={editing ? 'Update the details of this expense.' : 'Record a new expense.'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="expense-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
          </button>
        </>
      }
    >
      <form id="expense-form" className="form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}

        <FormField label="Expense name" error={errors.name}>
          {(props) => (
            <input {...props} type="text" value={values.name} onChange={set('name')} maxLength={100} placeholder="e.g. Groceries" autoComplete="off" />
          )}
        </FormField>

        <div className="form-row">
          <FormField label="Amount" error={errors.amount}>
            {(props) => (
              <div className="input-affix">
                <span className="input-prefix" aria-hidden="true">{currencySymbol}</span>
                <input {...props} type="text" inputMode="decimal" value={values.amount} onChange={set('amount')} placeholder="0.00" autoComplete="off" />
              </div>
            )}
          </FormField>
          <FormField label="Date" error={errors.date}>
            {(props) => <input {...props} type="date" value={values.date} onChange={set('date')} min="1900-01-01" max="2999-12-31" />}
          </FormField>
        </div>

        {isAdmin && (
          <FormField label="Owner" error={errors.userId}>
            {(props) => (
              <select {...props} value={values.userId} onChange={set('userId')}>
                <option value="">Select a user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            )}
          </FormField>
        )}
      </form>
    </Modal>
  );
}
