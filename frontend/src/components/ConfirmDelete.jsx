import { useEffect, useRef, useState } from "react";

function ConfirmDelete({ product, movementCount = 0, onConfirm, onClose }) {
  const [isDeleting, setIsDeleting] = useState(false);
  // Guard síncrono: evita confirmaciones repetidas antes del siguiente render.
  const deletingRef = useRef(false);

  async function handleConfirm() {
    if (deletingRef.current || isDeleting) return;
    deletingRef.current = true;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      // En éxito el diálogo se desmonta; si hubo excepción, este finally
      // reactiva el botón y el usuario puede reintentar.
      deletingRef.current = false;
      setIsDeleting(false);
    }
  }

  // Cierre con la tecla Escape, igual que en ProductForm.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="modal__panel modal__panel--small card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby={
          movementCount > 0
            ? "delete-description delete-warning"
            : "delete-description"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-title">Eliminar producto</h2>
        <p id="delete-description">
          ¿Eliminar <strong>“{product.name}”</strong> del inventario? Esta
          acción no se puede deshacer.
        </p>
        {movementCount > 0 && (
          <p id="delete-warning" className="modal__warning">
            <svg
              className="modal__warning-icon"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M10 2.5 18 17H2L10 2.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M10 7v4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="10" cy="14.2" r="0.7" fill="currentColor" />
            </svg>
            <span>
              {`Este producto tiene ${movementCount === 1 ? "1 movimiento registrado" : `${movementCount} movimientos registrados`} en el historial. Al eliminarlo, esos movimientos se conservarán y aparecerán en el historial como de un producto eliminado.`}
            </span>
          </p>
        )}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDelete;
