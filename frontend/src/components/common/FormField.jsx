import { useId } from 'react';

// Label + control + error message, wired together for screen readers.
// `children` is a render function receiving the props the control needs.
export default function FormField({ label, error, hint, children }) {
  const id = useId();
  const messageId = `${id}-message`;
  const controlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? messageId : undefined,
    className: `input${error ? ' input-error' : ''}`,
  };
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">{label}</label>
      {children(controlProps)}
      {error ? (
        <p id={messageId} className="field-error">{error}</p>
      ) : (
        hint && <p id={messageId} className="field-hint">{hint}</p>
      )}
    </div>
  );
}
