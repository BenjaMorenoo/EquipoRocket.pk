// src/models/userModel.js
// Acceso a datos para la tabla `users` en la base de ms_db.
import { query } from '../config/db.js';

const PUBLIC_FIELDS = `id, username, email, region_id, country_id, fecha_nac, is_admin, is_active, created_at`;

export const createUser = async ({ username, email, password_hash, region_id, country_id, fecha_nac, is_admin = false }) => {
  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, region_id, country_id, fecha_nac, is_admin)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING ${PUBLIC_FIELDS}`,
    [username.trim(), email.trim().toLowerCase(), password_hash, region_id ?? null, country_id ?? null, fecha_nac ?? null, is_admin === true]
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

export const getUserByEmail = async (email) => {
  const { rows } = await query(`SELECT * FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [email.trim()]);
  return rows[0] || null;
};

export const getUserById = async (id) => {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
};

export const getUserByUsername = async (username) => {
  const { rows } = await query(`SELECT * FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1`, [username.trim()]);
  return rows[0] || null;
};

export const listUsers = async () => {
  const { rows } = await query(`SELECT id, username, email, region_id, country_id, fecha_nac, is_admin, is_active, created_at FROM users ORDER BY created_at DESC`);
  return rows;
};

export const setUserActive = async (id, active) => {
  const { rows } = await query(`UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, email, region_id, country_id, fecha_nac, is_admin, is_active, created_at`, [active, id]);
  return rows[0] || null;
};

export const updateUserProfile = async (id, { username, email, region_id, country_id, fecha_nac }) => {
  const { rows } = await query(
    `UPDATE users SET username = $1, email = $2, region_id = $3, country_id = $4, fecha_nac = $5 WHERE id = $6 RETURNING id, username, email, region_id, country_id, fecha_nac, is_admin, is_active, created_at`,
    [username.trim(), email.trim().toLowerCase(), region_id ?? null, country_id ?? null, fecha_nac ?? null, id]
  );
  return rows[0] || null;
};

export const countAdmins = async () => {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM users WHERE is_admin = true`);
  return rows[0].count;
};

export const deleteUser = async (id) => {
  const { rows } = await query(
    `DELETE FROM users WHERE id = $1 RETURNING id, username, email`,
    [id]
  );
  return rows[0] || null;
};
