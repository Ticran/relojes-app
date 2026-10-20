import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

// Pool de conexiones a PostgreSQL (valida DATABASE_URL al importarse)
import { pool } from './db/pool.js';

const app = express();

// Puerto desde variable de entorno, con valor por defecto 3000
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// CORS
// - Desarrollo: si CORS_ORIGIN no está definida, permitir únicamente
//   http://localhost:5173.
// - Producción: exigir CORS_ORIGIN; si falta, no iniciar el servidor.
// - CORS_ORIGIN se interpreta como lista separada por comas.
// ---------------------------------------------------------------------------
const corsOriginRaw = process.env.CORS_ORIGIN;
const isProduction = process.env.NODE_ENV === 'production';

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

app.use(cors({ origin: corsOrigin }));

// Middleware para procesar cuerpos de solicitud en JSON
app.use(express.json());

// Rutas
import productsRouter from './routes/products.js';

app.use('/api/products', productsRouter);

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

