// Pruebas unitarias de ms_auth/src/middleware/requireAdmin.js
// Cubre UT-AUTH-03: verificación de token para rutas de administración.
// getUserById (models/userModel.js) se mockea para no requerir BD real.
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

const mockGetUserById = jest.fn();

jest.unstable_mockModule('../src/models/userModel.js', () => ({
  getUserById: mockGetUserById,
}));

const { requireAdmin } = await import('../src/middleware/requireAdmin.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UT-AUTH-03: requireAdmin', () => {
  test('sin header Authorization -> 401 NO_TOKEN, no llama a next()', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NO_TOKEN' });
    expect(next).not.toHaveBeenCalled();
  });

  test('token inválido -> 401 INVALID_TOKEN, no llama a next()', async () => {
    const req = { headers: { authorization: 'Bearer esto-no-es-un-jwt' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_TOKEN' });
    expect(next).not.toHaveBeenCalled();
  });

  test('token válido pero usuario sin rol admin -> 403 FORBIDDEN, no llama a next()', async () => {
    const token = jwt.sign({ sub: 5, username: 'user', email: 'user@test.com' }, JWT_SECRET, { expiresIn: '1h' });
    mockGetUserById.mockResolvedValue({ id: 5, is_admin: false });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(mockGetUserById).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'FORBIDDEN' });
    expect(next).not.toHaveBeenCalled();
  });

  test('token válido de usuario admin -> llama a next() y asigna req.authUser', async () => {
    const token = jwt.sign({ sub: 1, username: 'admin', email: 'admin@test.com' }, JWT_SECRET, { expiresIn: '1h' });
    const adminUser = { id: 1, is_admin: true, username: 'admin' };
    mockGetUserById.mockResolvedValue(adminUser);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.authUser).toEqual(adminUser);
    expect(res.status).not.toHaveBeenCalled();
  });
});
