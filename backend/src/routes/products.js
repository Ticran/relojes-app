import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

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

    const products = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      // pg devuelve NUMERIC como string; convertir a number para el frontend
      price: Number(row.price),
      stock: row.stock,
      description: row.description,
      imageUrl: row.image_url ?? null,
      imagePublicId: row.image_public_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(products);
  } catch (err) {
    next(err);
  }
});

export default router;
