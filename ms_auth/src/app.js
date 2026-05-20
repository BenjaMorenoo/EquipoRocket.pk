// src/app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import { register } from './controllers/authController.js';
import { env } from './config/env.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/auth', authRoutes);

// Alias conveniente para clientes que esperan ruta /register
app.post('/register', register);

app.get('/', (req,res) => res.json({ service: 'ms_auth' }));

export default app;
