import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL no está definida. Crea backend/.env con una conexión válida a PostgreSQL antes de iniciar el servidor.'
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones de pg:', err.message);
});
