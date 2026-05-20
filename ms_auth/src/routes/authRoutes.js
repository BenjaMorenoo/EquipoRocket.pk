// src/routes/authRoutes.js
import { Router } from 'express';
import { register } from '../controllers/authController.js';

const router = Router();

// Solo exponemos POST /api/auth/register para este microservicio
router.post('/register', register);

export default router;
