// Pruebas unitarias de ms_gateway/app.js
// Cubre UT-GW-01 (enrutamiento de proxies hacia los MS_*_URL correctos, con
// reenvío del header Authorization y del body), UT-GW-02 (catch-all 404) y
// UT-GW-03 (/health y /gateway-info).
//
// Los targets de los proxies (MS_AUTH_URL, MS_POKEMON_URL, MS_USUARIOS_URL) se
// leen de variables de entorno al cargar el módulo, por lo que se levantan
// servidores HTTP "mock" en puertos efímeros ANTES de importar app.js y se
// apuntan esas variables hacia ellos. app.js no inicia su propio listener bajo
// NODE_ENV=test (ver cambio en app.js) y exporta `app` para supertest.
import { jest } from '@jest/globals';
import http from 'http';

function createMockServer() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, headers: req.headers, body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  return { server, calls };
}

const authMock = createMockServer();
const pokemonMock = createMockServer();
const usuariosMock = createMockServer();

await new Promise((resolve) => authMock.server.listen(0, '127.0.0.1', resolve));
await new Promise((resolve) => pokemonMock.server.listen(0, '127.0.0.1', resolve));
await new Promise((resolve) => usuariosMock.server.listen(0, '127.0.0.1', resolve));

process.env.NODE_ENV = 'test';
process.env.MS_AUTH_URL = `http://127.0.0.1:${authMock.server.address().port}`;
process.env.MS_POKEMON_URL = `http://127.0.0.1:${pokemonMock.server.address().port}`;
process.env.MS_USUARIOS_URL = `http://127.0.0.1:${usuariosMock.server.address().port}`;

const { default: app } = await import('../app.js');
const { default: request } = await import('supertest');

afterAll(async () => {
  await new Promise((resolve) => authMock.server.close(resolve));
  await new Promise((resolve) => pokemonMock.server.close(resolve));
  await new Promise((resolve) => usuariosMock.server.close(resolve));
});

beforeEach(() => {
  authMock.calls.length = 0;
  pokemonMock.calls.length = 0;
  usuariosMock.calls.length = 0;
});

describe('UT-GW-01: enrutamiento de proxies', () => {
  test('(a) POST /api/auth/login -> MS_AUTH_URL/api/auth/login, reenvía Authorization y body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Authorization', 'Bearer abc123')
      .send({ email: 'a@b.com', password: 'x' });

    expect(res.status).toBe(200);
    expect(authMock.calls).toHaveLength(1);
    const call = authMock.calls[0];
    expect(call.method).toBe('POST');
    expect(call.url).toBe('/api/auth/login');
    expect(call.headers.authorization).toBe('Bearer abc123');
    expect(JSON.parse(call.body)).toEqual({ email: 'a@b.com', password: 'x' });
  });

  test('(b) GET /api/pokemon -> MS_POKEMON_URL/api/pokemon (sin pathRewrite efectivo)', async () => {
    const res = await request(app).get('/api/pokemon');

    expect(res.status).toBe(200);
    expect(pokemonMock.calls).toHaveLength(1);
    expect(pokemonMock.calls[0].url).toBe('/api/pokemon');
  });

  test('(c) GET /api/usuarios/teams -> MS_USUARIOS_URL/api/teams (pathRewrite ^/api/usuarios -> /api)', async () => {
    const res = await request(app)
      .get('/api/usuarios/teams')
      .set('Authorization', 'Bearer xyz789');

    expect(res.status).toBe(200);
    expect(usuariosMock.calls).toHaveLength(1);
    expect(usuariosMock.calls[0].url).toBe('/api/teams');
    expect(usuariosMock.calls[0].headers.authorization).toBe('Bearer xyz789');
  });
});

describe('UT-GW-02: catch-all 404', () => {
  test('GET /api/no-existe -> 404 con availableEndpoints', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.message).toContain('/api/no-existe');
    expect(res.body.availableEndpoints).toContain('GET /health');
    expect(res.body.availableEndpoints).toContain('GET /api/pokemon/*');
  });
});

describe('UT-GW-03: endpoints propios del gateway', () => {
  test('(a) GET /health -> 200 status healthy', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('api_gateway');
    expect(typeof res.body.uptime).toBe('number');
  });

  test('(b) GET /gateway-info -> 200 con el mapa de MS_*_URL configuradas', async () => {
    const res = await request(app).get('/gateway-info');

    expect(res.status).toBe(200);
    expect(res.body.microservices.auth).toBe(process.env.MS_AUTH_URL);
    expect(res.body.microservices.pokemon).toBe(process.env.MS_POKEMON_URL);
    expect(res.body.microservices.usuarios).toBe(process.env.MS_USUARIOS_URL);
  });
});
