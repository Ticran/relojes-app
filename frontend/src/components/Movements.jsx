import { useMemo, useState } from 'react';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Quita tildes/diacríticos para que "cronografo" encuentre "Cronógrafo".
function stripDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function Movements({ movements, items, movementsWarning }) {
  const [typeFilter, setTypeFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = stripDiacritics(search.trim().toLowerCase());
    const existingIds = new Set(items.map((item) => item.id));
    return [...movements]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((movement) => {
        if (typeFilter !== 'todos' && movement.type !== typeFilter) return false;
        if (term && !stripDiacritics(movement.productName.toLowerCase()).includes(term)) return false;
        return true;
      })
      .map((movement) => ({
        ...movement,
        productExists: existingIds.has(movement.productId),
      }));
  }, [movements, items, typeFilter, search]);

  // Aviso de almacenamiento propio del historial, reutilizado en ambos returns:
  // si la API falla, el estado vacío también debe mostrarlo.
  const warningNode = movementsWarning ? (
    <p className="movements__storage-warning" role="alert">
      {movementsWarning === 'unavailable'
        ? 'No se pudieron cargar los movimientos desde el servidor.'
        : 'Los movimientos guardados en este navegador estaban dañados y se muestra un historial inicial. Tus datos locales no fueron borrados.'}
    </p>
  ) : null;

  function handleClearFilters() {
    setSearch('');
    setTypeFilter('todos');
  }

  // Historial realmente vacío: sin movimientos no hay controles que mostrar.
  if (movements.length === 0) {
    return (
      <section className="card movements__empty">
        <h2>Historial de movimientos</h2>
        {warningNode}
        <p>No hay movimientos de stock registrados todavía.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Historial de movimientos</h2>
      {warningNode}
      <div className="movements__filters">
        <label className="field">
          <span className="field__label">Tipo de movimiento</span>
          <select
            className="field__input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </label>
        <label className="field">
          <span className="field__label">Buscar producto</span>
          <input
            className="field__input"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre del producto"
          />
        </label>
      </div>

      {filtered.length === 0 && (
        <div className="movements__empty">
          <p>Sin coincidencias para la búsqueda actual.</p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleClearFilters}
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {filtered.length > 0 && (
      <div className="movements__table-wrap">
        <table className="movements__table" aria-label="Historial de movimientos de stock">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((movement) => (
              <tr key={movement.id}>
                <td>{formatDateTime(movement.createdAt)}</td>
                <td>
                  {movement.productName}
                  {!movement.productExists && (
                    <span className="movements__badge movements__badge--removed">
                      Producto eliminado
                    </span>
                  )}
                </td>
                <td>
                  <span
                    className={`movements__badge movements__badge--${movement.type}`}
                  >
                    {movement.type === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td>{movement.quantity} u.</td>
                <td>{movement.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {filtered.length > 0 && (
      <div className="movements__cards">
        {filtered.map((movement) => (
          <div key={movement.id} className="movements__card">
            <div className="movements__card__meta">
              <span>{formatDateTime(movement.createdAt)}</span>
              <span
                className={`movements__badge movements__badge--${movement.type}`}
              >
                {movement.type === 'entrada' ? 'Entrada' : 'Salida'}
              </span>
            </div>
            <p>
              <strong>{movement.productName}</strong>
              {!movement.productExists && (
                <span className="movements__badge movements__badge--removed">
                  Producto eliminado
                </span>
              )}
            </p>
            <p className="movements__card__qty">{movement.quantity} u.</p>
            {movement.reason && (
              <p className="movements__card__reason">{movement.reason}</p>
            )}
          </div>
        ))}
      </div>
      )}
    </section>
  );
}

export default Movements;