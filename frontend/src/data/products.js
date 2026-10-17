// Productos ficticios de demostración. No representan un catálogo real.
// Se reemplazarán por datos del backend en etapas posteriores.
const PRODUCTS = [
  { id: 'reloj-clasico-acero', name: 'Reloj Clásico Acero', category: 'Relojes', price: 189999, stock: 12 },
  { id: 'reloj-deportivo-negro', name: 'Reloj Deportivo Negro', category: 'Relojes', price: 129999, stock: 4 },
  { id: 'reloj-minimal-blanco', name: 'Reloj Minimalista Blanco', category: 'Relojes', price: 159999, stock: 8 },
  { id: 'reloj-cronografo', name: 'Cronógrafo Carbón', category: 'Relojes', price: 249999, stock: 0 },
  { id: 'reloj-dorado-vintage', name: 'Reloj Vintage Dorado', category: 'Relojes', price: 219999, stock: 3 },
  { id: 'correa-cuero-marron', name: 'Correa de Cuero Marrón', category: 'Correas', price: 24999, stock: 20 },
  { id: 'correa-acero-milanesa', name: 'Correa Milanesa Acero', category: 'Correas', price: 29999, stock: 2 },
  { id: 'estuche-viaje', name: 'Estuche de Viaje Doble', category: 'Accesorios', price: 34999, stock: 15 },
  { id: 'limpiador-relojes', name: 'Kit de Limpieza Premium', category: 'Accesorios', price: 14999, stock: 0 },
  { id: 'reloj-pilot', name: 'Reloj Pilot Verde', category: 'Relojes', price: 199999, stock: 6 },
];

const CATEGORIES = ['Todas', 'Relojes', 'Correas', 'Accesorios'];

const LOW_STOCK_LIMIT = 5;

function getStockStatus(stock) {
  if (stock <= 0) return { id: 'agotado', label: 'Agotado' };
  if (stock <= LOW_STOCK_LIMIT) return { id: 'bajo', label: 'Stock bajo' };
  return { id: 'normal', label: 'En stock' };
}

export { PRODUCTS, CATEGORIES, LOW_STOCK_LIMIT, getStockStatus };
