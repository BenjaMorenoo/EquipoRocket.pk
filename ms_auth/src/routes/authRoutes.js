// src/routes/authRoutes.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me, updateMe, listUsers, setUserActive, verifyPassword, deleteUser } from '../controllers/authController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// SEC-04: limita intentos de login por IP para mitigar fuerza bruta/credential
// stuffing (bcrypt.compare por sí solo solo agrega ~0.2-0.3s de latencia, ST-AUTH-01).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_ATTEMPTS' },
});

// Solo exponemos POST /api/auth/register para este microservicio
router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', me);
router.patch('/me', updateMe);
router.post('/verify-password', verifyPassword);

// Admin-only
router.get('/users', requireAdmin, listUsers);
router.patch('/users/:id/active', requireAdmin, setUserActive);
router.delete('/users/:id', requireAdmin, deleteUser);

export default router;
