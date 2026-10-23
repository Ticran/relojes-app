import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';

dotenv.config();

// Pool de conexiones a PostgreSQL (valida DATABASE_URL al importarse)
import { pool } from './db/pool.js';

const app = express();

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy: habilitar solo en producción cuando se despliegue detrás de un
// proxy confiable (Render, Heroku, etc.) y la variable TRUST_PROXY=1 esté
// definida. En desarrollo (y por defecto) permanece desactivado.
if (isProduction && process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// CORS
// - Desarrollo: si CORS_ORIGIN no está definida, permitir únicamente
//   http://localhost:5173.
// - Producción: exigir CORS_ORIGIN; si falta, no iniciar el servidor.
// - CORS_ORIGIN se interpreta como lista separada por comas.
// - credentials: true para permitir cookies de sesión cross-origin.
// ---------------------------------------------------------------------------
const corsOriginRaw = process.env.CORS_ORIGIN;

let corsOrigin;

if (isProduction) {
  if (!corsOriginRaw) {
    throw new Error(
      'CORS_ORIGIN es obligatoria en producción. Defínela en el entorno antes de iniciar el servidor.'
    );
  }
  corsOrigin = corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean);
} else {
  corsOrigin = corsOriginRaw
    ? corsOriginRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : 'http://localhost:5173';
}

app.use(cors({ origin: corsOrigin, credentials: true }));

// Middleware para procesar cuerpos de solicitud en JSON
app.use(express.json());

// ---------------------------------------------------------------------------
// Sesiones (persistidas en PostgreSQL mediante connect-pg-simple)
// ---------------------------------------------------------------------------
const PgSession = pgSession(session);

if (!process.env.SESSION_SECRET) {
  if (isProduction) {
    throw new Error('SESSION_SECRET es obligatoria en producción.');
  }
  console.warn('ADVERTENCIA: SESSION_SECRET no definida; usando valor inseguro solo para desarrollo.');
}

const sessionStore = new PgSession({
  pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
});

// Manejo explícito de errores del almacén de sesiones (PostgreSQL).
// No se registran secretos, cookies ni datos sensibles.
sessionStore.on('error', (err) => {
  console.error('Error en el almacén de sesiones:', err && err.message);
});

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    },
  })
);

// Rutas
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import movementsRouter from './routes/movements.js';

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/movements', movementsRouter);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'relojes-app-api',
    timestamp: new Date().toISOString(),
  });
});

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'La ruta solicitada no existe.',
  });
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  // Express 4/5 lanza un error de tipo entity.parse.failed
  // cuando el JSON enviado no es válido
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'La solicitud contiene un JSON mal formado.',
    });
  }

  // En producción no se exponen trazas internas ni detalles sensibles
  console.error(err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Ocurrió un error inesperado en el servidor.',
  });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor de la API escuchando en el puerto ${PORT}`);
});

