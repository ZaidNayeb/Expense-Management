import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import RequireRole from './components/layout/RequireRole.jsx';
import { ErrorState, LoadingState } from './components/common/States.jsx';
import { homePathFor, useAuth } from './context/AuthContext.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminExpenses from './pages/AdminExpenses.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import Login from './pages/Login.jsx';
import MyExpenses from './pages/MyExpenses.jsx';
import Profile from './pages/Profile.jsx';
import UserDashboard from './pages/UserDashboard.jsx';

export default function App() {
  const { user, loading, loadError, refresh } = useAuth();

  if (loading) {
    return <div className="fullscreen-center"><LoadingState /></div>;
  }
  if (loadError) {
    return <div className="fullscreen-center"><ErrorState error={loadError} onRetry={refresh} /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireRole role="user"><AppLayout role="user" /></RequireRole>}>
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/expenses" element={<MyExpenses />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="admin"><AppLayout role="admin" /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? homePathFor(user) : '/login'} replace />} />
    </Routes>
  );
}
