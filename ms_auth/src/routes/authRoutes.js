// src/routes/authRoutes.js
import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';

const router = Router();

// Solo exponemos POST /api/auth/register para este microservicio
router.post('/register', register);
router.post('/login', login);
router.get('/me', me);

export default router;
