// src/config/env.js
// Variables de entorno y configuración mínima necesaria para el servicio.
import 'dotenv/config';

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('[ms_auth] Variables de entorno faltantes: ' + missing.join(', '));
  // No salir automáticamente: permitimos ejecución en entornos de desarrollo si se desea
}

export const env = {
  port: parseInt(process.env.PORT) || 3001,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'equiporocketDb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX) || 10,
  }
};
