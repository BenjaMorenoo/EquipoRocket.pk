import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;
export const pool = new Pool(env.db);

pool.on('connect', () => console.debug('[ms_usuarios] connected to Postgres'));
pool.on('error', (err) => console.error('[ms_usuarios] Postgres pool error', err.message));

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
