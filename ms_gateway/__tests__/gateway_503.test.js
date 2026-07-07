/**
 * Prueba los handlers onError de cada proxy apuntando todos los servicios a
 * un puerto cerrado (127.0.0.1:1) para forzar ECONNREFUSED inmediato → 503.
 *
 * Se ejecuta en un proceso Jest separado del tests/gateway.test.js, por lo que
 * la importación de app.js es fresca y lee las variables de entorno definidas aquí.
 */
import { jest } from '@jest/globals';

// Puerto 1 del loopback → ECONNREFUSED inmediato en cualquier OS
const DEAD = 'http://127.0.0.1:1';

process.env.NODE_ENV        = 'test';
process.env.MS_AUTH_URL      = DEAD;
process.env.MS_USUARIOS_URL  = DEAD;
process.env.MS_POKEMON_URL   = DEAD;
process.env.MS_CARGA_API_URL = DEAD;
process.env.MS_MONTECARLO_URL = DEAD;
process.env.MS_ASISTENCIA_URL = DEAD;

const { default: app }     = await import('../app.js');
const { default: request } = await import('supertest');

// El proxy puede tardar si hay retries — bajamos el timeout por test
jest.setTimeout(15000);

describe('onError handlers — 503 cuando el upstream está caído', () => {
  test('POST /api/auth/login → 503 auth service unavailable', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'x' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/auth|unavailable/i);
  });

  test('GET /api/pokemon → 503 pokemon service unavailable', async () => {
    const res = await request(app).get('/api/pokemon');
    expect(res.status).toBe(503);
  });

  test('GET /api/usuarios/teams → 503 users service unavailable', async () => {
    const res = await request(app)
      .get('/api/usuarios/teams')
      .set('Authorization', 'Bearer tok');
    expect(res.status).toBe(503);
  });

  test('GET /api/teams → 503 teams service unavailable', async () => {
    const res = await request(app).get('/api/teams');
    expect(res.status).toBe(503);
  });

  test('GET /api/users → 503 users service unavailable', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(503);
  });

  test('POST /api/carga/load → 503 carga service unavailable', async () => {
    const res = await request(app).post('/api/carga/load').send({});
    expect(res.status).toBe(503);
  });

  test('POST /api/montecarlo/simulate → 503 montecarlo service unavailable', async () => {
    const res = await request(app).post('/api/montecarlo/simulate').send({});
    expect(res.status).toBe(503);
  });

  test('POST /api/asistencia/analyze/team → 503 asistencia service unavailable', async () => {
    const res = await request(app).post('/api/asistencia/analyze/team').send({});
    expect(res.status).toBe(503);
  });

  test('GET /api/usuarios/users (admin route) → 503', async () => {
    const res = await request(app)
      .get('/api/usuarios/users')
      .set('Authorization', 'Bearer tok');
    expect(res.status).toBe(503);
  });
});

describe('Endpoints propios del gateway no afectados por estado del upstream', () => {
  test('GET /health → 200 siempre', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET /gateway-info → 200 con URLs configuradas', async () => {
    const res = await request(app).get('/gateway-info');
    expect(res.status).toBe(200);
    expect(res.body.microservices.auth).toBe(DEAD);
  });

  test('GET /ruta-inexistente → 404', async () => {
    const res = await request(app).get('/ruta-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});
