// Pruebas unitarias de ms_usuarios/src/controllers/adminController.js
// Cubre UT-USU-03: fallback de vistas materializadas a consulta en vivo
// (getTypesByCountry). config/db.js se mockea para no requerir BD real.
import { jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));

const { getTypesByCountry } = await import('../src/controllers/adminController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UT-USU-03: fallback de vistas materializadas a consulta en vivo', () => {
  test('si admin_types_by_country no tiene filas, ejecuta la query de fallback y devuelve datos en vivo', async () => {
    const liveRows = [{ country_id: 1, country: 'Chile', type_id: 4, type: 'Water', uses: 5 }];

    mockQuery.mockImplementation(async (sql) => {
      if (/SELECT is_admin/i.test(sql)) return { rows: [{ is_admin: true }] };
      if (/FROM admin_types_by_country/i.test(sql)) return { rows: [] }; // vista vacía
      return { rows: liveRows }; // query de fallback en vivo
    });

    const req = { user: { id: 1 } };
    const res = mockRes();

    await getTypesByCountry(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][0]).toMatch(/JOIN pokemon_types/i);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: liveRows });
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  test('si admin_types_by_country tiene filas, las devuelve directamente sin ejecutar el fallback', async () => {
    const viewRows = [{ country_id: 1, country: 'Chile', type_id: 4, type: 'Water', uses: 10 }];

    mockQuery.mockImplementation(async (sql) => {
      if (/SELECT is_admin/i.test(sql)) return { rows: [{ is_admin: true }] };
      if (/FROM admin_types_by_country/i.test(sql)) return { rows: viewRows };
      return { rows: [] };
    });

    const req = { user: { id: 1 } };
    const res = mockRes();

    await getTypesByCountry(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: viewRows });
  });

  test('usuario no admin -> 403 FORBIDDEN, sin tocar la vista ni el fallback', async () => {
    mockQuery.mockResolvedValue({ rows: [{ is_admin: false }] });

    const req = { user: { id: 2 } };
    const res = mockRes();

    await getTypesByCountry(req, res);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'FORBIDDEN' });
  });
});
