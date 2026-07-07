/**
 * Tests directos de teamModel.js — cubre la capa de acceso a datos
 * con mocks de query() y getClient() para no necesitar base de datos real.
 *
 * Complementa full_coverage.test.js que mockea el repositorio completo,
 * y tests/teamModel.test.js que solo cubre createTeam/getTeamsByUser.
 */
import { jest } from '@jest/globals';

// ── Mocks (antes de cualquier import del código fuente) ──────────────────────

const mockQuery       = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease     = jest.fn();
const mockGetClient   = jest.fn();

await jest.unstable_mockModule('../src/config/db.js', () => ({
  query:     mockQuery,
  getClient: mockGetClient,
}));

// Importar TODAS las funciones del modelo después del mock
const {
  createTeam,
  getTeamsByUser,
  getPublicTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  replaceTeamPokemons,
  getFeedbackCounts,
  addTeamFeedback,
  updateTeamPokemonSpread,
} = await import('../src/models/teamModel.js');

// También importar el repositorio para cubrir sus líneas (thin wrappers)
const { default: TeamRepo } = await import('../src/repositories/teamRepository.js');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna un mock de cliente de transacción con implementación por defecto */
function makeMockClient(overrides = {}) {
  const client = {
    query:   jest.fn().mockImplementation(async (sql) => {
      if (typeof sql === 'string') {
        if (sql.includes('INSERT INTO team_pokemon '))   return { rows: [{ id: 99 }] };
        if (sql.includes('INSERT INTO team_feedback'))   return { rows: [{ id: 5, wins: 1, loses: 0 }] };
        if (sql.includes('SELECT id, wins, loses'))      return { rows: [] };      // no feedback preexistente
        if (sql.includes('SELECT tp.id FROM team_pokemon tp JOIN teams')) return { rows: [{ id: 99 }] }; // ownership ok
        if (sql.includes('SELECT id FROM spreads'))      return { rows: [{ id: 3 }] };
        if (sql.includes('UPDATE team_pokemon SET spread_id')) return { rows: [{ id: 99, spread_id: 3 }] };
        if (sql.includes('SELECT * FROM team_feedback')) return { rows: [{ id: 5, wins: 2, loses: 0 }] };
      }
      return { rows: [] }; // BEGIN, COMMIT, ROLLBACK, DELETE, etc.
    }),
    release: jest.fn(),
    ...overrides,
  };
  return client;
}

beforeEach(() => {
  jest.resetAllMocks();
  // getClient devuelve siempre un nuevo mock de cliente con la implementación por defecto
  mockGetClient.mockImplementation(async () => makeMockClient());
});

const TEAM_ROW = { id: 10, user_id: 1, name: 'Test Team', format_id: 1, active: true };

// ═════════════════════════════════════════════════════════════════════════════
// createTeam
// ═════════════════════════════════════════════════════════════════════════════

