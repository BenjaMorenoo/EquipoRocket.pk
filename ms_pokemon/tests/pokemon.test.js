// Pruebas unitarias de ms_pokemon/src/controllers/pokemonController.js
// Cubre UT-PKM-01 (getPokemon: existente/inexistente) y UT-PKM-02 (listPokemons:
// paginación). config/db.js se mockea para no requerir conexión real a Postgres.
import { jest } from '@jest/globals';

const mockQuery = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
}));

const { getPokemon, listPokemons } = await import('../src/controllers/pokemonController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UT-PKM-01: getPokemon', () => {
  test('nombre existente -> 200 con types/abilities/moves/stats', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (/FROM pokemon WHERE LOWER/i.test(sql)) {
        return { rows: [{ id: 6, name: 'Charizard', hp: 78, attack: 84, defense: 78, sp_attack: 109, sp_defense: 85, speed: 100 }] };
      }
      if (/FROM types/i.test(sql)) return { rows: [{ name: 'Fire' }, { name: 'Flying' }] };
      if (/FROM abilities/i.test(sql)) return { rows: [{ name: 'Blaze', is_hidden: false }] };
      if (/FROM moves/i.test(sql)) return { rows: [{ id: 1, name: 'Flamethrower' }] };
      return { rows: [] };
    });

    const req = { params: { name: 'Charizard' } };
    const res = mockRes();

    await getPokemon(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.pokemon.name).toBe('Charizard');
    expect(body.data.pokemon.types).toEqual([{ type: { name: 'Fire' } }, { type: { name: 'Flying' } }]);
    expect(body.data.pokemon.abilities).toEqual([{ ability: { name: 'Blaze' }, is_hidden: false }]);
    expect(body.data.pokemon.moves).toEqual([{ id: 1, name: 'Flamethrower' }]);
    expect(body.data.pokemon.stats).toEqual([
      { stat: { name: 'hp' }, base_stat: 78 },
      { stat: { name: 'attack' }, base_stat: 84 },
      { stat: { name: 'defense' }, base_stat: 78 },
      { stat: { name: 'sp_attack' }, base_stat: 109 },
      { stat: { name: 'sp_defense' }, base_stat: 85 },
      { stat: { name: 'speed' }, base_stat: 100 },
    ]);
  });

  test('nombre inexistente -> 404 NOT_FOUND', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const req = { params: { name: 'NoExiste' } };
    const res = mockRes();

    await getPokemon(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NOT_FOUND' });
  });
});

describe('UT-PKM-02: listPokemons - paginación', () => {
  test('sin parámetros -> 200, usa limit=200/offset=0 por defecto', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Bulbasaur' }] });

    const req = { query: {} };
    const res = mockRes();

    await listPokemons(req, res);

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([200, 0]);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { pokemons: [{ id: 1, name: 'Bulbasaur' }] } });
  });

  test('parámetros de paginación fuera de rango no lanzan error y devuelven una lista válida', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    // limit muy por encima del máximo (2000) y offset negativo
    const req = { query: { limit: '999999', offset: '-5' } };
    const res = mockRes();

    await listPokemons(req, res);

    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBeLessThanOrEqual(2000); // Math.min(limit, 2000)
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { pokemons: [] } });
  });
});
