// src/models/userModel.js
// Toda la lógica de acceso a datos del usuario.
// Los controladores NO tocan la DB directamente — siempre pasan por aquí.

import { query, withTransaction } from '../config/db.js';

/* ── Columnas seguras para devolver al cliente ───────────────────────────── */
// password_hash NUNCA se devuelve en las respuestas públicas
const PUBLIC_FIELDS = `
  id, username, email,
  region_id, country_id, fecha_nac,
  is_active, created_at, updated_at
`;

// Campos visibles solo para admins
const ADMIN_FIELDS = `
  id, username, email,
  region_id, country_id, fecha_nac,
  is_admin, is_active, created_at, updated_at
`;

/* ── Crear usuario ──────────────────────────────────────────────────────── */
export const createUser = async ({ username, email, password_hash, region_id, country_id, fecha_nac }) => {
  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, region_id, country_id, fecha_nac)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${PUBLIC_FIELDS}`,
    [username.trim(), email.trim().toLowerCase(), password_hash, region_id ?? null, country_id ?? null, fecha_nac ?? null]
  );
  return rows[0];
};

/* ── Buscar por ID ──────────────────────────────────────────────────────── */
export const findById = async (id, { includeAdmin = false } = {}) => {
  const fields = includeAdmin ? ADMIN_FIELDS : PUBLIC_FIELDS;
  const { rows } = await query(
    `SELECT ${fields} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

/* ── Buscar por email (incluye hash para login) ─────────────────────────── */
export const findByEmailWithHash = async (email) => {
  const { rows } = await query(
    `SELECT id, username, email, password_hash, is_admin, is_active
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  return rows[0] ?? null;
};

/* ── Buscar por username (incluye hash para login) ──────────────────────── */
export const findByUsernameWithHash = async (username) => {
  const { rows } = await query(
    `SELECT id, username, email, password_hash, is_admin, is_active
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username.trim()]
  );
  return rows[0] ?? null;
};

/* ── Verificar si email ya existe ───────────────────────────────────────── */
export const emailExists = async (email) => {
  const { rows } = await query(
    `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email.trim()]
  );
  return rows.length > 0;
};

/* ── Verificar si username ya existe ────────────────────────────────────── */
export const usernameExists = async (username) => {
  const { rows } = await query(
    `SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username.trim()]
  );
  return rows.length > 0;
};

/* ── Actualizar datos de perfil ─────────────────────────────────────────── */
export const updateUser = async (id, fields) => {
  // Solo permite actualizar campos específicos (whitelist)
  const allowed  = ['username', 'email', 'region_id', 'country_id', 'fecha_nac'];
  const keys     = Object.keys(fields).filter(k => allowed.includes(k));
  if (!keys.length) throw new Error('No hay campos válidos para actualizar.');

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values     = keys.map(k => fields[k]);

  const { rows } = await query(
    `UPDATE users SET ${setClauses} WHERE id = $1 RETURNING ${PUBLIC_FIELDS}`,
    [id, ...values]
  );
  return rows[0] ?? null;
};

/* ── Actualizar contraseña ──────────────────────────────────────────────── */
export const updatePassword = async (id, password_hash) => {
  await query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [password_hash, id]
  );
};

/* ── Guardar refresh token ──────────────────────────────────────────────── */
export const saveRefreshToken = async ({ user_id, token, expires_at, user_agent, ip_address }) => {
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, token, expires_at, user_agent ?? null, ip_address ?? null]
  );
};

/* ── Buscar refresh token válido ────────────────────────────────────────── */
export const findRefreshToken = async (token) => {
  const { rows } = await query(
    `SELECT rt.*, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token = $1
       AND rt.revoked = FALSE
       AND rt.expires_at > NOW()`,
    [token]
  );
  return rows[0] ?? null;
};

/* ── Revocar refresh token (logout) ─────────────────────────────────────── */
export const revokeRefreshToken = async (token) => {
  await query(
    `UPDATE refresh_tokens
     SET revoked = TRUE, revoked_at = NOW()
     WHERE token = $1`,
    [token]
  );
};

/* ── Revocar todos los tokens del usuario (logout de todos los dispositivos) */
export const revokeAllUserTokens = async (user_id) => {
  await query(
    `UPDATE refresh_tokens
     SET revoked = TRUE, revoked_at = NOW()
     WHERE user_id = $1 AND revoked = FALSE`,
    [user_id]
  );
};

/* ── Listar todos los usuarios (solo admin) ─────────────────────────────── */
export const listUsers = async ({ limit = 50, offset = 0, search = '' }) => {
  const hasSearch = search.trim().length > 0;
  const { rows } = await query(
    `SELECT ${ADMIN_FIELDS},
            (SELECT COUNT(*) FROM refresh_tokens rt WHERE rt.user_id = users.id AND rt.revoked = FALSE) AS active_sessions
     FROM users
     WHERE ($1 = '' OR LOWER(username) LIKE '%' || LOWER($1) || '%' OR LOWER(email) LIKE '%' || LOWER($1) || '%')
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [search.trim(), limit, offset]
  );
  const total = await query(
    `SELECT COUNT(*) FROM users WHERE ($1 = '' OR LOWER(username) LIKE '%' || LOWER($1) || '%' OR LOWER(email) LIKE '%' || LOWER($1) || '%')`,
    [search.trim()]
  );
  return { users: rows, total: parseInt(total.rows[0].count) };
};

/* ── Eliminar usuario (solo admin) ──────────────────────────────────────── */
export const deleteUser = async (id) => {
  // Los refresh_tokens se eliminan en cascada (ON DELETE CASCADE)
  const { rows } = await query(
    `DELETE FROM users WHERE id = $1 RETURNING id, username`,
    [id]
  );
  return rows[0] ?? null;
};

/* ── Promover/degradar a admin (solo admin) ──────────────────────────────── */
export const setAdminRole = async (id, is_admin) => {
  const { rows } = await query(
    `UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING ${ADMIN_FIELDS}`,
    [is_admin, id]
  );
  return rows[0] ?? null;
};
