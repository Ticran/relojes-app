import express from 'express';
import multer from 'multer';
import { pool } from '../db/pool.js';
import { uploadImage, isCloudinaryConfigured, cloudinary } from '../config/cloudinary.js';

import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas de productos requieren autenticación.
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Carga de archivos (multipart/form-data)
// ---------------------------------------------------------------------------
// Almacenamiento en memoria para validar el contenido real antes de subirlo a
// Cloudinary. Límite de 5 MB, coherente con el módulo de Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Valida los bytes mágicos del archivo para no confiar solo en el MIME declarado.
function detectImageMimetype(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp';
  return null;
}

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
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: 'El cuerpo de la solicitud debe ser un objeto JSON.',
    };
  }

  const errors = {};

  if (!isNonEmptyString(body.name)) {
    errors.name = 'El nombre es obligatorio y no debe estar vacío.';
  } else if (body.name.trim().length > 120) {
    errors.name = 'El nombre no debe superar 120 caracteres.';
  }
  if (!isNonEmptyString(body.category)) {
    errors.category = 'La categoría es obligatoria y no debe estar vacía.';
  } else if (body.category.trim().length > 60) {
    errors.category = 'La categoría no debe superar 60 caracteres.';
  }
  if (!isPositiveFiniteNumber(body.price)) {
    errors.price = 'El precio debe ser un número mayor que cero.';
  }
  if (body.stock !== undefined && !isNonNegativeInteger(body.stock)) {
    errors.stock = 'El stock debe ser un entero mayor o igual a cero.';
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.description = 'La descripción debe ser una cadena de texto.';
  } else if (body.description !== undefined && body.description.length > 1000) {
    errors.description = 'La descripción no debe superar 1000 caracteres.';
  }
  if (body.imageUrl !== undefined && !isNullOrString(body.imageUrl)) {
    errors.imageUrl = 'La URL de la imagen debe ser una cadena o null.';
  } else if (body.imageUrl !== undefined && typeof body.imageUrl === 'string' && body.imageUrl.length > 2048) {
    errors.imageUrl = 'La URL de la imagen no debe superar 2048 caracteres.';
  }
  if (body.imagePublicId !== undefined && !isNullOrString(body.imagePublicId)) {
    errors.imagePublicId = 'El public_id de la imagen debe ser una cadena o null.';
  } else if (body.imagePublicId !== undefined && typeof body.imagePublicId === 'string' && body.imagePublicId.length > 2048) {
    errors.imagePublicId = 'El public_id de la imagen no debe superar 2048 caracteres.';
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
    } else if (key === 'name' && value.trim().length > 120) {
      errors.name = 'El nombre no debe superar 120 caracteres.';
    } else if (key === 'category' && !isNonEmptyString(value)) {
      errors.category = 'La categoría no debe estar vacía.';
    } else if (key === 'category' && value.trim().length > 60) {
      errors.category = 'La categoría no debe superar 60 caracteres.';
    } else if (key === 'price' && !isPositiveFiniteNumber(value)) {
      errors.price = 'El precio debe ser un número mayor que cero.';
    } else if (key === 'stock' && !isNonNegativeInteger(value)) {
      errors.stock = 'El stock debe ser un entero mayor o igual a cero.';
    } else if (key === 'description' && typeof value !== 'string') {
      errors.description = 'La descripción debe ser una cadena de texto.';
    } else if (key === 'description' && value.length > 1000) {
      errors.description = 'La descripción no debe superar 1000 caracteres.';
    } else if (
      key === 'imageUrl' &&
      value !== undefined &&
      !isNullOrString(value)
    ) {
      errors.imageUrl = 'La URL de la imagen debe ser una cadena o null.';
    } else if (
      key === 'imageUrl' &&
      typeof value === 'string' &&
      value.length > 2048
    ) {
      errors.imageUrl = 'La URL de la imagen no debe superar 2048 caracteres.';
    } else if (
      key === 'imagePublicId' &&
      value !== undefined &&
      !isNullOrString(value)
    ) {
      errors.imagePublicId = 'El public_id de la imagen debe ser una cadena o null.';
    } else if (
      key === 'imagePublicId' &&
      typeof value === 'string' &&
      value.length > 2048
    ) {
      errors.imagePublicId = 'El public_id de la imagen no debe superar 2048 caracteres.';
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
      WHERE owner_id = $1
      ORDER BY id DESC`,
      [req.user.id]
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
      WHERE id = $1 AND owner_id = $2`,
      [productId, req.user.id]
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
router.post('/', upload.single('image'), async (req, res, next) => {
  // Normaliza campos numéricos que pueden llegar como string en multipart/form-data
  const body = { ...req.body };
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.stock === 'string') body.stock = Number(body.stock);

  const validation = validateCreateProduct(body);
  if (!validation.ok) {
    return res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
      details: validation.details,
    });
  }

  const data = validation.data;

  // Carga de imagen opcional
  if (req.file) {
    const detected = detectImageMimetype(req.file.buffer);
    if (!detected) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El archivo no es una imagen válida (JPEG, PNG, WebP o GIF).',
      });
    }
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message:
          'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET para habilitar la carga de imágenes.',
      });
    }
    try {
      const { url, publicId } = await uploadImage(req.file.buffer, { mimetype: detected });
      data.imageUrl = url;
      data.imagePublicId = publicId;
    } catch (err) {
      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'No se pudo subir la imagen.',
      });
    }
  }

  const { name, category, price, stock, description, imageUrl, imagePublicId } = data;

  try {

    const result = await pool.query(
      `INSERT INTO products (owner_id, name, category, price, stock, description, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, owner_id, name, category, price, stock, description, image_url, image_public_id, created_at, updated_at`,
      [req.user.id, name.trim(), category.trim(), price, stock ?? 0, description ?? '', imageUrl ?? null, imagePublicId ?? null]
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
router.put('/:id', upload.single('image'), async (req, res, next) => {
  const productId = validateProductId(req.params.id);
  if (productId === null) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'El identificador de producto debe ser numérico.',
    });
  }

  // Normaliza campos numéricos que pueden llegar como string en multipart/form-data
  const body = { ...req.body };
  if (typeof body.price === 'string') body.price = Number(body.price);
  if (typeof body.stock === 'string') body.stock = Number(body.stock);

  const validation = validateUpdateProduct(body);
  if (!validation.ok) {
    return res.status(400).json({
      error: 'Bad Request',
      message: validation.error,
      details: validation.details,
    });
  }

  const data = validation.data;

  // Carga de imagen opcional (reemplaza la anterior)
  let oldPublicId = null;
  if (req.file) {
    const detected = detectImageMimetype(req.file.buffer);
    if (!detected) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El archivo no es una imagen válida (JPEG, PNG, WebP o GIF).',
      });
    }
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message:
          'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET para habilitar la carga de imágenes.',
      });
    }
    try {
      const { url, publicId } = await uploadImage(req.file.buffer, { mimetype: detected });
      data.imageUrl = url;
      data.imagePublicId = publicId;
    } catch (err) {
      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'No se pudo subir la imagen.',
      });
    }
  }

  const fields = Object.keys(data);

  try {
    const existing = await pool.query(
      'SELECT id, image_public_id FROM products WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [productId, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No existe un producto con el id ${productId}.`,
      });
    }

    oldPublicId = existing.rows[0].image_public_id;

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
    values.push(req.user.id);

    const query = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND owner_id = $${paramIndex + 1}
      RETURNING id, name, category, price, stock, description, image_url, image_public_id, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const updated = mapProduct(result.rows[0]);

    // Elimina la imagen anterior de Cloudinary solo tras éxito de BD.
    // Best-effort: un fallo de Cloudinary no invalida la actualización.
    if (req.file && oldPublicId && oldPublicId !== data.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (err) {
        console.error('No se pudo eliminar la imagen anterior de Cloudinary:', err.message);
      }
    }

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
      'SELECT id, stock, image_public_id FROM products WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [productId, req.user.id]
    );

    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Not Found',
        message: `No existe un producto con el id ${productId}.`,
      });
    }

    const discardedStock = product.rows[0].stock;
    const imagePublicId = product.rows[0].image_public_id;

    await client.query('DELETE FROM products WHERE id = $1 AND owner_id = $2', [productId, req.user.id]);

    await client.query('COMMIT');

    // Elimina la imagen asociada de Cloudinary tras commit exitoso (best-effort).
    // Si falla, el producto ya fue eliminado de BD; la imagen queda huérfana
    // y puede limpiarse manualmente con el publicId.
    if (imagePublicId) {
      try {
        await cloudinary.uploader.destroy(imagePublicId);
      } catch (err) {
        console.error('No se pudo eliminar la imagen de Cloudinary:', err.message);
      }
    }

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
