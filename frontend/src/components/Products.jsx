import { useMemo, useState, useContext } from "react";
import { CATEGORIES, getStockStatus } from "../data/products.js";
import ProductForm from "./ProductForm.jsx";
import ConfirmDelete from "./ConfirmDelete.jsx";
import StockMovementForm from "./StockMovementForm.jsx";
import ProductActionsMenu from "./ProductActionsMenu.jsx";
import { ToastContext } from "../context/ToastContext.jsx";

const AVAILABILITY = [
  { id: "todos", label: "Todos" },
  { id: "con-stock", label: "Con stock" },
  { id: "sin-stock", label: "Sin stock" },
];

function formatPrice(value) {
  return `$ ${value.toLocaleString("es-AR")}`;
}

function Products({
  items,
  movements,
  productsWarning,
  onCreate,
  onUpdate,
  onDelete,
  onAdjustStock,
}) {
  const { success } = useContext(ToastContext);
  // Alta/edición/eliminación/movimientos delegan en el hook compartido (props).
  // Solo filtros, búsqueda, modales y avisos quedan como estado local.
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [availability, setAvailability] = useState("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [movementProduct, setMovementProduct] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((product) => {
      if (category !== "Todas" && product.category !== category) return false;
      if (availability === "con-stock" && product.stock <= 0) return false;
      if (availability === "sin-stock" && product.stock > 0) return false;
      if (term && !product.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, search, category, availability]);

  async function handleCreate(data, imageFile) {
    await onCreate(data, imageFile);
    // Limpio filtros y búsqueda para que el producto recién creado quede visible.
    setSearch("");
    setCategory("Todas");
    setAvailability("todos");
    setFormOpen(false);
    success(`"${data.name}" se agregó al inventario.`);
  }

  function handleOpenCreate() {
    setFormOpen(true);
    setEditingProduct(null);
    setDeletingProduct(null);
    setMovementProduct(null);
  }

  function handleOpenEdit(product) {
    setEditingProduct(product);
    setFormOpen(false);
    setDeletingProduct(null);
    setMovementProduct(null);
  }

  function handleOpenDelete(product) {
    setDeletingProduct(product);
    setFormOpen(false);
    setEditingProduct(null);
    setMovementProduct(null);
  }

  function handleOpenMovement(product) {
    setMovementProduct(product);
    setFormOpen(false);
    setEditingProduct(null);
    setDeletingProduct(null);
  }

  async function handleConfirmMovement(productId, type, quantity, reason) {
    // onAdjustStock devuelve { ok, error }; el modal decide si cerrar o mostrar el error.
    const result = await onAdjustStock(productId, type, quantity, reason);
    if (result.ok === false) return result;
    const current = items.find((item) => item.id === productId);
    const label = type === "entrada" ? "Entrada" : "Salida";
    setMovementProduct(null);
    success(
      `${label} de ${quantity} u. registrada en "${current ? current.name : "el producto"}".`,
    );
    return result;
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingProduct(null);
    setDeletingProduct(null);
    setMovementProduct(null);
  }

  async function handleConfirmDelete() {
    // Borrado por id a través del hook compartido.
    // Los filtros se mantienen: si era el último visible, aparece el mensaje de sin coincidencias.
    const name = deletingProduct.name;
    await onDelete(deletingProduct.id);
    setDeletingProduct(null);
    success(`"${name}" se eliminó del inventario.`);
  }

  async function handleUpdate(data, imageFile) {
    // Actualización por id a través del hook compartido.
    // Los filtros se mantienen: si el producto editado
    // deja de coincidir, simplemente sale del listado filtrado.
    await onUpdate(editingProduct.id, data, imageFile);
    success(`"${data.name}" se actualizó correctamente.`);
    setEditingProduct(null);
  }

  return (
    <div className="products">
      {productsWarning === "corrupt" && (
        <p className="products__storage-warning" role="alert">
          Los datos guardados en este navegador estaban dañados y se muestran
          los productos iniciales. Tus datos locales no fueron borrados.
        </p>
      )}
      {productsWarning === "unavailable" && (
        <p className="products__storage-warning" role="alert">
          El almacenamiento local no está disponible: los cambios se conservan
          solo mientras la página permanece abierta.
        </p>
      )}
      <div className="products__toolbar card">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setFormOpen(true);
            setEditingProduct(null);
            setDeletingProduct(null);
            setMovementProduct(null);
          }}
        >
          Nuevo producto
        </button>
        <div className="products__filters">
          <label className="field">
            <span className="field__label">Buscar</span>
            <input
              type="search"
              className="field__input"
              placeholder="Buscar por nombre…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Categoría</span>
            <select
              className="field__input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Disponibilidad</span>
            <select
              className="field__input"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              {AVAILABILITY.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section aria-live="polite" className="card">
          <h2>No hay productos que coincidan</h2>
          <p>Probá con otro nombre, categoría o disponibilidad.</p>
        </section>
      ) : (
        <>
          <div className="card products__table-wrap">
            <table className="products__table">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Precio</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const status = getStockStatus(product.stock);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="product-cell">
                          {product.imageUrl ? (
                            <img
                              className="product-thumb product-thumb--image"
                              src={product.imageUrl}
                              alt={`Imagen de ${product.name}`}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="product-thumb" aria-hidden="true">
                              <svg viewBox="0 0 32 32">
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="10"
                                  fill="none"
                                  stroke="var(--color-accent-text)"
                                  strokeWidth="1.5"
                                />
                                <line
                                  x1="16"
                                  y1="16"
                                  x2="16"
                                  y2="10"
                                  stroke="var(--color-text)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                                <line
                                  x1="16"
                                  y1="16"
                                  x2="20"
                                  y2="18"
                                  stroke="var(--color-text)"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </span>
                          )}
                          <span>{product.name}</span>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>{formatPrice(product.price)}</td>
                      <td>{product.stock}</td>
                      <td>
                        <span className={`badge badge--${status.id}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <ProductActionsMenu
                          product={product}
                          onMovement={handleOpenMovement}
                          onEdit={handleOpenEdit}
                          onDelete={handleOpenDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="products__cards">
            {filtered.map((product) => {
              const status = getStockStatus(product.stock);
              return (
                <li key={product.id} className="card product-card">
                  <div className="product-card__header">
                    <div className="product-cell">
                      {product.imageUrl ? (
                        <img
                          className="product-thumb product-thumb--image"
                          src={product.imageUrl}
                          alt={`Imagen de ${product.name}`}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="product-thumb" aria-hidden="true">
                          <svg viewBox="0 0 32 32">
                            <circle
                              cx="16"
                              cy="16"
                              r="10"
                              fill="none"
                              stroke="var(--color-accent-text)"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="16"
                              y1="16"
                              x2="16"
                              y2="10"
                              stroke="var(--color-text)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1="16"
                              y1="16"
                              x2="20"
                              y2="18"
                              stroke="var(--color-text)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      )}
                      <div>
                        <p className="product-card__name">{product.name}</p>
                        <p className="product-card__meta">{product.category}</p>
                      </div>
                    </div>
                    <ProductActionsMenu
                      product={product}
                      onMovement={handleOpenMovement}
                      onEdit={handleOpenEdit}
                      onDelete={handleOpenDelete}
                    />
                  </div>
                  <p className="product-card__line">
                    {formatPrice(product.price)}
                  </p>
                  <p className="product-card__line">
                    {product.stock} u. ·{" "}
                    <span className={`badge badge--${status.id}`}>
                      {status.label}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="products__count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          </p>
        </>
      )}
      {formOpen && (
        <ProductForm onSubmit={handleCreate} onClose={handleCloseForm} />
      )}
      {editingProduct && (
        <ProductForm
          mode="edit"
          initialProduct={editingProduct}
          onSubmit={handleUpdate}
          onClose={handleCloseForm}
        />
      )}
      {deletingProduct && (
        <ConfirmDelete
          product={deletingProduct}
          movementCount={
            movements.filter(
              (movement) => movement.productId === deletingProduct.id,
            ).length
          }
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingProduct(null)}
        />
      )}
      {movementProduct && (
        <StockMovementForm
          product={
            items.find((item) => item.id === movementProduct.id) ??
            movementProduct
          }
          onSubmit={handleConfirmMovement}
          onClose={() => setMovementProduct(null)}
        />
      )}
    </div>
  );
}

export default Products;
