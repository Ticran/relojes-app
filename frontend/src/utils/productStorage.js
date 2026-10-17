// Utilidades para persistir el inventario en localStorage.
// Clave específica de la app: no interfiere con otros datos del navegador.
const STORAGE_KEY = 'relojesApp_products';

function isValidProduct(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim() === '') return false;
  if (typeof item.name !== 'string' || item.name.trim() === '') return false;
  if (typeof item.category !== 'string' || item.category.trim() === '') return false;
  if (typeof item.price !== 'number' || !Number.isFinite(item.price)) return false;
  if (typeof item.stock !== 'number' || !Number.isInteger(item.stock)) return false;
  if (item.description !== undefined && typeof item.description !== 'string') return false;
  return true;
}

function storageAvailable() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__relojesApp_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// Lee el inventario guardado. Nunca lanza excepciones.
// Devuelve { status, items } donde status puede ser:
// - 'stored': había datos válidos (incluye array vacío) y se usan.
// - 'defaults': no había clave guardada, se usan los datos iniciales.
// - 'corrupt': había algo guardado pero inválido; se usan los iniciales
//   y NO se borra la clave para no destruir datos sin avisar.
// - 'unavailable': localStorage no accesible; se usan los iniciales.
function loadStoredProducts(fallback) {
  if (!storageAvailable()) {
    return { status: 'unavailable', items: fallback };
  }
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable', items: fallback };
  }
  if (raw === null) {
    return { status: 'defaults', items: fallback };
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isValidProduct)) {
      return { status: 'stored', items: parsed };
    }
    return { status: 'corrupt', items: fallback };
  } catch {
    return { status: 'corrupt', items: fallback };
  }
}

// Guarda el inventario. Devuelve true/false, nunca lanza.
// Un array vacío se guarda como '[]' y es válido al recargar.
function saveStoredProducts(items) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export { STORAGE_KEY, loadStoredProducts, saveStoredProducts };
