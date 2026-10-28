// Modal para registrar una entrada o salida de stock.
// Valida en el cliente; el hook `adjustStock` vuelve a validar y
// devuelve { ok, error } como fuente final de verdad.
import { useEffect, useRef, useState } from "react";

function validate(values, currentStock) {
  const errors = {};
  if (values.type !== "entrada" && values.type !== "salida") {
    errors.type = "Elegí un tipo de movimiento válido.";
  }
  const quantityText = values.quantity.trim();
  const quantity = Number(quantityText);
  if (quantityText === "" || Number.isNaN(quantity)) {
    errors.quantity = "La cantidad debe ser un número.";
  } else if (!Number.isInteger(quantity)) {
    errors.quantity = "La cantidad debe ser un número entero.";
  } else if (quantity <= 0) {
    errors.quantity = "La cantidad debe ser mayor que cero.";
  } else if (values.type === "salida" && quantity > currentStock) {
    errors.quantity = `No hay stock suficiente. Disponible: ${currentStock}.`;
  }
  return { errors, quantity };
}

function StockMovementForm({ product, onSubmit, onClose }) {
  const [type, setType] = useState("entrada");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Guard síncrono: evita reentrada incluso antes del siguiente renderizado.
  const submittingRef = useRef(false);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    // Guard de reentrada: bloquea dobles envíos antes del siguiente render.
    if (submittingRef.current || isSubmitting) return;
    setServerError("");
    const { errors: nextErrors, quantity: parsed } = validate(
      { type, quantity },
      product.stock,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    // adjustStock es asíncrono y serializa las operaciones: devuelve { ok, error }
    // como verdad final. Nunca informa éxito si el movimiento fue rechazado.
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await onSubmit(product.id, type, parsed, reason.trim());
      if (result.ok === false) {
        setServerError(result.error || "No se pudo registrar el movimiento.");
      }
    } catch {
      setServerError("No se pudo registrar el movimiento.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="modal__panel modal__panel--small card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-movement-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id="stock-movement-title">Movimiento de stock</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Cancelar y cerrar"
          >
            ✕
          </button>
        </div>
        <p className="modal__product">
          <strong>{product.name}</strong>
          {" · "}Stock actual: {product.stock}
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="field">
            <legend className="field__label">Tipo de movimiento</legend>
            <div className="radio-row">
              <label className="radio">
                <input
                  type="radio"
                  name="movement-type"
                  value="entrada"
                  checked={type === "entrada"}
                  onChange={() => setType("entrada")}
                />
                <span>Entrada</span>
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="movement-type"
                  value="salida"
                  checked={type === "salida"}
                  onChange={() => setType("salida")}
                />
                <span>Salida</span>
              </label>
            </div>
            {errors.type && (
              <span className="field__error" role="alert">
                {errors.type}
              </span>
            )}
          </fieldset>
          <label className="field" htmlFor="movement-quantity">
            <span className="field__label">Cantidad *</span>
            <input
              id="movement-quantity"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="field__input"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-invalid={errors.quantity ? "true" : undefined}
              aria-describedby={
                errors.quantity ? "movement-quantity-error" : undefined
              }
            />
            {errors.quantity && (
              <span
                id="movement-quantity-error"
                className="field__error"
                role="alert"
              >
                {errors.quantity}
              </span>
            )}
          </label>
          <label className="field" htmlFor="movement-reason">
            <span className="field__label">Motivo (opcional)</span>
            <input
              id="movement-reason"
              type="text"
              className="field__input"
              placeholder="Ej.: compra a proveedor, venta, ajuste"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={120}
            />
          </label>
          {serverError && (
            <p className="field__error" role="alert">
              {serverError}
            </p>
          )}
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              Confirmar movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockMovementForm;
