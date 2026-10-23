import { pool } from '../db/pool.js';

// Middleware de autenticación.
// Verifica que exista una sesión con userId válido y carga el usuario desde PostgreSQL.
export async function requireAuth(req, res, next) {
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
      // Sesión huérfana: destruir y responder 401.
      req.session.destroy(() => {});
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No hay una sesión autenticada.',
      });
    }

    req.user = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: result.rows[0].role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

// Middleware de autorización por rol.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permisos para realizar esta acción.',
      });
    }
    next();
  };
}