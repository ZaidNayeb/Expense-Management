import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';

// Accessible dialog: focuses the first field, closes on Escape / backdrop, keeps Tab inside.
export default function Modal({ title, description, onClose, children, footer, size = 'md', busy = false }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = busy ? () => {} : onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog.querySelector('input, select, textarea, button:not(.modal-close)');
    (first || dialog).focus();
    document.body.classList.add('no-scroll');

    function onKeyDown(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button, [href], input, select, textarea')].filter(
        (el) => !el.disabled,
      );
      if (!focusable.length) return;
      const [firstEl, lastEl] = [focusable[0], focusable.at(-1)];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('no-scroll');
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div
        ref={dialogRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <h2 id={titleId} className="modal-title">{title}</h2>
            {description && <p id={descriptionId} className="modal-description">{description}</p>}
          </div>
          <button type="button" className="icon-button modal-close" onClick={() => closeRef.current()} aria-label="Close" disabled={busy}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
