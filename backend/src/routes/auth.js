import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' ||
        username.trim() === '' || password === '') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Usuario y contraseña son obligatorios.',
      });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username.trim()]
    );

    const user = result.rows[0];
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !valid) {
      // Mensaje genérico para no revelar si el usuario existe.
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciales inválidas.',
      });
    }

    // Regenerar el identificador de sesión tras login exitoso.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.role = user.role;
      // Persistir explícitamente la sesión antes de responder.
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.json({ id: user.id, username: user.username, role: user.role });
      });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  if (!req.session) {
    return res.status(204).end();
  }
  req.session.destroy((err) => {
    if (err) return next(err);
    // Limpiar cookie con los mismos atributos relevantes.
    res.clearCookie('connect.sid', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.status(204).end();
  });
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No hay una sesión autenticada.',
      });
    }

    const result = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No hay una sesión autenticada.',
      });
    }

    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, role: u.role });
  } catch (err) {
    next(err);
  }
});

export default router;