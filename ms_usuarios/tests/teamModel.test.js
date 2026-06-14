// Pruebas unitarias de ms_usuarios/src/models/teamModel.js
// Cubre UT-USU-01: "borrado" lógico de equipos (deleteTeam -> UPDATE ... active=FALSE,
// nunca DELETE) y el filtro active IS NULL OR active = TRUE usado por getTeamsByUser.
// config/db.js se mockea para no requerir una conexión real a Postgres.
import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockGetClient = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

const { deleteTeam, getTeamsByUser } = await import('../src/models/teamModel.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UT-USU-01: borrado lógico de equipos', () => {
  test('deleteTeam ejecuta UPDATE teams SET active = FALSE (nunca DELETE)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 7, active: false }] });

    const result = await deleteTeam(7);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/UPDATE teams SET active = FALSE/i);
    expect(sql).not.toMatch(/DELETE FROM teams/i);
    expect(params).toEqual([7]);
    expect(result).toEqual({ id: 7, active: false });
  });

  test('getTeamsByUser filtra por (active IS NULL OR active = TRUE)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });

    const teams = await getTeamsByUser(3);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/active IS NULL OR active = TRUE/i);
    expect(sql).toMatch(/WHERE user_id = \$1/i);
    expect(params).toEqual([3]);
    expect(teams).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
