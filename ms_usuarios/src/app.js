import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import teamRoutes from './routes/teamRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { requireAuth } from './middleware/auth.js';
import { getCollections, addCollection, removeCollection } from './controllers/userController.js';
import { env } from './config/env.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);

// Collection routes also mounted at /api/collections so the gateway path
// /api/usuarios/collections → (rewrite) → /api/collections works correctly.
app.get('/api/collections', requireAuth, getCollections);
app.post('/api/collections', requireAuth, addCollection);
app.delete('/api/collections/:pokemonId', requireAuth, removeCollection);

app.get('/', (req,res) => res.json({ service: 'ms_usuarios' }));

export default app;
