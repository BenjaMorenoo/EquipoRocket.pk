// server.js — punto de entrada para ms_auth (registro de usuarios)
import app from './src/app.js';
import { env } from './src/config/env.js';
import { pool } from './src/config/db.js';

const start = async () => {
  // Probar conexión a la BD
  try {
    await pool.query('SELECT 1');
    console.log('[ms_auth] Conexión a PostgreSQL OK');
  } catch (e) {
    console.error('[ms_auth] No se pudo conectar a Postgres:', e.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[ms_auth] Servidor corriendo en http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    console.log('Cerrando ms_auth...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
