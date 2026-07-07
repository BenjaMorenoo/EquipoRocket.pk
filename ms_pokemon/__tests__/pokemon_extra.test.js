/**
 * Tests adicionales para cubrir ramas de error (500) en pokemonController.
 * El archivo existente tests/pokemon.test.js cubre los casos de éxito y 404.
 */
import { jest } from '@jest/globals';

const mockQuery = jest.fn();

await jest.unstable_mockModule('../src/config/db.js', () => ({
  query:     mockQuery,
  getClient: jest.fn(),
}));

const { getPokemon, listPokemons } = await import('../src/controllers/pokemonController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.resetAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// listPokemons — caminos de error y paginación adicional
// ─────────────────────────────────────────────────────────────────────────────

describe('listPokemons — error handling', () => {
  test('500 — query lanza excepción', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const req = { query: {} };
    const res = mockRes();

    await listPokemons(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INTERNAL_ERROR' });
  });

  test('limit se recorta al máximo 2000', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = { query: { limit: '9999', offset: '0' } };
    const res = mockRes();

    await listPokemons(req, res);

    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(2000);
  });

  test('valores por defecto: limit=200, offset=0', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bulbasaur' }] });

    const req = { query: {} };
    const res = mockRes();

    await listPokemons(req, res);

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([200, 0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPokemon — caminos de error
// ─────────────────────────────────────────────────────────────────────────────

describe('getPokemon — error handling', () => {
  test('500 — primera query (SELECT pokemon) lanza excepción', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const req = { params: { name: 'Pikachu' } };
    const res = mockRes();

    await getPokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INTERNAL_ERROR' });
  });

  test('500 — query de tipos lanza excepción tras encontrar el Pokémon', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 25, name: 'Pikachu', hp: 35, attack: 55, defense: 40, sp_attack: 50, sp_defense: 50, speed: 90 }] })
      .mockRejectedValueOnce(new Error('DB down on types'));

    const req = { params: { name: 'Pikachu' } };
    const res = mockRes();

    await getPokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INTERNAL_ERROR' });
  });

  test('200 — stats con valores null se convierten a 0', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'TestMon', hp: null, attack: null, defense: null, sp_attack: null, sp_defense: null, speed: null }] })
      .mockResolvedValueOnce({ rows: [] }) // types
      .mockResolvedValueOnce({ rows: [] }) // abilities
      .mockResolvedValueOnce({ rows: [] }); // moves

    const req = { params: { name: 'TestMon' } };
    const res = mockRes();

    await getPokemon(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.pokemon.stats.every(s => s.base_stat === 0)).toBe(true);
  });
});
