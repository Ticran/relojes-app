// Componente de presentación de una notificación flotante (Toast).
// No administra estado ni temporizadores: el padre controla cuándo se monta/desmonta.
import { useEffect } from 'react';

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 10.5l2.5 2.5L14 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 7l6 6M13 7l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export default function Toast({ type = 'success', message, onClose }) {
  const isSuccess = type === 'success';
  const role = isSuccess ? 'status' : 'alert';
  const ariaLive = isSuccess ? 'polite' : 'assertive';

  useEffect(() => {
    if (!onClose) return undefined;
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!message) return null;

  return (
    <div
      className={`toast toast--${isSuccess ? 'success' : 'error'}`}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <span className="toast__icon">{ICONS[isSuccess ? 'success' : 'error']}</span>
      <p className="toast__message">{message}</p>
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
}
