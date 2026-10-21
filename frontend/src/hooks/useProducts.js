// Fuente única de verdad del inventario.
// Encapsula estado, carga desde la API REST y CRUD para que Resumen y
// Productos compartan los mismos datos. Los productos se cargan y mutan
// a través del backend; los movimientos también se gestionan vía API.
import { useCallback, useEffect, useState } from 'react';
import {
  getProducts,
  getMovements,
  createMovement,
  createProduct,
  updateProduct,
  deleteProduct,
  ApiError,
} from '../services/api.js';

// Defensa en profundidad para stock: el formulario ya valida, pero el hook no
// confía en el origen de los datos. Acepta únicamente números enteros finitos
// mayores o iguales a cero.
function isValidStock(value) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function useProducts() {
  // Estado único: productos y movimientos viajan juntos.
  // Los productos y movimientos empiezan vacíos y se cargan de la API al montar.
  const [inventory, setInventory] = useState({ items: [], movements: [] });
  const [hydrated, setHydrated] = useState(false);
  const [productsWarning, setProductsWarning] = useState('');
  const [movementsWarning, setMovementsWarning] = useState('');

  // -----------------------------------------------------------------------
  // Carga inicial de productos y movimientos desde la API
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        const products = await getProducts();
        if (!cancelled) setInventory((prev) => ({ ...prev, items: products }));
      } catch {
        if (!cancelled) setProductsWarning('unavailable');
      }
      try {
        const movements = await getMovements();
        if (!cancelled) setInventory((prev) => ({ ...prev, movements }));
      } catch {
        if (!cancelled) setMovementsWarning('unavailable');
      }
      if (!cancelled) setHydrated(true);
    }
    loadInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = inventory.items;
  const movements = inventory.movements;

  const addProduct = useCallback(async (data, imageFile) => {
    // Defensa en profundidad: si el stock no es un entero finito >= 0, no se
    // crea el producto (el form ya lo garantiza; aquí se protege al hook mismo).
    if (!isValidStock(data.stock)) {
      throw new Error(
        'addProduct: el stock debe ser un número entero mayor o igual a cero.'
      );
    }
    const created = await createProduct(data, imageFile);
    setInventory((prev) => ({
      ...prev,
      items: [created, ...prev.items],
    }));
    return created.id;
  }, []);

  const updateProductFn = useCallback(async (id, data, imageFile) => {
    const updated = await updateProduct(id, data, imageFile);
    setInventory((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? updated : item
      ),
    }));
  }, []);

  const removeProductFn = useCallback(async (id) => {
    await deleteProduct(id);
    setInventory((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  // Registra una entrada o salida de stock llamando a la API del backend.
  // El backend valida los datos, actualiza el stock y registra el movimiento
  // en una misma transacción. Devuelve { ok: true, movement } si se aplicó,
  // o { ok: false, error } si se rechazó. Nunca informa éxito si la operación
  // fue rechazada. Tras un movimiento exitoso, vuelve a consultar los productos
  // para reflejar el stock actualizado.
  const adjustStock = useCallback(async (productId, type, quantity, reason) => {
    if (type !== 'entrada' && type !== 'salida') {
      return { ok: false, error: 'Tipo de movimiento inválido.' };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, error: 'La cantidad debe ser un entero mayor que cero.' };
    }

    try {
      const movement = await createMovement({ productId, type, quantity, reason });
      // Refrescar productos para obtener el stock actualizado del backend
      try {
        const products = await getProducts();
        setInventory((prev) => ({
          ...prev,
          items: products,
          movements: [movement, ...prev.movements],
        }));
      } catch {
        // El movimiento se registró pero no se pudo refrescar la lista de productos.
        // Añadimos el movimiento al historial aunque el stock pueda estar desactualizado
        // hasta la próxima recarga.
        setInventory((prev) => ({
          ...prev,
          movements: [movement, ...prev.movements],
        }));
      }
      return { ok: true, movement };
    } catch (err) {
      if (err instanceof ApiError) {
        return { ok: false, error: err.message };
      }
      return { ok: false, error: 'No se pudo registrar el movimiento.' };
    }
  }, []);

  return {
    items,
    movements,
    hydrated,
    productsWarning,
    movementsWarning,
    addProduct,
    updateProduct: updateProductFn,
    removeProduct: removeProductFn,
    adjustStock,
  };
}

export default useProducts;
