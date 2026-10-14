import express from 'express';

const app = express();

// Puerto desde variable de entorno, con valor por defecto 3000
const PORT = process.env.PORT || 3000;

// Middleware para procesar cuerpos de solicitud en JSON
app.use(express.json());

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

