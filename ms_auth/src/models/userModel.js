// src/models/userModel.js
// Acceso a datos para la tabla `users` en la base de ms_db.
import { query } from '../config/db.js';

const PUBLIC_FIELDS = `id, username, email, region_id, country_id, fecha_nac, is_active, created_at`;

export const createUser = async ({ username, email, password_hash, region_id, country_id, fecha_nac }) => {
  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, region_id, country_id, fecha_nac)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING ${PUBLIC_FIELDS}`,
    [username.trim(), email.trim().toLowerCase(), password_hash, region_id ?? null, country_id ?? null, fecha_nac ?? null]
  );
  return rows[0];
};

export const emailExists = async (email) => {
  const { rows } = await query(`SELECT 1 FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [email.trim()]);
  return rows.length > 0;
};

export const usernameExists = async (username) => {
  const { rows } = await query(`SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1`, [username.trim()]);
  return rows.length > 0;
};
