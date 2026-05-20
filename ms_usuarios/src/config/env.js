import 'dotenv/config';

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) console.warn('[ms_usuarios] Missing env:', missing.join(', '));

export const env = {
  port: parseInt(process.env.PORT) || 8080,
  jwt_secret: process.env.JWT_SECRET || process.env.JWT || 'dev_jwt_secret',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'equiporocketDb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX) || 10,
  }
};
