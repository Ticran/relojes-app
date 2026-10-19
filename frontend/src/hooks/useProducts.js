// Fuente única de verdad del inventario.
// Encapsula estado, hidratación desde localStorage, persistencia y CRUD
// para que Resumen y Productos compartan los mismos datos.
// Los productos y los movimientos comparten un único estado de inventario
// para que cualquier mutación de stock valide y persista ambos de forma coherente
// en una sola operación de React. Las operaciones de ajuste se serializan mediante
// una cola interna para evitar que dos llamadas concurrentes validen contra un
// estado desactualizado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/products.js';
import { loadStoredProducts, saveStoredProducts } from '../utils/productStorage.js';
import { loadStoredMovements, saveStoredMovements } from '../utils/stockMovementsStorage.js';

// Campo interno usado para comunicar el resultado de un ajuste de stock al
// consumidor sin romper la pureza de los actualizadores funcionales de React.
// No se persiste en localStorage: solo se guarda items y movements.
const ADJUST_RESULT_KEY = '__adjustResult';

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
  const [inventory, setInventory] = useState({ items: PRODUCTS, movements: [] });
  const [hydrated, setHydrated] = useState(false);
  const [movementsHydrated, setMovementsHydrated] = useState(false);
  const [productsWarning, setProductsWarning] = useState('');
  const [movementsWarning, setMovementsWarning] = useState('');
  const ignoreNextSave = useRef(false);
  const ignoreNextMovementsSave = useRef(false);

  // Cola serializada para operaciones de ajuste de stock.
  // Cada entrada tiene los parámetros y un resolutor de promesa.
  const adjustQueue = useRef([]);
  const adjustingRef = useRef(false);

  useEffect(() => {
    const { status, items: stored } = loadStoredProducts(PRODUCTS);
    if (status === 'stored') {
      ignoreNextSave.current = true;
      setInventory((prev) => ({ ...prev, items: stored }));
    } else if (status === 'corrupt') {
      setProductsWarning('corrupt');
    } else if (status === 'unavailable') {
      setProductsWarning('unavailable');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const { status, movements: stored } = loadStoredMovements([]);
    if (status === 'stored') {
      ignoreNextMovementsSave.current = true;
      setInventory((prev) => ({ ...prev, movements: stored }));
    } else if (status === 'corrupt') {
      // Igual que con productos: se avisa y NO se borra la clave.
      setMovementsWarning('corrupt');
    } else if (status === 'unavailable') {
      setMovementsWarning('unavailable');
    }
    setMovementsHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (ignoreNextSave.current) {
      ignoreNextSave.current = false;
      return;
    }
    const ok = saveStoredProducts(inventory.items);
    if (!ok) setProductsWarning('unavailable');
  }, [inventory.items, hydrated]);

  useEffect(() => {
    if (!movementsHydrated) return;
    if (ignoreNextMovementsSave.current) {
      ignoreNextMovementsSave.current = false;
      return;
    }
    const ok = saveStoredMovements(inventory.movements);
    if (!ok) setMovementsWarning('unavailable');
  }, [inventory.movements, movementsHydrated]);

  const items = inventory.items;
  const movements = inventory.movements;

  // Procesa el siguiente ajuste de la cola, si no hay uno en curso.
  // El actualizador de React es puro: solo lee `prev` y retorna un nuevo estado.
  const processAdjustQueue = useCallback(() => {
    if (adjustingRef.current || adjustQueue.current.length === 0) return;
    const op = adjustQueue.current[0];
    adjustingRef.current = true;

    // Generamos id y fecha fuera del actualizador para mantenerlo puro y
    // determinista: si React lo invocara más de una vez, produciría exactamente
    // el mismo estado. El orden de la cola y la validación contra `prev` no cambian.
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();

    setInventory((prev) => {
      const product = prev.items.find((item) => item.id === op.productId);
      if (!product) {
        return {
          ...prev,
          [ADJUST_RESULT_KEY]: { ok: false, error: 'El producto no existe.' },
        };
      }
      if (op.type === 'salida' && product.stock < op.quantity) {
        // Rechazo sin tocar el stock ni registrar movimiento.
        return {
          ...prev,
          [ADJUST_RESULT_KEY]: {
            ok: false,
            error: 'Stock insuficiente para registrar la salida.',
          },
        };
      }
      const nextStock =
        op.type === 'entrada' ? product.stock + op.quantity : product.stock - op.quantity;
      const movement = {
        id: movementId,
        productId: product.id,
        productName: product.name,
        type: op.type,
        quantity: op.quantity,
        reason: typeof op.reason === 'string' ? op.reason.trim() : '',
        createdAt,
      };
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === op.productId ? { ...item, stock: nextStock } : item
        ),
        movements: [movement, ...prev.movements],
        [ADJUST_RESULT_KEY]: { ok: true, movement },
      };
    });
  }, []);

  // Cuando React confirma el nuevo estado, leemos el marcador de resultado,
  // resolvemos la promesa del consumidor, limpiamos el marcador y pasamos al
  // siguiente elemento de la cola.
  useEffect(() => {
    if (adjustQueue.current.length === 0) return;
    const op = adjustQueue.current[0];
    const result = inventory[ADJUST_RESULT_KEY];
    if (!result) return; // aún no procesado por React

    // Limpiamos el marcador para no dejar rastro en el estado visible.
    setInventory((prev) => {
      const next = { ...prev };
      delete next[ADJUST_RESULT_KEY];
      return next;
    });

    adjustingRef.current = false;
    adjustQueue.current.shift();
    op.resolve(result);

    if (adjustQueue.current.length > 0) {
      processAdjustQueue();
    } else {
      adjustingRef.current = false;
    }
  }, [inventory, processAdjustQueue]);

  // Al desmontar, resolvemos como rechazo toda operación que siga pendiente en la
  // cola para no dejar promesas sin resolver. `splice(0)` extrae y vacía la cola de
  // forma atómica: una entrada no puede verse dos veces ni por este cleanup ni por el
  // efecto de resolución (que retorna si la cola está vacía). Las operaciones ya
  // completadas no están en la cola — el `shift()` corre síncrono antes del resolve —
  // por lo que jamás se resuelven dos veces. Además, una Promise ya resuelta ignora
  // cualquier settle posterior como segunda garantía. En Strict Mode este cleanup
  // también corre durante el montaje simulado de desarrollo, pero ahí la cola está
  // vacía: las operaciones llegan solo desde eventos de usuario posteriores al ciclo
  // mount → cleanup → mount.
  useEffect(() => {
    return () => {
      const pending = adjustQueue.current.splice(0);
      pending.forEach((op) => {
        op.resolve({ ok: false, error: 'Operación cancelada: el componente se desmontó.' });
      });
      adjustingRef.current = false;
    };
  }, []);

  const addProduct = useCallback((data) => {
    // Defensa en profundidad: si el stock no es un entero finito >= 0, no se
    // crea el producto (el form ya lo garantiza; aquí se protege al hook mismo).
    if (!isValidStock(data.stock)) {
      throw new Error('addProduct: el stock debe ser un número entero mayor o igual a cero.');
    }
    const id = `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setInventory((prev) => ({
      ...prev,
      items: [{ id, ...data }, ...prev.items],
    }));
    return id;
  }, []);

  const updateProduct = useCallback((id, data) => {
    setInventory((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;
        // Si se envía un stock inválido, se conserva el stock actual del producto.
        // Sin clave 'stock' en data, la edición se aplica igual que siempre.
        if ('stock' in data && !isValidStock(data.stock)) {
          const next = { ...data };
          delete next.stock;
          return { ...item, ...next };
        }
        return { ...item, ...data };
      }),
    }));
  }, []);

  const removeProduct = useCallback((id) => {
    setInventory((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }, []);

  // Registra una entrada o salida de stock.
  // Devuelve una Promise que se resuelve con { ok: true, movement } si se aplicó,
  // o con { ok: false, error } si se rechazó. Nunca informa éxito si la operación
  // fue rechazada. Las operaciones se serializan para no validar contra un estado
  // desactualizado por llamadas previas aún no confirmadas por React.
  const adjustStock = useCallback((productId, type, quantity, reason) => {
    if (type !== 'entrada' && type !== 'salida') {
      return Promise.resolve({ ok: false, error: 'Tipo de movimiento inválido.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Promise.resolve({
        ok: false,
        error: 'La cantidad debe ser un entero mayor que cero.',
      });
    }

    return new Promise((resolve) => {
      adjustQueue.current.push({ productId, type, quantity, reason, resolve });
      if (!adjustingRef.current) {
        processAdjustQueue();
      }
    });
  }, [processAdjustQueue]);

  return {
    items,
    movements,
    hydrated,
    productsWarning,
    movementsWarning,
    addProduct,
    updateProduct,
    removeProduct,
    adjustStock,
  };
}

export default useProducts;