describe('createTeam', () => {
  test('inserta y devuelve el equipo creado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    const result = await createTeam({ user_id: 1, name: 'Test Team', format_id: 1 });
    expect(result).toEqual(TEAM_ROW);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO teams');
  });

  test('usa created_by=manual por defecto', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    await createTeam({ user_id: 1, name: 'T' });
    expect(mockQuery.mock.calls[0][1][3]).toBe('manual');
  });

  test('usa created_by=ai cuando se pasa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    await createTeam({ user_id: 1, name: 'T', created_by: 'ai' });
    expect(mockQuery.mock.calls[0][1][3]).toBe('ai');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getTeamsByUser
// ═════════════════════════════════════════════════════════════════════════════

describe('getTeamsByUser', () => {
  test('devuelve lista de equipos activos del usuario', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    const result = await getTeamsByUser(1);
    expect(result).toEqual([TEAM_ROW]);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE user_id = $1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getPublicTeams
// ═════════════════════════════════════════════════════════════════════════════

describe('getPublicTeams', () => {
  test('devuelve equipos activos de otros usuarios', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 20, user_id: 2, username: 'otheruser' }] });
    const result = await getPublicTeams(1);
    expect(result[0].username).toBe('otheruser');
    expect(mockQuery.mock.calls[0][1]).toEqual([1]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getTeamById
// ═════════════════════════════════════════════════════════════════════════════

describe('getTeamById', () => {
  test('devuelve null si el equipo no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getTeamById(99);
    expect(result).toBeNull();
  });

  test('devuelve equipo con pokemon vacío si no hay team_pokemon', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [TEAM_ROW] })    // teams
      .mockResolvedValueOnce({ rows: [] });             // team_pokemon vacío
    const result = await getTeamById(10);
    expect(result).not.toBeNull();
    expect(result.pokemon).toEqual([]);
  });

  test('devuelve equipo con pokemon incluyendo ability, item y moves', async () => {
    const POKE = { team_pokemon_id: 5, slot: 1, pokemon_id: 25, name: 'Pikachu',
                   ability_id: 1, ability_name: 'Static', item_id: 2, item_name: 'Choice Band', spread_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [TEAM_ROW] })             // teams
      .mockResolvedValueOnce({ rows: [POKE] })                  // team_pokemon
      .mockResolvedValueOnce({ rows: [{ id: 10, name: 'Thunderbolt' }] }); // moves para team_pokemon_id=5
    const result = await getTeamById(10);
    expect(result.pokemon).toHaveLength(1);
    const p = result.pokemon[0];
    expect(p.ability).toBe('Static');
    expect(p.item).toBe('Choice Band');
    expect(p.moves).toEqual([{ id: 10, name: 'Thunderbolt' }]);
    expect(p.ability_name).toBeUndefined(); // se borra en el modelo
    expect(p.item_name).toBeUndefined();
  });

  test('pokemon con ability_name null → ability queda null', async () => {
    const POKE = { team_pokemon_id: 6, slot: 1, pokemon_id: 1, name: 'Bulbasaur',
                   ability_id: null, ability_name: null, item_id: null, item_name: null, spread_id: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [TEAM_ROW] })
      .mockResolvedValueOnce({ rows: [POKE] })
      .mockResolvedValueOnce({ rows: [] }); // sin moves
    const result = await getTeamById(10);
    expect(result.pokemon[0].ability).toBeNull();
    expect(result.pokemon[0].item).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updateTeam
// ═════════════════════════════════════════════════════════════════════════════

describe('updateTeam', () => {
  test('actualiza y devuelve equipo', async () => {
    const updated = { ...TEAM_ROW, name: 'Updated' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });
    const result = await updateTeam(10, { name: 'Updated', format_id: null });
    expect(result).toEqual(updated);
  });

  test('devuelve null si el equipo no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await updateTeam(99, { name: 'X' });
    expect(result).toBeNull();
  });

  test('actualiza synergy_score', async () => {
    const updated = { ...TEAM_ROW, synergy_score: 85.5 };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });
    const result = await updateTeam(10, { synergy_score: 85.5 });
    expect(result.synergy_score).toBe(85.5);
    expect(mockQuery.mock.calls[0][1][3]).toBe(85.5);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deleteTeam
// ═════════════════════════════════════════════════════════════════════════════

describe('deleteTeam', () => {
  test('soft-delete: marca equipo como inactivo', async () => {
    const inactive = { ...TEAM_ROW, active: false };
    mockQuery.mockResolvedValueOnce({ rows: [inactive] });
    const result = await deleteTeam(10);
    expect(result.active).toBe(false);
    expect(mockQuery.mock.calls[0][0]).toContain('active = FALSE');
  });

  test('devuelve null si el equipo no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await deleteTeam(99);
    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// replaceTeamPokemons
// ═════════════════════════════════════════════════════════════════════════════

describe('replaceTeamPokemons', () => {
  test('reemplaza pokémon sin ability/item/moves (solo IDs)', async () => {
    const result = await replaceTeamPokemons(10, [{ id: 1 }, { id: 25 }]);
    expect(result).toBe(true);
    const client = await mockGetClient.mock.results[0].value;
    expect(client.query.mock.calls[0][0]).toBe('BEGIN');
    const commitCall = client.query.mock.calls.find(c => c[0] === 'COMMIT');
    expect(commitCall).toBeTruthy();
    expect(client.release).toHaveBeenCalled();
  });

  test('resuelve ability y item como strings', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ id: 1, ability: 'Overgrow', item: 'Leftovers' }]);
    const calls = client.query.mock.calls.map(c => c[0]);
    const abilityLookup = calls.find(sql => typeof sql === 'string' && sql.includes('SELECT id FROM abilities'));
    const itemLookup    = calls.find(sql => typeof sql === 'string' && sql.includes('SELECT id FROM items'));
    expect(abilityLookup).toBeTruthy();
    expect(itemLookup).toBeTruthy();
  });

  test('resuelve ability y item como números (sin lookup)', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ id: 1, ability: 2, item: 3 }]);
    const calls = client.query.mock.calls.map(c => c[0]);
    const abilityLookup = calls.find(sql => typeof sql === 'string' && sql.includes('SELECT id FROM abilities'));
    expect(abilityLookup).toBeUndefined(); // no lookup when number
  });

  test('inserta moves como nombres (lookup) y como números', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ id: 1, moves: ['Tackle', 10] }]);
    const calls = client.query.mock.calls.map(c => c[0]);
    const moveLookup = calls.find(sql => typeof sql === 'string' && sql.includes('SELECT id FROM moves'));
    expect(moveLookup).toBeTruthy(); // 'Tackle' requires lookup
  });

  test('ignora moves nulos/undefined en la lista', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    // Una move null debe ser ignorada (continue en el loop)
    await replaceTeamPokemons(10, [{ id: 1, moves: [null, undefined, 5] }]);
    // No debe lanzar error
    const commitCall = client.query.mock.calls.find(c => c[0] === 'COMMIT');
    expect(commitCall).toBeTruthy();
  });

  test('rollback y relanza error si falla una query', async () => {
    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('FK violation')), // DELETE falla
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await expect(replaceTeamPokemons(10, [{ id: 1 }])).rejects.toThrow('FK violation');
    const rollbackCall = client.query.mock.calls.find(c => c[0] === 'ROLLBACK');
    expect(rollbackCall).toBeTruthy();
    expect(client.release).toHaveBeenCalled();
  });

  test('ability string no encontrada → abilityId=null (sin match en rows)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id FROM abilities')) return { rows: [] }; // not found
        if (sql && sql.includes('INSERT INTO team_pokemon ')) return { rows: [{ id: 99 }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await replaceTeamPokemons(10, [{ id: 1, ability: 'UnknownAbility' }]);
    expect(result).toBe(true);
  });

  test('move id=0 (falsy) → moveId=null, no inserta', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    // move como número 0 → moveId=0 → falsy → no se inserta
    await replaceTeamPokemons(10, [{ id: 1, moves: [0] }]);
    const insertMove = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO team_pokemon_moves'));
    expect(insertMove).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getFeedbackCounts
// ═════════════════════════════════════════════════════════════════════════════

describe('getFeedbackCounts', () => {
  test('devuelve wins y loses sumados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ wins: 5, loses: 2 }] });
    const result = await getFeedbackCounts(10);
    expect(result).toEqual({ wins: 5, loses: 2 });
  });

  test('devuelve fallback {wins:0, loses:0} si no hay filas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getFeedbackCounts(10);
    expect(result).toEqual({ wins: 0, loses: 0 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// addTeamFeedback
// ═════════════════════════════════════════════════════════════════════════════

describe('addTeamFeedback', () => {
  test('inserta nuevo feedback "good" si no existe registro previo', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    const result = await addTeamFeedback(10, 1, 'good');
    expect(result).toMatchObject({ id: 5 });
    const commitCall = client.query.mock.calls.find(c => c[0] === 'COMMIT');
    expect(commitCall).toBeTruthy();
  });

  test('inserta nuevo feedback "bad" si no existe registro previo', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    const result = await addTeamFeedback(10, 1, 'bad');
    expect(result).toMatchObject({ id: 5 });
  });

  test('actualiza feedback existente (rama UPDATE "good")', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id, wins, loses FROM team_feedback')) return { rows: [{ id: 5, wins: 1, loses: 0 }] };
        if (sql && sql.includes('SELECT * FROM team_feedback')) return { rows: [{ id: 5, wins: 2, loses: 0 }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await addTeamFeedback(10, 1, 'good');
    expect(result).toMatchObject({ id: 5, wins: 2 });
  });

  test('actualiza feedback existente (rama UPDATE "bad")', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id, wins, loses FROM team_feedback')) return { rows: [{ id: 5, wins: 1, loses: 0 }] };
        if (sql && sql.includes('SELECT * FROM team_feedback')) return { rows: [{ id: 5, wins: 1, loses: 1 }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await addTeamFeedback(10, 1, 'bad');
    expect(result).toMatchObject({ id: 5, loses: 1 });
  });

  test('rollback y relanza si falla una query', async () => {
    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })          // BEGIN
        .mockRejectedValueOnce(new Error('DB error')), // SELECT fails
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await expect(addTeamFeedback(10, 1, 'good')).rejects.toThrow('DB error');
    expect(client.release).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updateTeamPokemonSpread
// ═════════════════════════════════════════════════════════════════════════════

describe('updateTeamPokemonSpread', () => {
  test('actualiza spread exitosamente', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    const result = await updateTeamPokemonSpread(5, 1, 3);
    expect(result).not.toBeNull();
    const commitCall = client.query.mock.calls.find(c => c[0] === 'COMMIT');
    expect(commitCall).toBeTruthy();
  });

  test('devuelve null si el usuario no es dueño (ownership check falla)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT tp.id FROM team_pokemon tp JOIN teams')) return { rows: [] }; // no owner
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await updateTeamPokemonSpread(5, 99, 3);
    expect(result).toBeNull();
    const rollbackCall = client.query.mock.calls.find(c => c[0] === 'ROLLBACK');
    expect(rollbackCall).toBeTruthy();
  });

  test('lanza SPREAD_NOT_FOUND si el spread no existe', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT tp.id FROM team_pokemon tp JOIN teams')) return { rows: [{ id: 5 }] };
        if (sql && sql.includes('SELECT id FROM spreads')) return { rows: [] }; // spread not found
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await expect(updateTeamPokemonSpread(5, 1, 99)).rejects.toThrow('SPREAD_NOT_FOUND');
    const rollbackCall = client.query.mock.calls.find(c => c[0] === 'ROLLBACK');
    expect(rollbackCall).toBeTruthy();
  });

  test('permite spread_id=null (limpiar spread)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT tp.id FROM team_pokemon tp JOIN teams')) return { rows: [{ id: 5 }] };
        if (sql && sql.includes('UPDATE team_pokemon SET spread_id')) return { rows: [{ id: 5, spread_id: null }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await updateTeamPokemonSpread(5, 1, null);
    expect(result).not.toBeNull();
    // No debe llamar SELECT id FROM spreads con null
    const spreadCheck = client.query.mock.calls.find(c => typeof c[0] === 'string' && c[0].includes('SELECT id FROM spreads'));
    expect(spreadCheck).toBeUndefined();
  });

  test('rollback y relanza error genérico', async () => {
    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('connection lost')),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await expect(updateTeamPokemonSpread(5, 1, 3)).rejects.toThrow('connection lost');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TeamRepository (thin wrapper — cubre las 10 líneas de teamRepository.js)
// ═════════════════════════════════════════════════════════════════════════════

describe('TeamRepository — delegación al modelo', () => {
  test('create() llama a createTeam del modelo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    const result = await TeamRepo.create({ user_id: 1, name: 'T' });
    expect(result).toEqual(TEAM_ROW);
  });

  test('findByUser() llama a getTeamsByUser', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    const result = await TeamRepo.findByUser(1);
    expect(result).toEqual([TEAM_ROW]);
  });

  test('findPublic() llama a getPublicTeams', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await TeamRepo.findPublic(1);
    expect(result).toEqual([]);
  });

  test('findById() llama a getTeamById (equipo no encontrado)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await TeamRepo.findById(99);
    expect(result).toBeNull();
  });

  test('update() llama a updateTeam', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEAM_ROW] });
    const result = await TeamRepo.update(10, { name: 'T' });
    expect(result).toEqual(TEAM_ROW);
  });

  test('delete() llama a deleteTeam', async () => {
    const inactive = { ...TEAM_ROW, active: false };
    mockQuery.mockResolvedValueOnce({ rows: [inactive] });
    const result = await TeamRepo.delete(10);
    expect(result.active).toBe(false);
  });

  test('getFeedbackCounts() llama a getFeedbackCounts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ wins: 1, loses: 2 }] });
    const result = await TeamRepo.getFeedbackCounts(10);
    expect(result).toEqual({ wins: 1, loses: 2 });
  });

  test('replacePokemons() llama a replaceTeamPokemons del modelo (transacción)', async () => {
    const result = await TeamRepo.replacePokemons(10, [{ id: 1 }]);
    expect(result).toBe(true);
  });

  test('addFeedback() llama a addTeamFeedback del modelo (transacción)', async () => {
    const result = await TeamRepo.addFeedback(10, 1, 'good');
    expect(result).toMatchObject({ id: 5 });
  });

  test('updatePokemonSpread() llama a updateTeamPokemonSpread del modelo (transacción)', async () => {
    const result = await TeamRepo.updatePokemonSpread(5, 1, 3);
    expect(result).not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Ramas no cubiertas — cobertura de branches faltantes
// ═════════════════════════════════════════════════════════════════════════════

describe('replaceTeamPokemons — branches faltantes', () => {
  test('usa pk.pokemon_id cuando pk.id es falsy (línea 85)', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ pokemon_id: 25 }]); // sin pk.id
    const insertCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO team_pokemon '));
    expect(insertCall[1][1]).toBe(25);
  });

  test('ability string encontrada → asigna abilityId (línea 93 rama true)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id FROM abilities')) return { rows: [{ id: 7 }] };
        if (sql && sql.includes('INSERT INTO team_pokemon ')) return { rows: [{ id: 99 }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ id: 1, ability: 'Overgrow' }]);
    const insertCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO team_pokemon '));
    expect(insertCall[1][3]).toBe(7); // abilityId = 7
  });

  test('item string encontrado → asigna itemId (línea 100 rama true)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id FROM items')) return { rows: [{ id: 8 }] };
        if (sql && sql.includes('INSERT INTO team_pokemon ')) return { rows: [{ id: 99 }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ id: 1, item: 'Choice Band' }]);
    const insertCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO team_pokemon '));
    expect(insertCall[1][4]).toBe(8); // itemId = 8
  });

  test('move nombre encontrado → inserta move (línea 116 rama true)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id FROM moves')) return { rows: [{ id: 15 }] };
        if (sql && sql.includes('INSERT INTO team_pokemon ')) return { rows: [{ id: 99 }] };
        if (sql && sql.includes('INSERT INTO team_pokemon_moves')) return { rows: [] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    await replaceTeamPokemons(10, [{ id: 1, moves: ['Tackle'] }]);
    const moveInsert = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO team_pokemon_moves'));
    expect(moveInsert).toBeTruthy();
    expect(moveInsert[1][1]).toBe(15);
  });

  test('item string no encontrado → itemId queda null', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT id FROM items')) return { rows: [] }; // not found
        if (sql && sql.includes('INSERT INTO team_pokemon ')) return { rows: [{ id: 99 }] };
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await replaceTeamPokemons(10, [{ id: 1, item: 'UnknownItem' }]);
    expect(result).toBe(true);
  });
});

