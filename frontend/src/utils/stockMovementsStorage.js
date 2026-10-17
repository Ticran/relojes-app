// Utilidades para persistir el historial de movimientos de stock en localStorage.
// Clave separada del inventario: si una se corrompe, la otra sigue usable.
// Sigue el mismo patrón que productStorage.js (nunca lanza, valida, no borra).
const MOVEMENTS_STORAGE_KEY = 'relojesApp_stockMovements';

function isValidMovement(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim() === '') return false;
  if (typeof item.productId !== 'string' || item.productId.trim() === '') return false;
  if (typeof item.productName !== 'string' || item.productName.trim() === '') return false;
  if (item.type !== 'entrada' && item.type !== 'salida') return false;
  if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) return false;
  if (item.reason !== undefined && typeof item.reason !== 'string') return false;
  if (typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) return false;
  return true;
}

function movementsStorageAvailable() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__relojesApp_movements_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// Lee los movimientos guardados. Nunca lanza excepciones.
// Devuelve { status, movements } donde status puede ser:
// - 'stored': había datos válidos (incluye array vacío) y se usan.
// - 'defaults': no había clave guardada, se usa el valor inicial.
// - 'corrupt': había algo guardado pero inválido; se usan los iniciales
//   y NO se borra la clave para no destruir datos sin avisar.
// - 'unavailable': localStorage no accesible; se usan los iniciales.
function loadStoredMovements(fallback) {
  const defaults = Array.isArray(fallback) ? fallback : [];
  if (!movementsStorageAvailable()) {
    return { status: 'unavailable', movements: defaults };
  }
  let raw = null;
  try {
    raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY);
  } catch {
    return { status: 'unavailable', movements: defaults };
  }
  if (raw === null) {
    return { status: 'defaults', movements: defaults };
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isValidMovement)) {
      return { status: 'stored', movements: parsed };
    }
    return { status: 'corrupt', movements: defaults };
  } catch {
    return { status: 'corrupt', movements: defaults };
  }
}

// Guarda los movimientos. Devuelve true/false, nunca lanza.
// Un array vacío se guarda como '[]' y es válido al recargar.
function saveStoredMovements(movements) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements));
    return true;
  } catch {
    return false;
  }
}

export { MOVEMENTS_STORAGE_KEY, loadStoredMovements, saveStoredMovements };
