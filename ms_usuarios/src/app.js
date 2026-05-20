import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import teamRoutes from './routes/teamRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { env } from './config/env.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req,res) => res.json({ service: 'ms_usuarios' }));

export default app;
