// src/app.js
import express          from 'express';
import cors             from 'cors';
import helmet           from 'helmet';
import rateLimit        from 'express-rate-limit';
import cookieParser     from 'cookie-parser';
import { env }          from './config/env.js';
import { logger }       from './utils/logger.js';
import authRoutes       from './routes/authRoutes.js';

const app = express();

/* ── Seguridad ──────────────────────────────────────────────────────────── */
app.use(helmet());
app.set('trust proxy', 1); // necesario si está detrás de un proxy/nginx

app.use(cors({
  origin:      env.cors.origin,
  credentials: true,              // permite enviar/recibir cookies
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key'],
}));

/* ── Rate limit global ──────────────────────────────────────────────────── */
app.use(rateLimit({
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.max,
  message:  { success: false, error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes.' } },
  standardHeaders: true,
  legacyHeaders:   false,
}));

/* ── Parsers ────────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ── Logger de requests ─────────────────────────────────────────────────── */
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

/* ── Rutas ──────────────────────────────────────────────────────────────── */
app.use('/api/auth', authRoutes);

/* ── 404 ────────────────────────────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } });
});

/* ── Error handler global ───────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error('Error no controlado', { error: err.message, stack: err.stack });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' } });
});

export default app;
