import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/common/Icon.jsx';
import FormField from '../components/common/FormField.jsx';
import { homePathFor, useAuth } from '../context/AuthContext.jsx';
import { validateLoginForm } from '../utils/validation.js';

export default function Login() {
  const { user, login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const clientErrors = validateLoginForm(values);
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const signedIn = await login(values.email.trim(), values.password);
      // Return to the page that required sign-in, if it belongs to this role's interface.
      const from = location.state?.from;
      const home = homePathFor(signedIn);
      const allowed = from && (signedIn.role === 'admin' ? from.startsWith('/admin') : !from.startsWith('/admin'));
      navigate(allowed ? from : home, { replace: true });
    } catch (err) {
      setSubmitting(false);
      setErrors(err.fields || {});
      setFormError(err.message);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-brand"><Logo /></div>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Welcome back. Enter your details to continue.</p>

        {sessionExpired && !formError && (
          <div className="alert alert-info" role="status">Your session has expired. Please sign in again.</div>
        )}
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <FormField label="Email" error={errors.email}>
            {(props) => (
              <input {...props} type="email" value={values.email} onChange={set('email')} autoComplete="username" autoFocus placeholder="you@example.com" />
            )}
          </FormField>
          <FormField label="Password" error={errors.password}>
            {(props) => (
              <input {...props} type="password" value={values.password} onChange={set('password')} autoComplete="current-password" />
            )}
          </FormField>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footnote">Accounts are created by an administrator.</p>
      </div>
    </div>
  );
}
