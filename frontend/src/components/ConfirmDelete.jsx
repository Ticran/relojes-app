import { useEffect } from 'react';

function ConfirmDelete({ product, onConfirm, onClose }) {
  // Cierre con la tecla Escape, igual que en ProductForm.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="modal__panel modal__panel--small card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-title">Eliminar producto</h2>
        <p id="delete-description">
          ¿Eliminar <strong>“{product.name}”</strong> del inventario? Esta acción
          no se puede deshacer.
        </p>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDelete;
