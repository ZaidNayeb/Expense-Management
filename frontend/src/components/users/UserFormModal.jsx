import { useState } from 'react';
import Modal from '../common/Modal.jsx';
import FormField from '../common/FormField.jsx';
import { createUser } from '../../services/userService.js';
import { validateUserForm } from '../../utils/validation.js';

export default function UserFormModal({ onClose, onCreated }) {
  const [values, setValues] = useState({ name: '', email: '', password: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const clientErrors = validateUserForm(values);
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length) return;

    setSaving(true);
    try {
      const user = await createUser({ ...values, name: values.name.trim(), email: values.email.trim() });
      onCreated(user);
    } catch (err) {
      setSaving(false);
      if (err.status === 401) return onClose();
      setErrors(err.fields || {});
      setFormError(err.fields ? '' : err.message);
    }
  }

  return (
    <Modal
      title="Create user"
      description="The person can sign in with this email and initial password."
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </>
      }
    >
      <form id="user-form" className="form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="alert alert-error" role="alert">{formError}</div>}
        <FormField label="Full name" error={errors.name}>
          {(props) => <input {...props} type="text" value={values.name} onChange={set('name')} maxLength={100} autoComplete="off" />}
        </FormField>
        <FormField label="Email" error={errors.email}>
          {(props) => <input {...props} type="email" value={values.email} onChange={set('email')} autoComplete="off" />}
        </FormField>
        <FormField label="Initial password" error={errors.password} hint="At least 8 characters. Share it with the user securely.">
          {(props) => <input {...props} type="password" value={values.password} onChange={set('password')} autoComplete="new-password" />}
        </FormField>
        <FormField label="Role" error={errors.role}>
          {(props) => (
            <select {...props} value={values.role} onChange={set('role')}>
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </select>
          )}
        </FormField>
      </form>
    </Modal>
  );
}
