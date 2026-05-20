// src/routes/authRoutes.js
import { Router }       from 'express';
import rateLimit        from 'express-rate-limit';
import { env }          from '../config/env.js';
import * as ctrl        from '../controllers/authController.js';
import {
  requireAuth,
  requireAdmin,
  requireInternal,
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../middleware/index.js';

const router = Router();

/* ── Rate limiters específicos para auth ────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.authMax,   // 10 intentos por ventana de 15 min
  message:  { success: false, error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Espera antes de intentarlo de nuevo.' } },
  standardHeaders: true,
  legacyHeaders:   false,
});

/* ── Rutas públicas ─────────────────────────────────────────────────────── */

// POST /api/auth/register
router.post('/register',
  authLimiter,
  validate(registerSchema),
  ctrl.register
);

// POST /api/auth/login
router.post('/login',
  authLimiter,
  validate(loginSchema),
  ctrl.login
);

// POST /api/auth/refresh  — usa la cookie httpOnly
router.post('/refresh', ctrl.refresh);

// POST /api/auth/logout
router.post('/logout', ctrl.logout);

/* ── Rutas protegidas (requieren access token válido) ───────────────────── */

// GET  /api/auth/me
router.get('/me', requireAuth, ctrl.me);

// PUT  /api/auth/me
router.put('/me', requireAuth, validate(updateProfileSchema), ctrl.updateMe);

// POST /api/auth/logout-all
router.post('/logout-all', requireAuth, ctrl.logoutAll);

/* ── Ruta interna — para otros microservicios ───────────────────────────── */

// POST /api/auth/verify
// Los microservicios envían: Authorization: Bearer <token> + X-Internal-Key: <key>
router.post('/verify',
  requireInternal,
  requireAuth,
  ctrl.verifyToken
);

/* ── Health check del microservicio ─────────────────────────────────────── */
router.get('/health', (_req, res) =>
  res.json({ success: true, service: 'auth-service', status: 'ok', timestamp: new Date().toISOString() })
);

export default router;
