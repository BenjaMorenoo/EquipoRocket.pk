import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// ── Environment configuration ─────────────────────────────────────────────
const MS_AUTH_URL = process.env.MS_AUTH_URL || 'http://ms_auth:3001';
const MS_USUARIOS_URL = process.env.MS_USUARIOS_URL || 'http://ms_usuarios:3003';
const MS_POKEMON_URL = process.env.MS_POKEMON_URL || 'http://ms_pokemon:3002';
const MS_CARGA_API_URL = process.env.MS_CARGA_API_URL || 'http://ms_carga_api:8000';
const MS_MONTECARLO_URL = process.env.MS_MONTECARLO_URL || 'http://ms_montecarlo:8010';
const MS_ASISTENCIA_URL = process.env.MS_ASISTENCIA_URL || 'http://ms_asistencia:8005';

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request interceptor for auth token ───────────────────────────────────
app.use((req, res, next) => {
  // Forward auth token from browser header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    req.headers.authorization = authHeader;
  }
  next();
});

// ── Health check endpoint ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api_gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Gateway info endpoint ────────────────────────────────────────────────
app.get('/gateway-info', (req, res) => {
  res.json({
    gateway: 'API Gateway',
    version: '1.0.0',
    microservices: {
      auth: MS_AUTH_URL,
      usuarios: MS_USUARIOS_URL,
      pokemon: MS_POKEMON_URL,
      carga_api: MS_CARGA_API_URL,
      montecarlo: MS_MONTECARLO_URL,
      asistencia: MS_ASISTENCIA_URL,
    },
  });
});

// ── Route Proxies ────────────────────────────────────────────────────────

// Authentication routes → ms_auth
app.use(
  '/api/auth',
  createProxyMiddleware({
    target: MS_AUTH_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '/api/auth',
    },
    onError: (err, req, res) => {
      console.error('Auth service error:', err);
      res.status(503).json({ error: 'Authentication service unavailable' });
    },
  })
);

// Users/Teams routes → ms_usuarios
app.use(
  '/api/usuarios',
  createProxyMiddleware({
    target: MS_USUARIOS_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/usuarios': '/api',
    },
    onError: (err, req, res) => {
      console.error('Users service error:', err);
      res.status(503).json({ error: 'Users service unavailable' });
    },
  })
);

// Teams endpoint (alias to usuarios)
app.use(
  '/api/teams',
  createProxyMiddleware({
    target: MS_USUARIOS_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/teams': '/api/teams',
    },
    onError: (err, req, res) => {
      console.error('Teams service error:', err);
      res.status(503).json({ error: 'Teams service unavailable' });
    },
  })
);

// Users endpoint (alias to usuarios)
app.use(
  '/api/users',
  createProxyMiddleware({
    target: MS_USUARIOS_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': '/api/users',
    },
    onError: (err, req, res) => {
      console.error('Users service error:', err);
      res.status(503).json({ error: 'Users service unavailable' });
    },
  })
);

// Pokemon routes → ms_pokemon
app.use(
  '/api/pokemon',
  createProxyMiddleware({
    target: MS_POKEMON_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/pokemon': '/api/pokemon',
    },
    onError: (err, req, res) => {
      console.error('Pokemon service error:', err);
      res.status(503).json({ error: 'Pokemon service unavailable' });
    },
  })
);

// Data loading routes → ms_carga_api
app.use(
  '/api/carga',
  createProxyMiddleware({
    target: MS_CARGA_API_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/carga': '',
    },
    onError: (err, req, res) => {
      console.error('Data loading service error:', err);
      res.status(503).json({ error: 'Data loading service unavailable' });
    },
  })
);

// Monte Carlo routes → ms_montecarlo
app.use(
  '/api/montecarlo',
  createProxyMiddleware({
    target: MS_MONTECARLO_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/montecarlo': '',
    },
    onError: (err, req, res) => {
      console.error('Monte Carlo service error:', err);
      res.status(503).json({ error: 'Monte Carlo service unavailable' });
    },
  })
);

// Attendance routes → ms_asistencia
app.use(
  '/api/asistencia',
  createProxyMiddleware({
    target: MS_ASISTENCIA_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/asistencia': '',
    },
    onError: (err, req, res) => {
      console.error('Attendance service error:', err);
      res.status(503).json({ error: 'Attendance service unavailable' });
    },
  })
);

// ── Catch-all for unmapped routes ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found on gateway`,
    availableEndpoints: [
      'GET /health',
      'GET /gateway-info',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/usuarios/*',
      'GET /api/teams/*',
      'POST /api/teams',
      'PUT /api/teams/:id',
      'DELETE /api/teams/:id',
      'GET /api/users/*',
      'GET /api/pokemon/*',
      'POST /api/carga/load',
      'POST /api/montecarlo/simulate',
      'GET /api/asistencia/*',
    ],
  });
});

// ── Error handling ────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// ── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API Gateway listening on port ${PORT}`);
  console.log(`📡 Microservices configured:`);
  console.log(`   Auth: ${MS_AUTH_URL}`);
  console.log(`   Usuarios: ${MS_USUARIOS_URL}`);
  console.log(`   Pokemon: ${MS_POKEMON_URL}`);
  console.log(`   Carga API: ${MS_CARGA_API_URL}`);
  console.log(`   Monte Carlo: ${MS_MONTECARLO_URL}`);
  console.log(`   Asistencia: ${MS_ASISTENCIA_URL}`);
});
