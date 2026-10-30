import { useContext, useMemo, useState } from "react";
import { ToastContext } from "../context/ToastContext.jsx";
import ProductForm from "./ProductForm.jsx";
import StockMovementForm from "./StockMovementForm.jsx";
import MovementChart from "./MovementChart.jsx";
import {
  formatCurrency,
  getDashboardSubtitle,
  getInventoryMetrics,
  getRecentMovements,
  getStockAlerts,
  formatShortMovementDate,
} from "./summaryUtils.js";

function Summary({
  items,
  movements,
  user,
  hydrated,
  productsWarning,
  movementsWarning,
  onCreate,
  onAdjustStock,
  menuOpen,
  onOpenMenu,
  onShowAllMovements,
}) {
  const { success } = useContext(ToastContext);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [movementRequest, setMovementRequest] = useState(null);
  const now = new Date();
  const metrics = useMemo(() => getInventoryMetrics(items), [items]);
  const alerts = useMemo(() => getStockAlerts(items), [items]);
  const recentMovements = useMemo(
    () => getRecentMovements(movements, 5),
    [movements],
  );
  const subtitle = getDashboardSubtitle(user?.username, now);
  const productLoadFailed = productsWarning === "unavailable";

  function openMovement(product = null, type = "entrada") {
    setMovementRequest({ product, type });
  }

  async function handleCreate(data, imageFile) {
    await onCreate(data, imageFile);
    setProductFormOpen(false);
    success(`"${data.name}" se agregó al inventario.`);
  }

  async function handleMovementSubmit(productId, type, quantity, reason) {
    const result = await onAdjustStock(productId, type, quantity, reason);
    if (result.ok === false) return result;

    const product = items.find((item) => item.id === productId);
    const label = type === "entrada" ? "Entrada" : "Salida";
    setMovementRequest(null);
    success(
      `${label} de ${quantity} u. registrada en "${product?.name ?? "el producto"}".`,
    );
    return result;
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <button
          type="button"
          className="topbar__menu-btn"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          ☰
        </button>
        <div className="dashboard__heading">
          <h1 className="dashboard__title">Resumen</h1>
          <p className="dashboard__subtitle">{subtitle}</p>
        </div>
        <div className="dashboard__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => openMovement()}
            disabled={!hydrated || productLoadFailed || items.length === 0}
          >
            Registrar movimiento
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setProductFormOpen(true)}
            disabled={!hydrated}
          >
            Nuevo producto
          </button>
        </div>
      </header>

      {!hydrated ? (
        <p className="dashboard__state" role="status">
          Cargando resumen…
        </p>
      ) : productLoadFailed ? (
        <p className="products__storage-warning" role="alert">
          El inventario no está disponible en este momento.
        </p>
      ) : (
        <>
          <section
            className="dashboard__metrics"
            aria-label="Indicadores del inventario"
          >
            <article className="dashboard__metric dashboard__metric--featured card">
              <h2 className="dashboard__metric-label">Valor del inventario</h2>
              <p className="dashboard__metric-value">
                {formatCurrency(metrics.inventoryValue)}
              </p>
              <p className="dashboard__metric-context">
                {metrics.totalUnits}{" "}
                {metrics.totalUnits === 1 ? "unidad" : "unidades"} en stock
              </p>
            </article>
            <article className="dashboard__metric card">
              <h2 className="dashboard__metric-label">Total de productos</h2>
              <p className="dashboard__metric-value">{metrics.totalProducts}</p>
              <p className="dashboard__metric-context">
                Productos en el catálogo
              </p>
            </article>
            <article className="dashboard__metric card">
              <h2 className="dashboard__metric-label">Stock bajo</h2>
              <p className="dashboard__metric-value">{metrics.lowStock}</p>
              <p className="dashboard__metric-context">
                De 1 a {metrics.lowStockLimit} unidades
              </p>
            </article>
            <article className="dashboard__metric card">
              <h2 className="dashboard__metric-label">Agotados</h2>
              <p className="dashboard__metric-value">{metrics.outOfStock}</p>
              <p className="dashboard__metric-context">
                Sin unidades disponibles
              </p>
            </article>
          </section>

          <div className="dashboard__columns">
            <section
              className="dashboard__panel card"
              aria-labelledby="dashboard-alerts-title"
            >
              <h2
                id="dashboard-alerts-title"
                className="dashboard__panel-title"
              >
                Alertas de inventario
              </h2>
              {alerts.length === 0 ? (
                <div className="dashboard__empty">
                  <svg
                    className="dashboard__empty-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="none"
                      stroke="var(--color-stock-ok-text)"
                      strokeWidth="1.7"
                    />
                    <path
                      d="m8 12.2 2.5 2.5L16.5 9"
                      fill="none"
                      stroke="var(--color-stock-ok-text)"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p>Todo el stock está en orden</p>
                </div>
              ) : (
                <ul className="dashboard__alert-list">
                  {alerts.map((product) => {
                    const isOutOfStock = product.stock === 0;
                    return (
                      <li className="dashboard__alert-row" key={product.id}>
                        <span className="dashboard__alert-name">
                          {product.name}
                        </span>
                        <span
                          className={`badge ${isOutOfStock ? "badge--agotado" : "badge--bajo"}`}
                        >
                          {isOutOfStock ? "Agotado" : "Stock bajo"}
                        </span>
                        <span className="dashboard__alert-units">
                          {product.stock}{" "}
                          {product.stock === 1 ? "unidad" : "unidades"}
                        </span>
                        <button
                          type="button"
                          className="btn btn--ghost dashboard__alert-action"
                          onClick={() => openMovement(product, "entrada")}
                        >
                          Registrar entrada
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="dashboard__panel card"
              aria-labelledby="dashboard-activity-title"
            >
              <div className="dashboard__panel-heading">
                <h2
                  id="dashboard-activity-title"
                  className="dashboard__panel-title"
                >
                  Actividad reciente
                </h2>
                <button
                  type="button"
                  className="dashboard__link"
                  onClick={onShowAllMovements}
                >
                  Ver todos
                </button>
              </div>
              {movementsWarning === "unavailable" ? (
                <p className="movements__storage-warning" role="alert">
                  No se pudieron cargar los movimientos desde el servidor.
                </p>
              ) : recentMovements.length === 0 ? (
                <p className="dashboard__empty">
                  Todavía no hay movimientos registrados
                </p>
              ) : (
                <ul className="dashboard__activity-list">
                  {recentMovements.map((movement) => (
                    <li className="dashboard__activity-row" key={movement.id}>
                      <span className="dashboard__activity-name">
                        {movement.productName}
                      </span>
                      <span
                        className={`movements__badge movements__badge--${movement.type}`}
                      >
                        {movement.type === "entrada" ? "Entrada" : "Salida"}
                      </span>
                      <span className="dashboard__activity-quantity">
                        {movement.quantity} u.
                      </span>
                      <time
                        className="dashboard__activity-date"
                        dateTime={movement.createdAt}
                      >
                        {formatShortMovementDate(movement.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <MovementChart movements={movements} warning={movementsWarning} />
        </>
      )}

      {productFormOpen && (
        <ProductForm
          onSubmit={handleCreate}
          onClose={() => setProductFormOpen(false)}
        />
      )}
      {movementRequest && (
        <StockMovementForm
          product={movementRequest.product}
          products={items}
          initialType={movementRequest.type}
          onSubmit={handleMovementSubmit}
          onClose={() => setMovementRequest(null)}
        />
      )}
    </div>
  );
}

export default Summary;
