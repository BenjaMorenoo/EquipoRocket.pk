/**
 * ms_auth — Test suite completo
 *
 * Strategy: mock the DB boundary (`config/db.js` → `query`) plus the
 * two crypto/JWT libraries so no real Postgres or secrets are needed.
 * All model functions run their real code; only the pg.Pool call is faked.
 *
 * Jest ESM requires `jest.unstable_mockModule` + dynamic imports AFTER
 * the mock registrations, and `--experimental-vm-modules` at runtime.
 */
import { jest } from '@jest/globals';

// ── 1. Register mocks BEFORE importing any module under test ──────────────

const mockQuery = jest.fn();

await jest.unstable_mockModule('../src/config/db.js', () => ({
  query:     mockQuery,
  getClient: jest.fn(),
}));

const mockBcryptHash    = jest.fn();
const mockBcryptCompare = jest.fn();

await jest.unstable_mockModule('bcryptjs', () => ({
  default: { hash: mockBcryptHash, compare: mockBcryptCompare },
}));

const mockJwtSign   = jest.fn();
const mockJwtVerify = jest.fn();

await jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: mockJwtSign, verify: mockJwtVerify },
}));

// ── 2. Dynamic imports — resolve after mocks are wired ───────────────────

const { default: app }      = await import('../src/app.js');
const { default: supertest } = await import('supertest');

const request = supertest(app);

// ── 3. Shared fixtures ────────────────────────────────────────────────────

const MOCK_USER = {
  id:            1,
  username:      'testuser',
  email:         'test@example.com',
  password_hash: '$2b$12$mockhashedpassword',
  region_id:     1,
  country_id:    1,
  fecha_nac:     '2000-01-01',
  is_admin:      false,
  is_active:     true,
  created_at:    new Date().toISOString(),
};

const MOCK_ADMIN = {
  ...MOCK_USER,
  id:            2,
  username:      'adminuser',
  email:         'admin@example.com',
  password_hash: '$2b$12$adminhash',
  is_admin:      true,
};

const USER_TOKEN  = 'Bearer user.mock.token';
const ADMIN_TOKEN = 'Bearer admin.mock.token';

// ── 4. Global reset — runs before every test ─────────────────────────────

beforeEach(() => {
  // resetAllMocks clears queued Once values AND implementations, then we
  // re-apply safe defaults so tests only override what they need.
  jest.resetAllMocks();
  mockJwtVerify.mockReturnValue({ sub: 1, username: 'testuser', email: 'test@example.com' });
  mockBcryptHash.mockResolvedValue('$2b$12$mockhashedpassword');
  mockBcryptCompare.mockResolvedValue(true);
  mockJwtSign.mockReturnValue('mock.jwt.token');
});

// ── Helper: set up requireAdmin to succeed as MOCK_ADMIN ─────────────────

