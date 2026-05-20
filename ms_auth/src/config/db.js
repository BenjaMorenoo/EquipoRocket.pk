// src/config/db.js
// Pool de conexiones PostgreSQL. Un solo pool compartido por toda la app.

import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool(env.db);

// Verificar conexión al arrancar
pool.on('connect', () => {
  logger.debug('Nueva conexión establecida con PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL', { error: err.message });
});

/**
 * Ejecuta una query con parámetros.
 * @param {string} text  - SQL
 * @param {any[]}  params - Parámetros ($1, $2 ...)
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente del pool para transacciones.
 * Recuerda llamar client.release() al terminar.
 */
export const getClient = () => pool.connect();

/**
 * Ejecuta varias queries dentro de una transacción.
 * Hace rollback automático si algo falla.
 * @param {function} fn - async (client) => { ... return result }
 */
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Prueba la conexión y devuelve true/false.
 */
export const testConnection = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};
