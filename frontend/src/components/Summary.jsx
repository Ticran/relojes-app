// Resumen calculado a partir del inventario real (props).
// Sin datos ficticios: todo deriva de `items`, incluidos los agotados.
import { getStockStatus } from "../data/products.js";

const MAX_ALERTS = 5;

function formatPrice(value) {
  return `$ ${value.toLocaleString("es-AR")}`;
}

function Summary({ items }) {
  const total = items.length;
  const inventoryValue = items.reduce(
    (sum, product) => sum + product.price * product.stock,
    0,
  );
  const alerts = items.filter(
    (product) => getStockStatus(product.stock).id !== "normal",
  );
  // Decisión: mantengo 4 tarjetas para no rehacer el diseño; la cuarta pasa
  // de "Pedidos pendientes" (ficticia, sin fuente de datos) a "Agotados"
  // (real: stock === 0). Sin backend de pedidos, mostrar un 3 fijo sería engañoso.
  const outOfStock = items.filter((product) => product.stock <= 0).length;

  const metrics = [
    { id: "productos", label: "Total de productos", value: String(total) },
    {
      id: "inventario",
      label: "Valor del inventario",
      value: formatPrice(inventoryValue),
    },
    {
      id: "stock-bajo",
      label: "Stock bajo o agotado",
      value: String(alerts.length),
    },
    { id: "agotados", label: "Agotados", value: String(outOfStock) },
  ];

  return (
    <div className="summary">
      <section aria-labelledby="metrics-title">
        <h2 id="metrics-title" className="summary__heading">
          Estado general del negocio
        </h2>
        <ul className="metrics">
          {metrics.map((metric) => (
            <li
              key={metric.id}
              className={`metric card${metric.id === "inventario" ? " metric--featured" : ""}`}
            >
              <span className="metric__label">{metric.label}</span>
              <span className="metric__value">{metric.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="alerts-title" className="card">
        <h2 id="alerts-title">Alertas de inventario</h2>
        {alerts.length === 0 ? (
          <p>No hay alertas: todo el inventario tiene stock normal.</p>
        ) : (
          <ul className="alerts">
            {alerts.slice(0, MAX_ALERTS).map((item) => {
              const status = getStockStatus(item.stock).id;
              return (
                <li key={item.id} className={`alert alert--${status}`}>
                  <span className="alert__dot" aria-hidden="true" />
                  <span className="alert__name">{item.name}</span>
                  <span className="alert__stock">
                    {item.stock} {item.stock === 1 ? "unidad" : "unidades"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Summary;
