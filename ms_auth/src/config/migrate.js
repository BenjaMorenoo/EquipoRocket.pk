// src/config/migrate.js
// Crea las tablas necesarias si no existen.
// Ejecutar con: npm run migrate

import { pool } from './db.js';
import { logger } from '../utils/logger.js';

const migrations = [
  /* ── users ──────────────────────────────────────────────────────────── */
  `CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    username       VARCHAR(50)  UNIQUE NOT NULL,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    region_id      INTEGER,
    country_id     INTEGER,
    fecha_nac      DATE,
    is_admin       BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
  )`,

  /* ── índices para búsquedas frecuentes ──────────────────────────────── */
  `CREATE INDEX IF NOT EXISTS idx_users_email    ON users (LOWER(email))`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username))`,

  /* ── refresh_tokens ──────────────────────────────────────────────────── */
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(512) UNIQUE NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMP,
    user_agent  TEXT,
    ip_address  VARCHAR(45)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token   ON refresh_tokens (token)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id)`,

  /* ── trigger: actualiza updated_at automáticamente ──────────────────── */
  `CREATE OR REPLACE FUNCTION update_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
     ) THEN
       CREATE TRIGGER trg_users_updated_at
       BEFORE UPDATE ON users
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
     END IF;
   END;
   $$`,
];

const runMigrations = async () => {
  logger.info('Iniciando migraciones...');
  const client = await pool.connect();
  try {
    for (const sql of migrations) {
      await client.query(sql);
    }
    logger.info('✅ Migraciones completadas correctamente.');
  } catch (err) {
    logger.error('❌ Error en migración', { error: err.message });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations();
