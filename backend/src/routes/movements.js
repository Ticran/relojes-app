import express from 'express';
import { pool } from '../db/pool.js';

import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas de movimientos requieren autenticación.
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Helpers de validación
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['entrada', 'salida'];
const SERVER_MANAGED_FIELDS = ['id', 'productName', 'createdAt'];
const ALLOWED_FIELDS = ['productId', 'type', 'quantity', 'reason'];

function isNumericString(value) {
  return typeof value === 'string' && /^\d+$/.test(value);
}

function isIntegerValue(value) {
  return Number.isInteger(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidReason(value) {
  return typeof value === 'string' && value.length <= 120;
}

function mapMovement(row) {
  return {
    id: row.id,
    productId: row.product_id ?? null,
    productName: row.product_name,
    type: row.type,
    quantity: Number(row.quantity),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function validateCreateMovement(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: 'El cuerpo de la solicitud debe ser un objeto JSON.',
    };
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return {
      ok: false,
      error: 'El cuerpo de la solicitud no puede estar vacío.',
    };
  }

  for (const field of SERVER_MANAGED_FIELDS) {
    if (body[field] !== undefined) {
      return {
        ok: false,
        error: `El campo ${field} es administrado por el servidor y no puede enviarse.`,
      };
    }
  }

  const unexpectedKeys = keys.filter((k) => !ALLOWED_FIELDS.includes(k));
  if (unexpectedKeys.length > 0) {
    return {
      ok: false,
      error: `Campo(s) no permitido(s): ${unexpectedKeys.join(', ')}.`,
    };
  }

  const errors = {};
  const data = {};

  if (body.productId === undefined || body.productId === null) {
    errors.productId = 'El identificador de producto es obligatorio.';
  } else if (isNumericString(body.productId)) {
    data.productId = body.productId;
  } else if (isIntegerValue(body.productId) && body.productId > 0) {
    data.productId = String(body.productId);
  } else {
    errors.productId =
      'El identificador de producto debe ser un número entero positivo.';
  }

  if (body.type === undefined || body.type === null) {
    errors.type = 'El tipo de movimiento es obligatorio.';
  } else if (!ALLOWED_TYPES.includes(body.type)) {
    errors.type = "El tipo debe ser 'entrada' o 'salida'.";
  } else {
    data.type = body.type;
  }

  if (body.quantity === undefined || body.quantity === null) {
    errors.quantity = 'La cantidad es obligatoria.';
  } else if (typeof body.quantity === 'string') {
    errors.quantity = 'La cantidad debe ser un número entero, no una cadena de texto.';
  } else if (!isPositiveInteger(body.quantity)) {
    errors.quantity = 'La cantidad debe ser un entero mayor que cero.';
  } else {
    data.quantity = body.quantity;
  }

  if (body.reason === undefined || body.reason === null) {
    data.reason = '';
  } else if (!isValidReason(body.reason)) {
    errors.reason = 'La razón debe ser una cadena de máximo 120 caracteres.';
  } else {
    data.reason = body.reason;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, error: 'Datos de entrada inválidos', details: errors };
  }

  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// GET /api/movements
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        product_id,
        product_name,
        type,
        quantity,
        reason,
        created_at
      FROM stock_movements
      WHERE owner_id = $1
      ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    const movements = result.rows.map(mapMovement);
    res.json(movements);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/movements
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  const validation = validateCreateMovement(req.body);
  if (!validation.ok) {
    return res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
      details: validation.details,
    });
  }

  const { productId, type, quantity, reason } = validation.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await client.query(
      'SELECT id, stock, name FROM products WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [productId, req.user.id]
    );

    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not Found',
        message: `No existe un producto con el id ${productId}.`,
      });
    }

    const currentStock = product.rows[0].stock;
    const productName = product.rows[0].name;

    let newStock;
    if (type === 'salida') {
      if (quantity > currentStock) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Conflict',
          message: `Stock insuficiente. Disponible: ${currentStock}, solicitado: ${quantity}.`,
        });
      }
      newStock = currentStock - quantity;
    } else {
      newStock = currentStock + quantity;
    }

    await client.query(
      'UPDATE products SET stock = $1, updated_at = now() WHERE id = $2 AND owner_id = $3',
      [newStock, productId, req.user.id]
    );

    const movementResult = await client.query(
      `INSERT INTO stock_movements (owner_id, product_id, product_name, type, quantity, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, product_id, product_name, type, quantity, reason, created_at`,
      [req.user.id, productId, productName, type, quantity, reason]
    );

    await client.query('COMMIT');

    const movement = mapMovement(movementResult.rows[0]);
    res.status(201).json(movement);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

export default router;