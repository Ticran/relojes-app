// Hook para administrar notificaciones Toast reutilizables.
// Independiente de la interfaz visual: solo gestiona estado y temporizadores.
import { useCallback, useEffect, useRef, useState } from "react";

const SUCCESS_TIMEOUT = 4000;
const ERROR_TIMEOUT = 5000;

let counter = 0;
function nextId() {
  counter += 1;
  return `toast-${Date.now()}-${counter}`;
}

export default function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const show = useCallback(
    (type, message) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, type, message }]);
      const timeout = type === "error" ? ERROR_TIMEOUT : SUCCESS_TIMEOUT;
      timersRef.current[id] = setTimeout(() => {
        dismiss(id);
      }, timeout);
      return id;
    },
    [dismiss],
  );

  const success = useCallback((message) => show("success", message), [show]);
  const error = useCallback((message) => show("error", message), [show]);

  // Limpieza de todos los temporizadores al desmontar.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  return { toasts, success, error, dismiss };
}
