import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers de validación
// ---------------------------------------------------------------------------

const EDITABLE_FIELDS = [
  'name',
  'category',
  'price',
  'stock',
  'description',
  'imageUrl',
  'imagePublicId',
];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isNullOrString(value) {
  return value === null || typeof value === 'string';
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    stock: row.stock,
    description: row.description,
    imageUrl: row.image_url ?? null,
    imagePublicId: row.image_public_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateCreateProduct(body) {
  const errors = {};

  if (!isNonEmptyString(body.name)) {
    errors.name = 'El nombre es obligatorio y no debe estar vacío.';
  }
  if (!isNonEmptyString(body.category)) {
    errors.category = 'La categoría es obligatoria y no debe estar vacía.';
  }
  if (!isPositiveFiniteNumber(body.price)) {
    errors.price = 'El precio debe ser un número mayor que cero.';
  }
  if (body.stock !== undefined && !isNonNegativeInteger(body.stock)) {
    errors.stock = 'El stock debe ser un entero mayor o igual a cero.';
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.description = 'La descripción debe ser una cadena de texto.';
  }
  if (body.imageUrl !== undefined && !isNullOrString(body.imageUrl)) {
    errors.imageUrl = 'La URL de la imagen debe ser una cadena o null.';
  }
  if (body.imagePublicId !== undefined && !isNullOrString(body.imagePublicId)) {
    errors.imagePublicId = 'El public_id de la imagen debe ser una cadena o null.';
  }

  const serverManaged = ['id', 'createdAt', 'updatedAt'];
  for (const field of serverManaged) {
    if (body[field] !== undefined) {
      errors[field] = `El campo ${field} es administrado por el servidor y no puede enviarse.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, error: 'Datos de entrada inválidos', details: errors };
  }
  return { ok: true, data: body };
}

function validateUpdateProduct(body) {
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

  const serverManaged = ['id', 'createdAt', 'updatedAt'];
  for (const field of serverManaged) {
    if (body[field] !== undefined) {
      return {
        ok: false,
        error: `El campo ${field} es administrado por el servidor y no puede modificarse.`,
      };
    }
  }

  const editableKeys = keys.filter((k) => EDITABLE_FIELDS.includes(k));
  if (editableKeys.length === 0) {
    return {
      ok: false,
      error: 'No se enviaron campos editables para actualizar.',
    };
  }

  const errors = {};
  const data = {};

  for (const key of editableKeys) {
    const value = body[key];

    if (key === 'name' && !isNonEmptyString(value)) {
      errors.name = 'El nombre no debe estar vacío.';
    } else if (key === 'category' && !isNonEmptyString(value)) {
      errors.category = 'La categoría no debe estar vacía.';
    } else if (key === 'price' && !isPositiveFiniteNumber(value)) {
      errors.price = 'El precio debe ser un número mayor que cero.';
    } else if (key === 'stock' && !isNonNegativeInteger(value)) {
      errors.stock = 'El stock debe ser un entero mayor o igual a cero.';
    } else if (key === 'description' && typeof value !== 'string') {
      errors.description = 'La descripción debe ser una cadena de texto.';
    } else if (
      key === 'imageUrl' &&
      value !== undefined &&
      !isNullOrString(value)
    ) {
      errors.imageUrl = 'La URL de la imagen debe ser una cadena o null.';
    } else if (
      key === 'imagePublicId' &&
      value !== undefined &&
      !isNullOrString(value)
    ) {
      errors.imagePublicId = 'El public_id de la imagen debe ser una cadena o null.';
    } else {
      data[key] = value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, error: 'Datos de entrada inválidos', details: errors };
  }

  return { ok: true, data };
}

function validateProductId(idParam) {
  if (!/^\d+$/.test(idParam)) {
    return null;
  }
  return idParam;
}

// ---------------------------------------------------------------------------
// GET /api/products
// Devuelve todos los productos en camelCase. La tabla products puede estar vacía;
// en ese caso se devuelve [] con estado 200.
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        category,
        price,
        stock,
        description,
        image_url,
        image_public_id,
        created_at,
        updated_at
      FROM products
      ORDER BY id DESC`
    );

    const products = result.rows.map(mapProduct);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/products/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  const productId = validateProductId(req.params.id);
  if (productId === null) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'El identificador de producto debe ser numérico.',
    });
  }

  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        category,
        price,
        stock,
        description,
        image_url,
        image_public_id,
        created_at,
        updated_at
      FROM products
      WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No existe un producto con el id ${productId}.`,
      });
    }

    const product = mapProduct(result.rows[0]);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/products
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  const validation = validateCreateProduct(req.body);
  if (!validation.ok) {
    return res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
      details: validation.details,
    });
  }

  const { name, category, price, stock, description, imageUrl, imagePublicId } =
    validation.data;

  try {
    const result = await pool.query(
      `INSERT INTO products (name, category, price, stock, description, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, category, price, stock, description, image_url, image_public_id, created_at, updated_at`,
      [name.trim(), category.trim(), price, stock ?? 0, description ?? '', imageUrl ?? null, imagePublicId ?? null]
    );

    const created = mapProduct(result.rows[0]);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/products/:id
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
  const productId = validateProductId(req.params.id);
  if (productId === null) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'El identificador de producto debe ser numérico.',
    });
  }

  const validation = validateUpdateProduct(req.body);
  if (!validation.ok) {
    return res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
      details: validation.details,
    });
  }

  const { data } = validation;
  const fields = Object.keys(data);

  try {
    const existing = await pool.query(
      'SELECT id FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No existe un producto con el id ${productId}.`,
      });
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const columnMap = {
      name: 'name',
      category: 'category',
      price: 'price',
      stock: 'stock',
      description: 'description',
      imageUrl: 'image_url',
      imagePublicId: 'image_public_id',
    };

    for (const field of fields) {
      const column = columnMap[field];
      setClauses.push(`${column} = $${paramIndex}`);
      values.push(data[field]);
      paramIndex++;
    }

    setClauses.push(`updated_at = now()`);
    values.push(productId);

    const query = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, category, price, stock, description, image_url, image_public_id, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const updated = mapProduct(result.rows[0]);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/products/:id
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  const productId = validateProductId(req.params.id);
  if (productId === null) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'El identificador de producto debe ser numérico.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const product = await client.query(
      'SELECT id, stock FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not Found',
        message: `No existe un producto con el id ${productId}.`,
      });
    }

    const discardedStock = product.rows[0].stock;

    await client.query('DELETE FROM products WHERE id = $1', [productId]);

    await client.query('COMMIT');

    const response = {
      deleted: true,
      discardedStock,
    };

    if (discardedStock > 0) {
      response.warning = `Se eliminaron ${discardedStock} unidad(es) de stock sin generar un movimiento de salida.`;
    }

    res.json(response);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

export default router;
