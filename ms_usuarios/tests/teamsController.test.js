// Pruebas unitarias de ms_usuarios/src/controllers/teamsController.js
// Cubre UT-USU-02: validación de composición de equipo (0 ó 7 Pokémon deberían
// rechazarse, según plan_pruebas.md, antes de generar cualquier INSERT).
// TeamRepo y config/db.js se mockean para no requerir BD real.
import { jest } from '@jest/globals';

const mockTeamRepo = {
  create: jest.fn(),
  replacePokemons: jest.fn(),
  findById: jest.fn(),
};
const mockQuery = jest.fn();

jest.unstable_mockModule('../src/repositories/teamRepository.js', () => ({
  default: mockTeamRepo,
}));
jest.unstable_mockModule('../src/config/db.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));

const { createTeam } = await import('../src/controllers/teamsController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  // SELECT id FROM users WHERE id = $1 -> usuario existe
  mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
});

describe('UT-USU-02: validación de composición de equipo', () => {
  test('crear equipo con 0 Pokémon debería rechazarse antes de cualquier INSERT', async () => {
    mockTeamRepo.create.mockResolvedValue({ id: 100, user_id: 1, name: 'Equipo vacío' });
    mockTeamRepo.findById.mockResolvedValue({ id: 100, pokemon: [] });

    const req = { user: { id: 1 }, body: { name: 'Equipo vacío', format_id: 1, pokemon: [] } };
    const res = mockRes();

    await createTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockTeamRepo.create).not.toHaveBeenCalled();
  });

  test('crear equipo con 7 Pokémon debería rechazarse antes de cualquier INSERT', async () => {
    mockTeamRepo.create.mockResolvedValue({ id: 101, user_id: 1, name: 'Equipo de 7' });
    mockTeamRepo.findById.mockResolvedValue({ id: 101, pokemon: [] });

    const sevenPokemon = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Mon${i + 1}` }));
    const req = { user: { id: 1 }, body: { name: 'Equipo de 7', format_id: 1, pokemon: sevenPokemon } };
    const res = mockRes();

    await createTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockTeamRepo.create).not.toHaveBeenCalled();
  });
});