function asAdmin() {
  mockJwtVerify.mockReturnValueOnce({ sub: 2, username: 'adminuser', email: 'admin@example.com' });
  mockQuery.mockResolvedValueOnce({ rows: [MOCK_ADMIN] }); // getUserById in requireAdmin
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /  — health / service identifier
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /', () => {
  test('200 — devuelve identificador del servicio', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('ms_auth');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/register', () => {
  test('201 — registra usuario exitosamente', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })            // emailExists → libre
      .mockResolvedValueOnce({ rows: [] })            // usernameExists → libre
      .mockResolvedValueOnce({ rows: [MOCK_USER] });  // createUser

    const res = await request.post('/api/auth/register').send({
      username: 'testuser',
      email:    'test@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('testuser');
  });

  test('400 — faltan campos obligatorios (sin username)', async () => {
    const res = await request.post('/api/auth/register').send({
      email:    'x@x.com',
      password: 'Pass123!',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — faltan campos obligatorios (sin password)', async () => {
    const res = await request.post('/api/auth/register').send({
      username: 'u',
      email:    'x@x.com',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('409 — email ya registrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // emailExists → tomado

    const res = await request.post('/api/auth/register').send({
      username: 'newuser',
      email:    'taken@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_TAKEN');
  });

  test('409 — username ya registrado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })    // emailExists → libre
      .mockResolvedValueOnce({ rows: [{}] }); // usernameExists → tomado

    const res = await request.post('/api/auth/register').send({
      username: 'existing',
      email:    'new@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('USERNAME_TAKEN');
  });

  test('403 — crear admin sin Authorization header', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request.post('/api/auth/register').send({
      username: 'adminx',
      email:    'adminx@example.com',
      password: 'Pass123!',
      is_admin: true,
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  test('403 — crear admin con token de usuario no-admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [MOCK_USER] }); // caller getUserById → no admin

    const res = await request
      .post('/api/auth/register')
      .set('Authorization', USER_TOKEN)
      .send({ username: 'adminx', email: 'adminx@example.com', password: 'Pass123!', is_admin: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  test('403 — crear admin con JWT inválido', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('bad jwt'); });

    const res = await request
      .post('/api/auth/register')
      .set('Authorization', 'Bearer bad.token')
      .send({ username: 'adminx', email: 'adminx@example.com', password: 'Pass123!', is_admin: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  test('201 — crear admin con token de admin válido', async () => {
    const newAdmin = { ...MOCK_USER, id: 3, is_admin: true };
    mockJwtVerify.mockReturnValueOnce({ sub: 2, username: 'adminuser', email: 'admin@example.com' });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })           // emailExists
      .mockResolvedValueOnce({ rows: [] })           // usernameExists
      .mockResolvedValueOnce({ rows: [MOCK_ADMIN] }) // getUserById caller → admin
      .mockResolvedValueOnce({ rows: [newAdmin] });  // createUser

    const res = await request
      .post('/api/auth/register')
      .set('Authorization', ADMIN_TOKEN)
      .send({ username: 'newadmin', email: 'newadmin@example.com', password: 'Pass123!', is_admin: true });

    expect(res.status).toBe(201);
    expect(res.body.data.user.is_admin).toBe(true);
  });

  test('500 — error de base de datos', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request.post('/api/auth/register').send({
      username: 'u',
      email:    'u@u.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/login', () => {
  test('200 — login por email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request.post('/api/auth/login').send({
      email:    'test@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('mock.jwt.token');
    expect(res.body.data.user.username).toBe('testuser');
  });

  test('200 — login por username', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request.post('/api/auth/login').send({
      username: 'testuser',
      password: 'Pass123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  test('200 — login con identifier (formato email)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request.post('/api/auth/login').send({
      identifier: 'test@example.com',
      password:   'Pass123!',
    });

    expect(res.status).toBe(200);
  });

  test('200 — login con identifier (formato username)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request.post('/api/auth/login').send({
      identifier: 'testuser',
      password:   'Pass123!',
    });

    expect(res.status).toBe(200);
  });

  test('400 — falta password', async () => {
    const res = await request.post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 — falta email/username/identifier', async () => {
    const res = await request.post('/api/auth/login').send({ password: 'Pass123!' });
    expect(res.status).toBe(400);
  });

  test('401 — usuario no encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request.post('/api/auth/login').send({
      email:    'nobody@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  test('401 — contraseña incorrecta', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request.post('/api/auth/login').send({
      email:    'test@example.com',
      password: 'wrongpass',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CREDENTIALS');
  });

  test('500 — error de base de datos', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));

    const res = await request.post('/api/auth/login').send({
      email:    'test@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/auth/me', () => {
  test('401 — sin Authorization header', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_TOKEN');
  });

  test('401 — token inválido (jwt.verify lanza)', async () => {
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('bad'); });

    const res = await request.get('/api/auth/me').set('Authorization', 'Bearer bad.token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('200 — usuario encontrado por email en primera búsqueda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] }); // getUserByEmail(email)

    const res = await request.get('/api/auth/me').set('Authorization', USER_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('testuser');
  });

  test('200 — usuario encontrado vía getUserById (fallback por sub)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })            // getUserByEmail(email) → null
      .mockResolvedValueOnce({ rows: [] })            // getUserByEmail(username) → null
      .mockResolvedValueOnce({ rows: [MOCK_USER] });  // getUserById(sub) → encontrado

    const res = await request.get('/api/auth/me').set('Authorization', USER_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(1);
  });

  test('404 — usuario no encontrado en ninguna búsqueda', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })  // getUserByEmail(email) → null
      .mockResolvedValueOnce({ rows: [] })  // getUserByEmail(username) → null
      .mockResolvedValueOnce({ rows: [] }); // getUserById(sub) → null

    const res = await request.get('/api/auth/me').set('Authorization', USER_TOKEN);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('500 — error de base de datos', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));

    const res = await request.get('/api/auth/me').set('Authorization', USER_TOKEN);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/auth/me
// ═════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/auth/me', () => {
  const VALID_PAYLOAD = {
    username:         'updated',
    email:            'updated@example.com',
    current_password: 'Pass123!',
    region_id:        1,
    country_id:       1,
  };

  test('401 — sin Authorization header', async () => {
    const res = await request.patch('/api/auth/me').send(VALID_PAYLOAD);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_TOKEN');
  });

  test('401 — token inválido', async () => {
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('bad'); });

    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', 'Bearer bad.token')
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('400 — faltan username o email', async () => {
    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send({ current_password: 'Pass123!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAYLOAD');
  });

  test('400 — falta current_password', async () => {
    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send({ username: 'u', email: 'u@u.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PASSWORD_REQUIRED');
  });

  test('404 — usuario no encontrado (getUserById retorna null)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('401 — contraseña actual incorrecta', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_PASSWORD');
  });

  test('200 — actualiza perfil correctamente', async () => {
    const updated = { ...MOCK_USER, username: 'updated', email: 'updated@example.com' };
    mockQuery
      .mockResolvedValueOnce({ rows: [MOCK_USER] })  // getUserById
      .mockResolvedValueOnce({ rows: [updated] });    // updateUserProfile

    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('updated');
    expect(res.body.data.user.email).toBe('updated@example.com');
  });

  test('404 — updateUserProfile retorna null', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [MOCK_USER] }) // getUserById → exists
      .mockResolvedValueOnce({ rows: [] });           // updateUserProfile → null

    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('500 — error de base de datos', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));

    const res = await request
      .patch('/api/auth/me')
      .set('Authorization', USER_TOKEN)
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/verify-password
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/auth/verify-password', () => {
  test('401 — sin Authorization header', async () => {
    const res = await request.post('/api/auth/verify-password').send({ password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_TOKEN');
  });

  test('401 — token inválido', async () => {
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('bad'); });

    const res = await request
      .post('/api/auth/verify-password')
      .set('Authorization', 'Bearer bad.token')
      .send({ password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('400 — falta password en el body', async () => {
    const res = await request
      .post('/api/auth/verify-password')
      .set('Authorization', USER_TOKEN)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PASSWORD_REQUIRED');
  });

  test('404 — usuario no encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request
      .post('/api/auth/verify-password')
      .set('Authorization', USER_TOKEN)
      .send({ password: 'Pass123!' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('401 — contraseña incorrecta', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request
      .post('/api/auth/verify-password')
      .set('Authorization', USER_TOKEN)
      .send({ password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_PASSWORD');
  });

  test('200 — contraseña correcta devuelve valid:true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request
      .post('/api/auth/verify-password')
      .set('Authorization', USER_TOKEN)
      .send({ password: 'Pass123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
  });

  test('500 — error de base de datos', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));

    const res = await request
      .post('/api/auth/verify-password')
      .set('Authorization', USER_TOKEN)
      .send({ password: 'Pass123!' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/auth/users  (requireAdmin + listUsers)
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/auth/users', () => {
  test('401 — sin token', async () => {
    const res = await request.get('/api/auth/users');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_TOKEN');
  });

  test('401 — token inválido', async () => {
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('bad'); });

    const res = await request.get('/api/auth/users').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('401 — payload sin sub (token estructuralmente inválido)', async () => {
    mockJwtVerify.mockReturnValueOnce({}); // no sub property

    const res = await request.get('/api/auth/users').set('Authorization', 'Bearer no.sub');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  test('403 — usuario no es admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] }); // getUserById → is_admin:false

    const res = await request.get('/api/auth/users').set('Authorization', USER_TOKEN);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  test('403 — usuario no encontrado en requireAdmin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // getUserById → null

    const res = await request.get('/api/auth/users').set('Authorization', USER_TOKEN);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  test('200 — admin recibe lista de usuarios', async () => {
    asAdmin();
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER, MOCK_ADMIN] }); // listUsers

    const res = await request.get('/api/auth/users').set('Authorization', ADMIN_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users).toHaveLength(2);
  });

  test('500 — error de DB en listUsers', async () => {
    asAdmin();
    mockQuery.mockRejectedValueOnce(new Error('DB fail')); // listUsers lanza

    const res = await request.get('/api/auth/users').set('Authorization', ADMIN_TOKEN);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });

  test('500 — error de DB en requireAdmin (getUserById lanza)', async () => {
    mockJwtVerify.mockReturnValueOnce({ sub: 2 });
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));

    const res = await request.get('/api/auth/users').set('Authorization', ADMIN_TOKEN);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/auth/users/:id/active  (requireAdmin + setUserActive)
// ═════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/auth/users/:id/active', () => {
  test('401 — sin token', async () => {
    const res = await request.patch('/api/auth/users/1/active').send({ active: true });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_TOKEN');
  });

  test('401 — token inválido', async () => {
    mockJwtVerify.mockImplementationOnce(() => { throw new Error('bad'); });

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', 'Bearer bad')
      .send({ active: true });
    expect(res.status).toBe(401);
  });

  test('403 — usuario no es admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] }); // requireAdmin → no admin

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', USER_TOKEN)
      .send({ active: true });
    expect(res.status).toBe(403);
  });

  test('400 — id no numérico (NaN → falsy)', async () => {
    asAdmin();

    const res = await request
      .patch('/api/auth/users/abc/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_ID');
  });

  test('400 — active no es boolean (string)', async () => {
    asAdmin();

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAYLOAD');
  });

  test('400 — body sin active', async () => {
    asAdmin();

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PAYLOAD');
  });

  test('400 — desactivar sin password', async () => {
    asAdmin();

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PASSWORD_REQUIRED');
  });

  test('404 — target no encontrado al desactivar', async () => {
    asAdmin();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // getUserById(target) → null

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: false, password: 'Pass123!' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('401 — contraseña incorrecta (target y admin fallan)', async () => {
    asAdmin();
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER] }); // getUserById(target)
    mockBcryptCompare
      .mockResolvedValueOnce(false)  // target no coincide
      .mockResolvedValueOnce(false); // admin tampoco coincide

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: false, password: 'wrong!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_PASSWORD');
  });

  test('200 — desactiva usuario con contraseña del target', async () => {
    const deactivated = { ...MOCK_USER, is_active: false };
    asAdmin();
    mockQuery
      .mockResolvedValueOnce({ rows: [MOCK_USER] })     // getUserById(target)
      .mockResolvedValueOnce({ rows: [deactivated] });  // setUserActive
    mockBcryptCompare.mockResolvedValueOnce(true);       // target coincide

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: false, password: 'Pass123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.is_active).toBe(false);
  });

  test('200 — desactiva usuario con contraseña del admin (fallback)', async () => {
    const deactivated = { ...MOCK_USER, is_active: false };
    asAdmin();
    mockQuery
      .mockResolvedValueOnce({ rows: [MOCK_USER] })    // getUserById(target)
      .mockResolvedValueOnce({ rows: [deactivated] }); // setUserActive
    mockBcryptCompare
      .mockResolvedValueOnce(false) // target no coincide
      .mockResolvedValueOnce(true); // admin coincide (fallback)

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: false, password: 'AdminPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.is_active).toBe(false);
  });

  test('200 — activa usuario', async () => {
    const activated = { ...MOCK_USER, is_active: true };
    asAdmin();
    mockQuery.mockResolvedValueOnce({ rows: [activated] }); // setUserActive

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: true });
    expect(res.status).toBe(200);
    expect(res.body.data.user.is_active).toBe(true);
  });

  test('404 — setUserActive retorna null (usuario no existe)', async () => {
    asAdmin();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // setUserActive → null

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: true });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('500 — error de base de datos en setUserActive', async () => {
    asAdmin();
    mockQuery.mockRejectedValueOnce(new Error('DB fail'));

    const res = await request
      .patch('/api/auth/users/1/active')
      .set('Authorization', ADMIN_TOKEN)
      .send({ active: true });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /register  — alias expuesto en app.js
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /register (alias de /api/auth/register)', () => {
  test('201 — el alias llama al mismo handler', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [MOCK_USER] });

    const res = await request.post('/register').send({
      username: 'testuser',
      email:    'test@example.com',
      password: 'Pass123!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('400 — alias también valida campos requeridos', async () => {
    const res = await request.post('/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});
