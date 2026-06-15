import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Don't reveal the backend framework in responses (DAST: ZAP 10037)
app.disable('x-powered-by');

// ── Debugging: lightweight request logging to verify Authorization header forwarding
app.use((req, res, next) => {
  try {
    const hasAuth = !!req.headers.authorization;
    console.log(`[GW DEBUG] ${req.method} ${req.path} auth=${hasAuth}`);
  } catch (e) {
    // don't fail requests due to debugging
  }
  next();
});

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

// API responses are dynamic/per-user and must not be cached by intermediate
// proxies (DAST: ZAP 10049 - Storable and Cacheable Content)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ── Shared proxy body forwarding ─────────────────────────────────────────
// http-proxy-middleware copies the incoming request headers (including
// Content-Length) onto proxyReq before onProxyReq runs. Since express.json()
// already consumed the original body stream, the parsed body must be
// re-serialized and written here. Checking `Object.keys(req.body).length`
// (as the old per-route handlers did) skips this for an empty-but-valid `{}`
// body, leaving the stale Content-Length on proxyReq with nothing written --
// the target then hangs until proxyTimeout. body-parser always sets
// `req.body = {}` (even for GET/HEAD with no payload), so we gate on the
// method instead and always (re)write `req.body ?? {}` for methods that
// admit a body.
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function forwardJsonBody(proxyReq, req) {
  if (!METHODS_WITH_BODY.has(req.method)) return;
  const bodyData = JSON.stringify(req.body ?? {});
  proxyReq.setHeader('Content-Type', 'application/json');
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
}

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
    // Allow longer waits for auth service responses (ms)
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/auth': '/api/auth',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/auth -> ${MS_AUTH_URL} method=${req.method} auth=${hasAuth}`);

        // If the body was already parsed by express.json(), we need to
        // re-serialize and write it to the proxied request so the target
        // service receives the JSON body (otherwise the stream was consumed).
        forwardJsonBody(proxyReq, req);
      } catch (e) {
        // never break the proxy because of logging/debugging
      }
    },
    onError: (err, req, res) => {
      console.error('Auth service error:', err);
      res.status(503).json({ error: 'Authentication service unavailable' });
    },
  })
);

// Admin user management (some user management endpoints live in ms_auth)
app.use(
  '/api/usuarios/users',
  createProxyMiddleware({
    target: MS_AUTH_URL,
    changeOrigin: true,
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/usuarios/users': '/api/auth/users',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/usuarios/users -> ${MS_AUTH_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
    },
    onError: (err, req, res) => {
      console.error('Auth-users proxy error:', err);
      res.status(503).json({ error: 'Auth users proxy unavailable' });
    },
  })
);
 
// Users/Teams routes → ms_usuarios
app.use(
  '/api/usuarios',
  createProxyMiddleware({
    target: MS_USUARIOS_URL,
    changeOrigin: true,
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/usuarios': '/api',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/usuarios -> ${MS_USUARIOS_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
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
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/teams': '/api/teams',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/teams -> ${MS_USUARIOS_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
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
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/users': '/api/users',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/users -> ${MS_USUARIOS_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
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
    // longer timeout and forward parsed body
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/carga': '',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/carga -> ${MS_CARGA_API_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
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
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/montecarlo': '',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/montecarlo -> ${MS_MONTECARLO_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
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
    proxyTimeout: 60000,
    timeout: 60000,
    pathRewrite: {
      '^/api/asistencia': '',
    },
    onProxyReq: (proxyReq, req, res) => {
      try {
        const hasAuth = !!req.headers.authorization;
        console.log(`[GW PROXY] /api/asistencia -> ${MS_ASISTENCIA_URL} method=${req.method} auth=${hasAuth}`);
        forwardJsonBody(proxyReq, req);
      } catch (e) {}
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
// Skipped under tests so supertest can drive `app` directly without binding a port.
if (process.env.NODE_ENV !== 'test') {
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
}

export default app;
