// src/routes/authRoutes.js
import { Router } from 'express';
import { register, login, me, updateMe, listUsers, setUserActive } from '../controllers/authController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// Solo exponemos POST /api/auth/register para este microservicio
router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.patch('/me', updateMe);

// Admin-only
router.get('/users', requireAdmin, listUsers);
router.patch('/users/:id/active', requireAdmin, setUserActive);

export default router;
