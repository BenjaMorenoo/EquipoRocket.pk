// src/utils/jwt.js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Genera el par access + refresh token para un usuario.
 * El payload del access token NO incluye datos sensibles.
 */
export const generateTokens = (user) => {
  const payload = {
    sub:      user.id,
    username: user.username,
    email:    user.email,
    is_admin: user.is_admin,
  };

  const accessToken = jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
    issuer:    'equiporocket-auth',
    audience:  'equiporocket-client',
  });

  const refreshToken = jwt.sign(
    { sub: user.id },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpires,
      issuer:    'equiporocket-auth',
      audience:  'equiporocket-client',
    }
  );

  return { accessToken, refreshToken };
};

/**
 * Verifica y decodifica el access token.
 * Lanza error si es inválido o expirado.
 */
export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwt.accessSecret, {
    issuer:   'equiporocket-auth',
    audience: 'equiporocket-client',
  });

/**
 * Verifica y decodifica el refresh token.
 */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.jwt.refreshSecret, {
    issuer:   'equiporocket-auth',
    audience: 'equiporocket-client',
  });

/**
 * Calcula la fecha de expiración del refresh token para guardarla en la DB.
 */
export const refreshTokenExpiry = () => {
  const ms = parseDuration(env.jwt.refreshExpires);
  return new Date(Date.now() + ms);
};

// Parsea strings como "7d", "15m", "1h" a milisegundos
const parseDuration = (str) => {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match  = String(str).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000; // default 7 días
  return parseInt(match[1]) * units[match[2]];
};
