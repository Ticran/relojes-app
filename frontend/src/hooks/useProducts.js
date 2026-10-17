// Fuente única de verdad del inventario.
// Encapsula estado, hidratación desde localStorage, persistencia y CRUD
// para que Resumen y Productos compartan los mismos datos.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/products.js';
import { loadStoredProducts, saveStoredProducts } from '../utils/productStorage.js';
import { loadStoredMovements, saveStoredMovements } from '../utils/stockMovementsStorage.js';

function useProducts() {
  const [items, setItems] = useState(PRODUCTS);
  const [movements, setMovements] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [movementsHydrated, setMovementsHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const ignoreNextSave = useRef(false);
  const ignoreNextMovementsSave = useRef(false);

  useEffect(() => {
    const { status, items: stored } = loadStoredProducts(PRODUCTS);
    if (status === 'stored') {
      ignoreNextSave.current = true;
      setItems(stored);
    } else if (status === 'corrupt') {
      setStorageWarning('corrupt');
    } else if (status === 'unavailable') {
      setStorageWarning('unavailable');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const { status, movements: stored } = loadStoredMovements([]);
    if (status === 'stored') {
      ignoreNextMovementsSave.current = true;
      setMovements(stored);
    } else if (status === 'corrupt') {
      // Igual que con productos: se avisa y NO se borra la clave.
      setStorageWarning('corrupt');
    } else if (status === 'unavailable') {
      setStorageWarning('unavailable');
    }
    setMovementsHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (ignoreNextSave.current) {
      ignoreNextSave.current = false;
      return;
    }
    const ok = saveStoredProducts(items);
    if (!ok) setStorageWarning('unavailable');
  }, [items, hydrated]);

  useEffect(() => {
    if (!movementsHydrated) return;
    if (ignoreNextMovementsSave.current) {
      ignoreNextMovementsSave.current = false;
      return;
    }
    const ok = saveStoredMovements(movements);
    if (!ok) setStorageWarning('unavailable');
  }, [movements, movementsHydrated]);

  const addProduct = useCallback((data) => {
    const id = `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [{ id, ...data }, ...prev]);
    return id;
  }, []);

  const updateProduct = useCallback((id, data) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
  }, []);

  const removeProduct = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Registra una entrada o salida de stock.
  // Devuelve { ok: true } si se aplicó, o { ok: false, error } si se rechazó.
  // El stock sigue viviendo solo en `items`: los movimientos son trazabilidad,
  // nunca se usan para recalcular el stock.
  // Nota sobre estado desactualizado: como items y movements son dos estados
  // separados, los actualizo con formas funcionales de setState (prev => ...),
  // que siempre operan sobre el valor más reciente aunque haya renders
  // intermedios. Para la validación necesito el producto actual, así que guardo
  // una referencia sincronizada con los últimos items confirmados por render.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const adjustStock = useCallback((productId, type, quantity, reason) => {
    if (type !== 'entrada' && type !== 'salida') {
      return { ok: false, error: 'Tipo de movimiento inválido.' };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, error: 'La cantidad debe ser un entero mayor que cero.' };
    }
    const product = itemsRef.current.find((item) => item.id === productId);
    if (!product) {
      return { ok: false, error: 'El producto no existe.' };
    }
    if (type === 'salida' && product.stock < quantity) {
      // Rechazo sin tocar el stock ni registrar movimiento.
      return { ok: false, error: 'Stock insuficiente para registrar la salida.' };
    }
    const nextStock = type === 'entrada' ? product.stock + quantity : product.stock - quantity;
    setItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, stock: nextStock } : item)),
    );
    const movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      type,
      quantity,
      reason: typeof reason === 'string' ? reason.trim() : '',
      createdAt: new Date().toISOString(),
    };
    setMovements((prev) => [movement, ...prev]);
    return { ok: true, movement };
  }, []);

  return { items, movements, hydrated, storageWarning, addProduct, updateProduct, removeProduct, adjustStock };
}

export default useProducts;
