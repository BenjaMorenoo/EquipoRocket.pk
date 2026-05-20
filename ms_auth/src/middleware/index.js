// src/middleware/index.js
import { verifyAccessToken } from '../utils/jwt.js';
import { env }              from '../config/env.js';
import { logger }           from '../utils/logger.js';

const errJSON = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

/* ══════════════════════════════════════════════════════════════════════════
   requireAuth
   Verifica el JWT del header Authorization: Bearer <token>
   Inyecta req.user con el payload decodificado.
   ══════════════════════════════════════════════════════════════════════════ */
export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return errJSON(res, 401, 'NO_TOKEN', 'Token de acceso requerido.');
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errJSON(res, 401, 'TOKEN_EXPIRED', 'El token ha expirado. Refresca la sesión.');
    }
    return errJSON(res, 401, 'INVALID_TOKEN', 'Token inválido.');
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   requireAdmin
   Debe usarse DESPUÉS de requireAuth.
   Solo permite continuar si el usuario tiene is_admin = true.
   ══════════════════════════════════════════════════════════════════════════ */
export const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return errJSON(res, 403, 'FORBIDDEN', 'Acceso restringido a administradores.');
  }
  next();
};

/* ══════════════════════════════════════════════════════════════════════════
   requireInternal
   Para rutas solo accesibles entre microservicios (ej: /api/auth/verify).
   El servicio llamante debe enviar el header X-Internal-Key.
   ══════════════════════════════════════════════════════════════════════════ */
export const requireInternal = (req, res, next) => {
  const key = req.headers['x-internal-key'];
  if (!env.internalKey || key !== env.internalKey) {
    logger.warn('Intento de acceso interno sin clave válida', { ip: req.ip });
    return errJSON(res, 403, 'FORBIDDEN', 'Acceso no autorizado.');
  }
  next();
};

/* ══════════════════════════════════════════════════════════════════════════
   validate(schema)
   Valida req.body contra un objeto de reglas.
   Uso: router.post('/ruta', validate(registerSchema), controller)
   ══════════════════════════════════════════════════════════════════════════ */
export const validate = (schema) => (req, res, next) => {
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} es obligatorio.`;
      continue;
    }
    if (value === undefined || value === null || value === '') continue;

    if (rules.type === 'string') {
      if (typeof value !== 'string') { errors[field] = `${field} debe ser texto.`; continue; }
      const trimmed = value.trim();
      if (rules.minLength && trimmed.length < rules.minLength)
        errors[field] = `${field} debe tener al menos ${rules.minLength} caracteres.`;
      if (rules.maxLength && trimmed.length > rules.maxLength)
        errors[field] = `${field} no puede superar ${rules.maxLength} caracteres.`;
      if (rules.match && !rules.match.test(trimmed))
        errors[field] = rules.matchMessage || `${field} tiene un formato inválido.`;
    }

    if (rules.type === 'email') {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!re.test(String(value).trim()))
        errors[field] = 'Ingresa un correo electrónico válido.';
    }

    if (rules.type === 'date') {
      if (isNaN(Date.parse(value)))
        errors[field] = `${field} debe ser una fecha válida (YYYY-MM-DD).`;
    }

    if (rules.type === 'integer') {
      if (!Number.isInteger(Number(value)))
        errors[field] = `${field} debe ser un número entero.`;
    }
  }

  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', fields: errors } });
  }
  next();
};

/* ── Schemas de validación ─────────────────────────────────────────────── */
export const registerSchema = {
  username: {
    required: true, type: 'string', minLength: 1, maxLength: 50,
  },
  email: {
    required: true, type: 'email',
  },
  password: {
    required: true, type: 'string', minLength: 8,
    match: /^(?=.*[A-Z])(?=.*\d)(?=.*[.,\-_!@#$%^&*()+?]).{8,}$/,
    matchMessage: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.',
  },
  region_id:  { type: 'integer' },
  country_id: { type: 'integer' },
  fecha_nac:  { type: 'date'    },
};

export const loginSchema = {
  identifier: { required: true, type: 'string', minLength: 1, maxLength: 255 },
  password:   { required: true, type: 'string', minLength: 1 },
};

export const updateProfileSchema = {
  username:   { type: 'string', minLength: 1, maxLength: 50 },
  email:      { type: 'email' },
  region_id:  { type: 'integer' },
  country_id: { type: 'integer' },
  fecha_nac:  { type: 'date' },
};
