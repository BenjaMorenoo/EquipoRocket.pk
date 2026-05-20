// src/config/env.js
// Carga y valida todas las variables de entorno al arrancar el servicio.
// Si falta alguna requerida, el proceso termina antes de levantar Express.

import 'dotenv/config';

const required = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[auth-service] ❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  console.error('[auth-service] Copia .env.example como .env y completa los valores.');
  process.exit(1);
}

export const env = {
  nodeEnv:    process.env.NODE_ENV        || 'development',
  port:       parseInt(process.env.PORT)  || 3001,
  service:    process.env.SERVICE_NAME    || 'auth-service',

  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max:      parseInt(process.env.DB_POOL_MAX)     || 10,
    idleTimeoutMillis:    parseInt(process.env.DB_POOL_IDLE)    || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
  },

  jwt: {
    accessSecret:   process.env.JWT_ACCESS_SECRET,
    refreshSecret:  process.env.JWT_REFRESH_SECRET,
    accessExpires:  process.env.JWT_ACCESS_EXPIRES  || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  rateLimit: {
    windowMs:  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max:       parseInt(process.env.RATE_LIMIT_MAX)        || 100,
    authMax:   parseInt(process.env.AUTH_RATE_LIMIT_MAX)   || 10,
  },

  internalKey: process.env.INTERNAL_SERVICE_KEY || '',
};
