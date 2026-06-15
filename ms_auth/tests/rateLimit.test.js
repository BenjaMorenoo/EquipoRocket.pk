// Prueba de regresión para SEC-04: POST /api/auth/login debe limitar intentos
// por IP (express-rate-limit). UserRepo se mockea para no requerir BD real.
import { jest } from '@jest/globals';

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

const { default: app } = await import('../src/app.js');
const { default: request } = await import('supertest');

beforeEach(() => {
  jest.clearAllMocks();
  mockUserRepo.findByEmail.mockResolvedValue(null);
});

describe('SEC-04: rate limiting en POST /api/auth/login', () => {
  test('10 intentos devuelven 401 INVALID_CREDENTIALS, el 11vo devuelve 429 TOO_MANY_ATTEMPTS', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nope@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, error: 'INVALID_CREDENTIALS' });
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@test.com', password: 'wrong' });

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, error: 'TOO_MANY_ATTEMPTS' });
  });
});
