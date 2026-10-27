import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Icon from '../components/common/Icon.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import UserFormModal from '../components/users/UserFormModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { deleteUser, listUsers } from '../services/userService.js';
import { formatDate, initials } from '../utils/format.js';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { dataVersion, notifyDataChanged } = useOutletContext();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const search = useDebouncedValue(searchInput.trim(), 300);

  const { data, loading, error, reload } = useApiData(async () => {
    const result = await listUsers({ page, limit: 10, search });
    const { totalPages } = result.pagination;
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
    return result;
  }, [page, search, dataVersion]);

  const users = data?.data ?? [];

  async function handleDelete() {
    try {
      const result = await deleteUser(deleting.id);
      const count = result.deletedExpenses;
      toast.success(`${deleting.name} was deleted${count ? ` along with ${count} expense${count === 1 ? '' : 's'}` : ''}.`);
    } catch (err) {
      if (err.status === 404) toast.error('This user was already deleted.');
      else if (err.status !== 401) {
        toast.error(err.message);
        setDeleting(null);
        return;
      }
    }
    setDeleting(null);
    notifyDataChanged();
  }

  let content;
  if (error && !data) content = <ErrorState error={error} onRetry={reload} />;
  else if (!data) content = <LoadingState label="Loading users…" />;
  else if (users.length === 0) {
    content = <EmptyState icon="users" title="No matching users" message="Try a different name or email." />;
  } else {
    content = (
      <>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Registered users</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Created</th>
                <th scope="col" className="actions-col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id}>
                    <td className="cell-name">
                      <span className="avatar avatar-sm" aria-hidden="true">{initials(u.name)}</span>
                      <span className="truncate">{u.name}{isSelf && <span className="muted"> (you)</span>}</span>
                    </td>
                    <td className="cell-email truncate">{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role === 'admin' ? 'Admin' : 'User'}</span></td>
                    <td className="cell-date">{formatDate(u.createdAt)}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button icon-button-danger"
                          onClick={() => setDeleting(u)}
                          disabled={isSelf}
                          aria-label={isSelf ? 'You cannot delete your own account' : `Delete ${u.name}`}
                          title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination pagination={data.pagination} onPageChange={setPage} itemLabel="users" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who can sign in to ExpensePro." />
      <div className="toolbar-block">
        <div className="toolbar">
          <label className="search-box">
            <Icon name="search" size={17} />
            <span className="sr-only">Search users by name or email</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email…"
              maxLength={100}
            />
          </label>
          <div className="toolbar-actions">
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <Icon name="plus" size={17} /> <span>Create user</span>
            </button>
          </div>
        </div>
      </div>
      <section className={`card card-flush${loading && data ? ' is-refreshing' : ''}`} aria-busy={loading}>
        {content}
      </section>

      {creating && (
        <UserFormModal
          onClose={() => setCreating(false)}
          onCreated={(u) => {
            setCreating(false);
            toast.success(`Account created for ${u.name}.`);
            notifyDataChanged();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete user?"
          message={
            <>
              <strong>{deleting.name}</strong> ({deleting.email}) and <strong>all of their expenses</strong> will be
              permanently deleted. This cannot be undone.
            </>
          }
          confirmLabel="Delete user"
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
