// Contenedor visual de notificaciones flotantes.
// Solo presentación: no gestiona estado ni temporizadores.
import Toast from './Toast.jsx';

export default function ToastContainer({ toasts = [], dismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => dismiss?.(toast.id)}
        />
      ))}
    </div>
  );
}
