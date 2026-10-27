import Icon from '../common/Icon.jsx';
import { formatDate, formatMoney, initials } from '../../utils/format.js';

// On narrow screens the table collapses into stacked rows (see .data-table in CSS).
export default function ExpenseTable({ expenses, showOwner = false, onEdit, onDelete, caption = 'Expenses' }) {
  const hasActions = Boolean(onEdit || onDelete);
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col" className="num">Amount</th>
            <th scope="col">Date</th>
            {showOwner && <th scope="col">Owner</th>}
            {hasActions && <th scope="col" className="actions-col"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td className="cell-name">
                <span className="row-icon" aria-hidden="true"><Icon name="receipt" size={16} /></span>
                <span className="truncate">{expense.name}</span>
              </td>
              <td className="num cell-amount">{formatMoney(expense.amount)}</td>
              <td className="cell-date">{formatDate(expense.date)}</td>
              {showOwner && (
                <td className="cell-owner">
                  <span className="avatar avatar-xs" aria-hidden="true">{initials(expense.ownerName)}</span>
                  <span className="truncate">{expense.ownerName}</span>
                </td>
              )}
              {hasActions && (
                <td className="actions-col">
                  <div className="row-actions">
                    {onEdit && (
                      <button type="button" className="icon-button" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.name}`} title="Edit">
                        <Icon name="edit" size={17} />
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" className="icon-button icon-button-danger" onClick={() => onDelete(expense)} aria-label={`Delete ${expense.name}`} title="Delete">
                        <Icon name="trash" size={17} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
