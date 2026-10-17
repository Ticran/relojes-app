import { useEffect, useState } from 'react';
import { CATEGORIES } from '../data/products.js';

// 'Todas' es solo una opción del filtro, no una categoría válida para un producto.
const REAL_CATEGORIES = CATEGORIES.filter((item) => item !== 'Todas');

const EMPTY_VALUES = { name: '', category: '', price: '', stock: '', description: '' };

function validate(values) {
  const errors = {};
  const name = values.name.trim();
  const description = values.description.trim();

  if (!name) {
    errors.name = 'El nombre es obligatorio.';
  }

  if (!REAL_CATEGORIES.includes(values.category)) {
    errors.category = 'Elegí una categoría válida.';
  }

  const priceText = values.price.trim();
  const price = Number(priceText);
  if (priceText === '' || Number.isNaN(price)) {
    errors.price = 'El precio debe ser un número.';
  } else if (price <= 0) {
    errors.price = 'El precio debe ser mayor que cero.';
  }

  const stockText = values.stock.trim();
  const stock = Number(stockText);
  if (stockText === '') {
    errors.stock = 'El stock es obligatorio.';
  } else if (!Number.isInteger(stock)) {
    errors.stock = 'El stock debe ser un número entero.';
  } else if (stock < 0) {
    errors.stock = 'El stock no puede ser negativo.';
  }

  return {
    errors,
    parsed: { name, category: values.category, price, stock, description },
  };
}

function toFormValues(product) {
  if (!product) return EMPTY_VALUES;
  return {
    name: product.name ?? '',
    category: product.category ?? '',
    price: String(product.price ?? ''),
    stock: String(product.stock ?? ''),
    description: product.description ?? '',
  };
}

function ProductForm({ mode = 'create', initialProduct = null, onSubmit, onClose }) {
  const [values, setValues] = useState(() => toFormValues(initialProduct));
  const [errors, setErrors] = useState({});

  const isEditing = mode === 'edit';
  const title = isEditing ? 'Editar producto' : 'Nuevo producto';
  const submitLabel = isEditing ? 'Guardar cambios' : 'Agregar producto';

  // Cierre con la tecla Escape.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const { errors: nextErrors, parsed } = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(parsed);
  }

  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="modal__panel card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <h2 id="product-form-title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Cancelar y cerrar">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form__grid">
            <label className="field" htmlFor="product-name">
              <span className="field__label">Nombre *</span>
              <input
                id="product-name"
                type="text"
                className="field__input"
                value={values.name}
                onChange={(event) => set('name', event.target.value)}
                aria-invalid={errors.name ? 'true' : undefined}
                aria-describedby={errors.name ? 'product-name-error' : undefined}
              />
              {errors.name && (
                <span id="product-name-error" className="field__error" role="alert">
                  {errors.name}
                </span>
              )}
            </label>
            <label className="field" htmlFor="product-category">
              <span className="field__label">Categoría *</span>
              <select
                id="product-category"
                className="field__input"
                value={values.category}
                onChange={(event) => set('category', event.target.value)}
                aria-invalid={errors.category ? 'true' : undefined}
                aria-describedby={errors.category ? 'product-category-error' : undefined}
              >
                <option value="">Seleccionar…</option>
                {REAL_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span id="product-category-error" className="field__error" role="alert">
                  {errors.category}
                </span>
              )}
            </label>
            <label className="field" htmlFor="product-price">
              <span className="field__label">Precio *</span>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="field__input"
                value={values.price}
                onChange={(event) => set('price', event.target.value)}
                aria-invalid={errors.price ? 'true' : undefined}
                aria-describedby={errors.price ? 'product-price-error' : undefined}
              />
              {errors.price && (
                <span id="product-price-error" className="field__error" role="alert">
                  {errors.price}
                </span>
              )}
            </label>
            <label className="field" htmlFor="product-stock">
              <span className="field__label">Stock *</span>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                className="field__input"
                value={values.stock}
                onChange={(event) => set('stock', event.target.value)}
                aria-invalid={errors.stock ? 'true' : undefined}
                aria-describedby={errors.stock ? 'product-stock-error' : undefined}
              />
              {errors.stock && (
                <span id="product-stock-error" className="field__error" role="alert">
                  {errors.stock}
                </span>
              )}
            </label>
          </div>
          <label className="field" htmlFor="product-description">
            <span className="field__label">Descripción (opcional)</span>
            <textarea
              id="product-description"
              className="field__input field__textarea"
              rows="3"
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </label>
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;
