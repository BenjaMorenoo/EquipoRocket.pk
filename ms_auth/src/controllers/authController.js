// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import { env }                  from '../config/env.js';
import { logger }               from '../utils/logger.js';
import { generateTokens, verifyRefreshToken, refreshTokenExpiry } from '../utils/jwt.js';
import * as User                from '../models/userModel.js';

/* ── Helper: respuesta de error uniforme ────────────────────────────────── */
const err = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

/* ── Helper: setea la cookie httpOnly con el refresh token ──────────────── */
const setRefreshCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   env.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 días en ms
    path:     '/api/auth',
  });
};

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/auth/register
   ══════════════════════════════════════════════════════════════════════════ */
export const register = async (req, res) => {
  try {
    const {
      username, email, password,
      region_id, country_id, fecha_nac,
    } = req.body;

    // ── Verificar duplicados ─────────────────────────────────────────────
    const [emailTaken, usernameTaken] = await Promise.all([
      User.emailExists(email),
      User.usernameExists(username),
    ]);

    if (emailTaken)    return err(res, 409, 'EMAIL_TAKEN',    'Este correo ya está registrado.');
    if (usernameTaken) return err(res, 409, 'USERNAME_TAKEN', 'Este nombre de usuario ya está en uso.');

    // ── Hash de contraseña ───────────────────────────────────────────────
    const password_hash = await bcrypt.hash(password, env.bcryptRounds);

    // ── Crear usuario ────────────────────────────────────────────────────
    const user = await User.createUser({
      username, email, password_hash,
      region_id:  region_id  ?? null,
      country_id: country_id ?? null,
      fecha_nac:  fecha_nac  ?? null,
    });

    // ── Generar tokens ───────────────────────────────────────────────────
    const { accessToken, refreshToken } = generateTokens({
      ...user, is_admin: false,
    });

    await User.saveRefreshToken({
      user_id:    user.id,
      token:      refreshToken,
      expires_at: refreshTokenExpiry(),
      user_agent: req.headers['user-agent'],
      ip_address: req.ip,
    });

    setRefreshCookie(res, refreshToken);

    logger.info('Usuario registrado', { userId: user.id, username: user.username });

    return res.status(201).json({
      success: true,
      message: 'Registro exitoso.',
      data: {
        user,
        accessToken,
      },
    });

  } catch (e) {
    logger.error('Error en registro', { error: e.message, stack: e.stack });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/auth/login
   ══════════════════════════════════════════════════════════════════════════ */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    // identifier puede ser email o username

    // ── Buscar usuario ───────────────────────────────────────────────────
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(identifier.trim());
    const found   = isEmail
      ? await User.findByEmailWithHash(identifier)
      : await User.findByUsernameWithHash(identifier);

    // Mensaje genérico para no revelar si existe o no
    if (!found) {
      return err(res, 401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas.');
    }

    if (!found.is_active) {
      return err(res, 403, 'ACCOUNT_INACTIVE', 'Tu cuenta está desactivada. Contacta al administrador.');
    }

    // ── Verificar contraseña ─────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, found.password_hash);
    if (!passwordMatch) {
      return err(res, 401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas.');
    }

    // ── Generar tokens ───────────────────────────────────────────────────
    const { accessToken, refreshToken } = generateTokens(found);

    await User.saveRefreshToken({
      user_id:    found.id,
      token:      refreshToken,
      expires_at: refreshTokenExpiry(),
      user_agent: req.headers['user-agent'],
      ip_address: req.ip,
    });

    setRefreshCookie(res, refreshToken);

    // Obtener perfil completo (sin password_hash)
    const user = await User.findById(found.id, { includeAdmin: found.is_admin });

    logger.info('Login exitoso', { userId: found.id, username: found.username });

    return res.status(200).json({
      success: true,
      message: 'Login exitoso.',
      data: { user, accessToken },
    });

  } catch (e) {
    logger.error('Error en login', { error: e.message });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/auth/refresh
   ══════════════════════════════════════════════════════════════════════════ */
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return err(res, 401, 'NO_REFRESH_TOKEN', 'Refresh token no proporcionado.');

    // ── Verificar firma ──────────────────────────────────────────────────
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return err(res, 401, 'INVALID_REFRESH_TOKEN', 'Refresh token inválido o expirado.');
    }

    // ── Verificar que no esté revocado en la DB ──────────────────────────
    const stored = await User.findRefreshToken(token);
    if (!stored) {
      return err(res, 401, 'REVOKED_REFRESH_TOKEN', 'Refresh token revocado o expirado.');
    }

    if (!stored.is_active) {
      await User.revokeRefreshToken(token);
      return err(res, 403, 'ACCOUNT_INACTIVE', 'Tu cuenta está desactivada.');
    }

    // ── Revocar el token usado (rotación de tokens) ──────────────────────
    await User.revokeRefreshToken(token);

    // ── Emitir nuevos tokens ─────────────────────────────────────────────
    const user = await User.findById(payload.sub, { includeAdmin: true });
    if (!user) return err(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado.');

    const { accessToken, refreshToken: newRefresh } = generateTokens(user);

    await User.saveRefreshToken({
      user_id:    user.id,
      token:      newRefresh,
      expires_at: refreshTokenExpiry(),
      user_agent: req.headers['user-agent'],
      ip_address: req.ip,
    });

    setRefreshCookie(res, newRefresh);

    return res.status(200).json({
      success: true,
      data: { accessToken },
    });

  } catch (e) {
    logger.error('Error en refresh', { error: e.message });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/auth/logout
   ══════════════════════════════════════════════════════════════════════════ */
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await User.revokeRefreshToken(token);

    res.clearCookie('refreshToken', { path: '/api/auth' });

    return res.status(200).json({ success: true, message: 'Sesión cerrada.' });

  } catch (e) {
    logger.error('Error en logout', { error: e.message });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/auth/logout-all
   Cierra sesión en todos los dispositivos.
   ══════════════════════════════════════════════════════════════════════════ */
export const logoutAll = async (req, res) => {
  try {
    await User.revokeAllUserTokens(req.user.sub);
    res.clearCookie('refreshToken', { path: '/api/auth' });

    return res.status(200).json({ success: true, message: 'Todas las sesiones cerradas.' });

  } catch (e) {
    logger.error('Error en logout-all', { error: e.message });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   GET /api/auth/me
   Devuelve el perfil del usuario autenticado.
   ══════════════════════════════════════════════════════════════════════════ */
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub, { includeAdmin: req.user.is_admin });
    if (!user) return err(res, 404, 'USER_NOT_FOUND', 'Usuario no encontrado.');

    return res.status(200).json({ success: true, data: { user } });

  } catch (e) {
    logger.error('Error en /me', { error: e.message });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/auth/verify
   Endpoint interno — otros microservicios validan tokens aquí.
   ══════════════════════════════════════════════════════════════════════════ */
export const verifyToken = async (req, res) => {
  // El middleware requireAuth ya validó el token.
  // Si llegamos aquí, el token es válido.
  return res.status(200).json({
    success: true,
    data: {
      userId:   req.user.sub,
      username: req.user.username,
      email:    req.user.email,
      is_admin: req.user.is_admin,
    },
  });
};

/* ══════════════════════════════════════════════════════════════════════════
   PUT /api/auth/me  — Actualizar perfil
   ══════════════════════════════════════════════════════════════════════════ */
export const updateMe = async (req, res) => {
  try {
    const { username, email, region_id, country_id, fecha_nac } = req.body;
    const userId = req.user.sub;

    // Verificar duplicados solo si cambian
    if (email) {
      const current = await User.findById(userId);
      if (email.toLowerCase() !== current.email.toLowerCase()) {
        if (await User.emailExists(email))
          return err(res, 409, 'EMAIL_TAKEN', 'Este correo ya está registrado.');
      }
    }

    if (username) {
      const current = await User.findById(userId);
      if (username.toLowerCase() !== current.username.toLowerCase()) {
        if (await User.usernameExists(username))
          return err(res, 409, 'USERNAME_TAKEN', 'Este nombre de usuario ya está en uso.');
      }
    }

    const updated = await User.updateUser(userId, {
      ...(username   && { username }),
      ...(email      && { email: email.toLowerCase() }),
      ...(region_id  !== undefined && { region_id }),
      ...(country_id !== undefined && { country_id }),
      ...(fecha_nac  !== undefined && { fecha_nac }),
    });

    logger.info('Perfil actualizado', { userId });
    return res.status(200).json({ success: true, data: { user: updated } });

  } catch (e) {
    logger.error('Error en updateMe', { error: e.message });
    return err(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  }
};