describe('addTeamFeedback — branches faltantes', () => {
  test('usa type="good" por defecto cuando no se pasa type (línea 135 default param)', async () => {
    const client = makeMockClient();
    mockGetClient.mockResolvedValueOnce(client);
    await addTeamFeedback(10, 1); // sin type → 'good' por defecto
    const insertCall = client.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO team_feedback'));
    expect(insertCall[1][2]).toBe(1); // wins = 1 (good)
    expect(insertCall[1][3]).toBe(0); // loses = 0
  });
});

describe('updateTeamPokemonSpread — branches faltantes', () => {
  test('devuelve null si UPDATE no devuelve filas (línea 184 || null)', async () => {
    const client = makeMockClient({
      query: jest.fn().mockImplementation(async (sql) => {
        if (sql && sql.includes('SELECT tp.id FROM team_pokemon tp JOIN teams')) return { rows: [{ id: 5 }] };
        if (sql && sql.includes('SELECT id FROM spreads')) return { rows: [{ id: 3 }] };
        if (sql && sql.includes('UPDATE team_pokemon SET spread_id')) return { rows: [] }; // sin filas
        return { rows: [] };
      }),
      release: jest.fn(),
    });
    mockGetClient.mockResolvedValueOnce(client);
    const result = await updateTeamPokemonSpread(5, 1, 3);
    expect(result).toBeNull();
  });
});
