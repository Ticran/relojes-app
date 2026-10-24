// Contexto global para notificaciones Toast reutilizables.
// Centraliza el estado y las funciones delegando en useToast.
import { createContext } from 'react';
import useToast from '../hooks/useToast.js';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
  );
}
