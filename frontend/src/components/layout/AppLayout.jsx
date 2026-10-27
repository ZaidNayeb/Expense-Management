import { useCallback, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Icon, { Logo } from '../common/Icon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useExpenseEditor } from '../../hooks/useExpenseEditor.jsx';
import { initials } from '../../utils/format.js';

const NAV = {
  user: [
    { to: '/dashboard', label: 'Home', icon: 'home' },
    { action: 'add', label: 'Add expense', icon: 'plusCircle' },
    { to: '/expenses', label: 'My expenses', shortLabel: 'Expenses', icon: 'receipt' },
    { to: '/profile', label: 'Profile', icon: 'user' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
    { to: '/admin/expenses', label: 'Expenses', icon: 'receipt' },
    { to: '/admin/users', label: 'Users', icon: 'users' },
  ],
};

// Shell for both interfaces. Pages receive `dataVersion` through the outlet context and
// reload when it changes, so an expense added from the sidebar refreshes the open page.
export default function AppLayout({ role }) {
  const { user, logout } = useAuth();
  const [dataVersion, setDataVersion] = useState(0);
  const notifyDataChanged = useCallback(() => setDataVersion((v) => v + 1), []);
  const editor = useExpenseEditor(notifyDataChanged);
  const items = NAV[role];

  const renderItem = (item, variant) => {
    const content = (
      <>
        <Icon name={item.icon} size={variant === 'tab' ? 22 : 19} />
        <span>{variant === 'tab' ? item.shortLabel || item.label.replace('Add expense', 'Add') : item.label}</span>
      </>
    );
    const className = variant === 'tab' ? 'tab-item' : 'nav-item';
    if (item.action === 'add') {
      return (
        <button key="add" type="button" className={className} onClick={editor.openCreate}>
          {content}
        </button>
      );
    }
    return (
      <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${className}${isActive ? ' active' : ''}`}>
        {content}
      </NavLink>
    );
  };

  return (
    <div className={`app-shell app-shell-${role}`}>
      <a href="#main" className="skip-link">Skip to content</a>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          {role === 'admin' && <span className="role-pill">Admin</span>}
        </div>
        <nav className="sidebar-nav" aria-label="Main">{items.map((item) => renderItem(item, 'nav'))}</nav>
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
          <div className="sidebar-user">
            <span className="sidebar-user-name truncate">{user.name}</span>
            <span className="sidebar-user-email truncate">{user.email}</span>
          </div>
          <button type="button" className="icon-button" onClick={logout} aria-label="Log out" title="Log out">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>

      <header className="topbar">
        <Logo />
        <div className="topbar-actions">
          {role === 'admin' && <span className="role-pill">Admin</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            <Icon name="logout" size={17} /> Log out
          </button>
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <Outlet context={{ dataVersion, notifyDataChanged, openAddExpense: editor.openCreate }} />
      </main>

      <nav className="tabbar" aria-label="Main">{items.map((item) => renderItem(item, 'tab'))}</nav>
      {editor.dialogs}
    </div>
  );
}
