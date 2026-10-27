import { Navigate, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from '../../context/AuthContext.jsx';

// Route guard for the UI only. The API enforces every permission independently,
// so editing browser state cannot grant access to anything.
export default function RequireRole({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return children;
}
