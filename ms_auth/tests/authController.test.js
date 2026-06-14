// Pruebas unitarias de ms_auth/src/controllers/authController.js
// Cubre UT-AUTH-01 (hashing de contraseñas) y UT-AUTH-02 (login: JWT + mensajes
// de error genéricos). UserRepo se mockea para no requerir conexión real a BD.
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

const mockUserRepo = {
  emailExists: jest.fn(),
  usernameExists: jest.fn(),
  create: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/userRepository.js', () => ({
  default: mockUserRepo,
}));

const { register, login } = await import('../src/controllers/authController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UT-AUTH-01: register - hashing de contraseñas', () => {
  test('dos registros con la misma contraseña generan hashes bcrypt distintos (salt)', async () => {
    mockUserRepo.emailExists.mockResolvedValue(false);
    mockUserRepo.usernameExists.mockResolvedValue(false);
    mockUserRepo.create.mockImplementation(async (payload) => ({ id: 1, ...payload }));

    const plain = 'SuperSecret123!';

    const res1 = mockRes();
    await register({ body: { username: 'user1', email: 'user1@test.com', password: plain }, headers: {} }, res1);

    const res2 = mockRes();
    await register({ body: { username: 'user2', email: 'user2@test.com', password: plain }, headers: {} }, res2);

    expect(res1.status).toHaveBeenCalledWith(201);
    expect(res2.status).toHaveBeenCalledWith(201);

    const hash1 = mockUserRepo.create.mock.calls[0][0].password_hash;
    const hash2 = mockUserRepo.create.mock.calls[1][0].password_hash;

    // formato bcrypt: $2a$/$2b$/$2y$ + costo + salt + hash
    expect(hash1).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash2).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash1).not.toBe(plain);
    expect(hash2).not.toBe(plain);
    expect(hash1).not.toBe(hash2);

    await expect(bcrypt.compare(plain, hash1)).resolves.toBe(true);
    await expect(bcrypt.compare(plain, hash2)).resolves.toBe(true);
  });
});

describe('UT-AUTH-02: login - emisión de JWT y mensajes de error genéricos', () => {
  const plain = 'CorrectPass123!';
  let storedHash;

  beforeAll(async () => {
    storedHash = await bcrypt.hash(plain, 4); // costo bajo: hash rápido para pruebas
  });

  test('(a) login válido devuelve JWT con payload {sub, username, email}', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 42,
      username: 'tester',
      email: 'tester@test.com',
      password_hash: storedHash,
      region_id: null,
      country_id: null,
      fecha_nac: null,
      is_admin: false,
      is_active: true,
      created_at: '2026-01-01',
    });

    const res = mockRes();
    await login({ body: { email: 'tester@test.com', password: plain }, headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);

    const { token, user } = body.data;
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.sub).toBe(42);
    expect(decoded.username).toBe('tester');
    expect(decoded.email).toBe('tester@test.com');

    expect(user.password_hash).toBeUndefined();
  });

  test('(b) usuario inexistente -> 401 INVALID_CREDENTIALS', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const res = mockRes();
    await login({ body: { email: 'noexiste@test.com', password: 'cualquiera' }, headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_CREDENTIALS' });
  });

  test('(c) password incorrecta -> mismo 401 INVALID_CREDENTIALS (sin enumeración de usuarios)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 42,
      username: 'tester',
      email: 'tester@test.com',
      password_hash: storedHash,
    });

    const res = mockRes();
    await login({ body: { email: 'tester@test.com', password: 'PasswordIncorrecta!' }, headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_CREDENTIALS' });
  });
});
