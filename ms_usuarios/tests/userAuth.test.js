// Pruebas unitarias de ms_usuarios/src/middleware/auth.js y
// ms_usuarios/src/controllers/userController.js
// Cubre UT-USU-04: autorización por usuario autenticado en /me y /collections.
// requireAuth deriva la identidad únicamente del JWT (req.user.id), por lo que
// getMe/removeCollection no pueden operar sobre datos de otro usuario aunque
// se intente pasar un id distinto en el cuerpo/params de la petición.
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT || 'dev_jwt_secret';

const mockQuery = jest.fn();
jest.unstable_mockModule('../src/config/db.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));

const { requireAuth } = await import('../src/middleware/auth.js');
const { getMe, removeCollection } = await import('../src/controllers/userController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UT-USU-04: requireAuth', () => {
  test('sin token -> 401 NO_TOKEN, no llama a next()', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NO_TOKEN' });
    expect(next).not.toHaveBeenCalled();
  });

  test('token inválido -> 401 INVALID_TOKEN, no llama a next()', () => {
    const req = { headers: { authorization: 'Bearer no-soy-un-jwt' } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_TOKEN' });
    expect(next).not.toHaveBeenCalled();
  });

  test('token válido de OTRO usuario -> req.user se deriva del payload del token (id=9)', () => {
    const token = jwt.sign({ sub: 9, username: 'otherUser', email: 'other@test.com' }, JWT_SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 9, username: 'otherUser', email: 'other@test.com' });
  });
});

describe('UT-USU-04: /me y /collections operan únicamente sobre req.user.id', () => {
  test('getMe consulta solo por el id del token autenticado (req.user.id)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 9, username: 'otherUser', email: 'other@test.com' }] });

    const req = { user: { id: 9 } };
    const res = mockRes();

    await getMe(req, res);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/FROM users WHERE id = \$1/i);
    expect(params).toEqual([9]);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { user: { id: 9, username: 'otherUser', email: 'other@test.com' } } });
  });

  test('removeCollection solo borra filas con user_id = req.user.id (del token), no de otro usuario', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    // req.user.id viene exclusivamente del JWT verificado por requireAuth;
    // no hay forma de inyectar el id de otro usuario desde el cliente.
    const req = { user: { id: 9 }, params: { pokemonId: '25' } };
    const res = mockRes();

    await removeCollection(req, res);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM user_collections WHERE user_id = \$1 AND pokemon_id = \$2/i);
    expect(params).toEqual([9, 25]);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
