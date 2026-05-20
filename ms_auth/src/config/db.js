// src/config/db.js
// Pool de conexiones a PostgreSQL
import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;
export const pool = new Pool(env.db);

pool.on('connect', () => console.debug('[ms_auth] Conectado a Postgres'));
pool.on('error', (err) => console.error('[ms_auth] Error en pool Postgres', err.message));

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
