/**
 * Suite de cobertura completa para ms_usuarios.
 *
 * Cubre los caminos que los tests existentes (tests/) no ejercitan:
 *  • dataController — todos los endpoints de datos de referencia
 *  • userController — getMe 404/500, updateMe, getCollections, addCollection, listUsers
 *  • teamsController — listTeams, listPublicTeams, getTeam, updateTeam, deleteTeam,
 *                      addFeedback, getFeedback, updatePokemonSpread
 *  • adminController — éxito y error 500 para cada función admin
 *
 * Estrategia de mock: DB boundary (config/db.js → query) + TeamRepo singleton
 *  + node-fetch (las llamadas a ms_asistencia son fire-and-forget, se mockean
 *  para no abrir sockets reales).
 */
import { jest } from '@jest/globals';

// ── 1. Mocks — deben registrarse ANTES de cualquier import del código fuente ──

const mockQuery = jest.fn();
await jest.unstable_mockModule('../src/config/db.js', () => ({
  query: mockQuery, getClient: jest.fn(),
}));

const mockFetch = jest.fn();
await jest.unstable_mockModule('node-fetch', () => ({ default: mockFetch }));

const mockTeamRepo = {
  create:               jest.fn(),
  findByUser:           jest.fn(),
  findPublic:           jest.fn(),
  findById:             jest.fn(),
  update:               jest.fn(),
  delete:               jest.fn(),
  replacePokemons:      jest.fn(),
  addFeedback:          jest.fn(),
  getFeedbackCounts:    jest.fn(),
  updatePokemonSpread:  jest.fn(),
};
await jest.unstable_mockModule('../src/repositories/teamRepository.js', () => ({
  default: mockTeamRepo,
}));

// ── 2. Importaciones dinámicas post-mock ─────────────────────────────────────

const { listMoves, listAbilities, listItems, listSpreads, createSpread }
  = await import('../src/controllers/dataController.js');

const { getMe, updateMe, getCollections, addCollection, removeCollection, listUsers }
  = await import('../src/controllers/userController.js');

const {
  listTeams, listPublicTeams, createTeam, getTeam, updateTeam,
  deleteTeam, addFeedback, getFeedback, updatePokemonSpread,
} = await import('../src/controllers/teamsController.js');

const AdminCtrl = (await import('../src/controllers/adminController.js')).default;

// ── 3. Helpers ───────────────────────────────────────────────────────────────

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

/** Construye un req con user.id=1 y los campos opcionales dados */
function req(overrides = {}) {
  return { user: { id: 1, username: 'testuser', email: 'test@test.com' }, query: {}, params: {}, body: {}, ...overrides };
}

/** Prepara el mock para que la 1ª query devuelva is_admin:true */
function setupAdmin() {
  mockQuery.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
}

/** Lista de datos vacía para mocks de data */
const EMPTY = { rows: [] };
const ONE   = (r) => ({ rows: [r] });

beforeEach(() => {
  jest.resetAllMocks();
  // El fetch de background siempre falla silenciosamente en tests
  mockFetch.mockRejectedValue(new Error('no network in tests'));
});

// ═════════════════════════════════════════════════════════════════════════════
// dataController
// ═════════════════════════════════════════════════════════════════════════════

describe('dataController — listMoves', () => {
  test('200 — devuelve lista de movimientos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Tackle' }] });
    const res = mockRes();
    await listMoves({}, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { moves: [{ id: 1, name: 'Tackle' }] } });
  });
  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listMoves({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('dataController — listAbilities', () => {
  test('200 — devuelve lista de habilidades', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Overgrow' }] });
    const res = mockRes();
    await listAbilities({}, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { abilities: [{ id: 1, name: 'Overgrow' }] } });
  });
  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listAbilities({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('dataController — listItems', () => {
  test('200 — devuelve lista de ítems', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Choice Band' }] });
    const res = mockRes();
    await listItems({}, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { items: [{ id: 1, name: 'Choice Band' }] } });
  });
  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listItems({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('dataController — listSpreads', () => {
  const SPREAD = { id: 1, nature: 'Timid', hp_evs: 0 };

  test('200 — sin filtro pokemon', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SPREAD] });
    const res = mockRes();
    await listSpreads(req({ query: {} }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { spreads: [SPREAD] } });
  });

  test('200 — con filtro ?pokemon=Garchomp (rama específica)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SPREAD] });
    const res = mockRes();
    await listSpreads(req({ query: { pokemon: 'Garchomp' } }), res);
    // La query con $1 se llamó con el nombre del pokémon
    expect(mockQuery.mock.calls[0][1]).toEqual(['Garchomp']);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { spreads: [SPREAD] } });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listSpreads(req({ query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('dataController — createSpread', () => {
  const NATURE_ROW = { id: 2, name: 'Timid' };
  const SPREAD_ROW = { id: 10, nature_id: 2, hp_evs: 0, attack_evs: 0, defense_evs: 0, sp_attack_evs: 252, sp_defense_evs: 4, speed_evs: 252 };

  test('201 — crea spread con string EV', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [NATURE_ROW] }) // upsert natures
      .mockResolvedValueOnce({ rows: [SPREAD_ROW] }); // insert spread
    const res = mockRes();
    await createSpread(req({ body: { nature: 'Timid', ev: '0/0/0/252/4/252' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('201 — crea spread con array EV', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [NATURE_ROW] })
      .mockResolvedValueOnce({ rows: [SPREAD_ROW] });
    const res = mockRes();
    await createSpread(req({ body: { nature: 'Timid', ev: [0, 0, 0, 252, 4, 252] } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('400 — faltan nature y ev', async () => {
    const res = mockRes();
    await createSpread(req({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NATURE_AND_EV_REQUIRED' });
  });

  test('400 — falta ev', async () => {
    const res = mockRes();
    await createSpread(req({ body: { nature: 'Timid' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('500 — error de DB en natures', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await createSpread(req({ body: { nature: 'Timid', ev: '0/0/0/252/4/252' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// userController
// ═════════════════════════════════════════════════════════════════════════════

const MOCK_USER_ROW = { id: 1, username: 'testuser', email: 'test@test.com', is_active: true };

describe('userController — getMe', () => {
  test('200 — usuario encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER_ROW] });
    const res = mockRes();
    await getMe(req(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { user: MOCK_USER_ROW } });
  });

  test('404 — usuario no encontrado', async () => {
    mockQuery.mockResolvedValueOnce(EMPTY);
    const res = mockRes();
    await getMe(req(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NOT_FOUND' });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await getMe(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('userController — updateMe', () => {
  test('200 — actualiza perfil', async () => {
    const updated = { ...MOCK_USER_ROW, username: 'newname' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });
    const res = mockRes();
    await updateMe(req({ body: { username: 'newname', email: 'new@test.com' } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { user: updated } });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await updateMe(req({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('userController — getCollections', () => {
  test('200 — devuelve IDs de pokémon en la colección', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ pokemon_id: 1 }, { pokemon_id: 25 }] });
    const res = mockRes();
    await getCollections(req(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { pokemonIds: [1, 25] } });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await getCollections(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('userController — addCollection', () => {
  test('200 — agrega pokémon a la colección', async () => {
    mockQuery.mockResolvedValueOnce(EMPTY);
    const res = mockRes();
    await addCollection(req({ body: { pokemon_id: 25 } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('400 — falta pokemon_id', async () => {
    const res = mockRes();
    await addCollection(req({ body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'MISSING_POKEMON_ID' });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await addCollection(req({ body: { pokemon_id: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('userController — removeCollection', () => {
  test('400 — pokemonId inválido (NaN)', async () => {
    const res = mockRes();
    await removeCollection(req({ params: { pokemonId: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'MISSING_POKEMON_ID' });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await removeCollection(req({ params: { pokemonId: '25' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('userController — listUsers', () => {
  test('200 — devuelve lista de usuarios', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER_ROW] });
    const res = mockRes();
    await listUsers(req(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { users: [MOCK_USER_ROW] } });
  });

  test('500 — error de DB', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listUsers(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// teamsController
// ═════════════════════════════════════════════════════════════════════════════

const MOCK_TEAM = { id: 10, user_id: 1, name: 'Test Team', active: true, format_id: 1, pokemon: [] };
const INACTIVE_TEAM = { ...MOCK_TEAM, active: false };
const OTHER_USER_TEAM = { ...MOCK_TEAM, user_id: 99 };

describe('teamsController — listTeams', () => {
  test('200 — lista equipos del usuario', async () => {
    mockTeamRepo.findByUser.mockResolvedValueOnce([{ id: 10 }]);
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    const res = mockRes();
    await listTeams(req(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { teams: [MOCK_TEAM] } });
  });

  test('200 — lista vacía (sin equipos)', async () => {
    mockTeamRepo.findByUser.mockResolvedValueOnce([]);
    const res = mockRes();
    await listTeams(req(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { teams: [] } });
  });

  test('200 — findById devuelve null para un equipo (se omite)', async () => {
    mockTeamRepo.findByUser.mockResolvedValueOnce([{ id: 10 }, { id: 11 }]);
    mockTeamRepo.findById
      .mockResolvedValueOnce(MOCK_TEAM)  // equipo 10 → ok
      .mockResolvedValueOnce(null);       // equipo 11 → null, se omite
    const res = mockRes();
    await listTeams(req(), res);
    const { teams } = res.json.mock.calls[0][0].data;
    expect(teams).toHaveLength(1);
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findByUser.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listTeams(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — listPublicTeams', () => {
  test('200 — devuelve equipos de otros usuarios con owner_username', async () => {
    const publicBase = [{ id: 20, user_id: 2, username: 'otheruser' }];
    const publicFull = { id: 20, user_id: 2, name: 'Public', active: true, pokemon: [] };
    mockTeamRepo.findPublic.mockResolvedValueOnce(publicBase);
    mockTeamRepo.findById.mockResolvedValueOnce(publicFull);
    const res = mockRes();
    await listPublicTeams(req(), res);
    const { teams } = res.json.mock.calls[0][0].data;
    expect(teams[0].owner_username).toBe('otheruser');
  });

  test('200 — findById null → equipo omitido', async () => {
    mockTeamRepo.findPublic.mockResolvedValueOnce([{ id: 20, user_id: 2, username: 'x' }]);
    mockTeamRepo.findById.mockResolvedValueOnce(null);
    const res = mockRes();
    await listPublicTeams(req(), res);
    expect(res.json.mock.calls[0][0].data.teams).toHaveLength(0);
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findPublic.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await listPublicTeams(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — createTeam', () => {
  const SIX_POKES = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `Mon${i + 1}` }));

  test('201 — crea equipo exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // user exists
    mockTeamRepo.create.mockResolvedValueOnce({ id: 10, user_id: 1 });
    mockTeamRepo.replacePokemons.mockResolvedValueOnce(undefined);
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    const res = mockRes();
    await createTeam(req({ body: { name: 'My Team', pokemon: SIX_POKES } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('400 — sin nombre', async () => {
    const res = mockRes();
    await createTeam(req({ body: { pokemon: SIX_POKES } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NAME_REQUIRED' });
  });

  test('400 — usuario no encontrado en DB', async () => {
    mockQuery.mockResolvedValueOnce(EMPTY); // user not found
    const res = mockRes();
    await createTeam(req({ body: { name: 'T', pokemon: SIX_POKES } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'USER_NOT_FOUND' });
  });

  test('201 — con created_by="ai"', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockTeamRepo.create.mockResolvedValueOnce({ id: 10, user_id: 1 });
    mockTeamRepo.replacePokemons.mockResolvedValueOnce(undefined);
    mockTeamRepo.findById.mockResolvedValueOnce({ ...MOCK_TEAM, pokemon: [{ name: 'Pikachu' }, { name: 'Charizard' }] });
    const res = mockRes();
    await createTeam(req({ body: { name: 'AI Team', pokemon: SIX_POKES, created_by: 'ai' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('500 — error de repositorio', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockTeamRepo.create.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await createTeam(req({ body: { name: 'T', pokemon: SIX_POKES } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — getTeam', () => {
  test('200 — devuelve equipo propio', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    const res = mockRes();
    await getTeam(req({ params: { id: '10' } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { team: MOCK_TEAM } });
  });

  test('404 — equipo no encontrado', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(null);
    const res = mockRes();
    await getTeam(req({ params: { id: '99' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NOT_FOUND' });
  });

  test('404 — equipo inactivo (soft-deleted)', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(INACTIVE_TEAM);
    const res = mockRes();
    await getTeam(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('403 — equipo de otro usuario', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(OTHER_USER_TEAM);
    const res = mockRes();
    await getTeam(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'FORBIDDEN' });
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findById.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await getTeam(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — updateTeam', () => {
  test('200 — actualiza equipo', async () => {
    mockTeamRepo.findById
      .mockResolvedValueOnce(MOCK_TEAM)   // verificar propiedad
      .mockResolvedValueOnce(MOCK_TEAM);  // resultado final
    mockTeamRepo.update.mockResolvedValueOnce(MOCK_TEAM);
    const res = mockRes();
    await updateTeam(req({ params: { id: '10' }, body: { name: 'Updated', pokemon: [] } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('200 — actualiza equipo con pokémon (llama replacePokemons)', async () => {
    const teamWithPoke = { ...MOCK_TEAM, pokemon: [{ name: 'Pikachu' }, { name: 'Raichu' }] };
    mockTeamRepo.findById
      .mockResolvedValueOnce(MOCK_TEAM)
      .mockResolvedValueOnce(teamWithPoke);
    mockTeamRepo.update.mockResolvedValueOnce(MOCK_TEAM);
    mockTeamRepo.replacePokemons.mockResolvedValueOnce(undefined);
    const SIX = Array.from({ length: 6 }, (_, i) => ({ id: i + 1 }));
    const res = mockRes();
    await updateTeam(req({ params: { id: '10' }, body: { name: 'T', pokemon: SIX } }), res);
    expect(mockTeamRepo.replacePokemons).toHaveBeenCalledTimes(1);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('404 — equipo no encontrado', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(null);
    const res = mockRes();
    await updateTeam(req({ params: { id: '99' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('403 — equipo de otro usuario', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(OTHER_USER_TEAM);
    const res = mockRes();
    await updateTeam(req({ params: { id: '10' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findById.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await updateTeam(req({ params: { id: '10' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — deleteTeam', () => {
  test('200 — elimina equipo (soft-delete)', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    mockTeamRepo.delete.mockResolvedValueOnce(undefined);
    const res = mockRes();
    await deleteTeam(req({ params: { id: '10' } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('404 — equipo no encontrado', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(null);
    const res = mockRes();
    await deleteTeam(req({ params: { id: '99' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('403 — equipo de otro usuario', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(OTHER_USER_TEAM);
    const res = mockRes();
    await deleteTeam(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findById.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await deleteTeam(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — addFeedback', () => {
  test('200 — agrega feedback "good"', async () => {
    const fb = { id: 5, team_id: 10, type: 'good' };
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    mockTeamRepo.addFeedback.mockResolvedValueOnce(fb);
    const res = mockRes();
    await addFeedback(req({ params: { id: '10' }, body: { type: 'good' } }), res);
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: { feedback: fb } });
  });

  test('200 — agrega feedback "bad"', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    mockTeamRepo.addFeedback.mockResolvedValueOnce({ type: 'bad' });
    const res = mockRes();
    await addFeedback(req({ params: { id: '10' }, body: { type: 'bad' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('400 — tipo inválido', async () => {
    const res = mockRes();
    await addFeedback(req({ params: { id: '10' }, body: { type: 'meh' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_TYPE' });
  });

  test('404 — equipo no encontrado', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(null);
    const res = mockRes();
    await addFeedback(req({ params: { id: '99' }, body: { type: 'good' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findById.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await addFeedback(req({ params: { id: '10' }, body: { type: 'good' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — getFeedback', () => {
  test('200 — devuelve conteos de feedback', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(MOCK_TEAM);
    mockTeamRepo.getFeedbackCounts.mockResolvedValueOnce({ good: 3, bad: 1 });
    const res = mockRes();
    await getFeedback(req({ params: { id: '10' } }), res);
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: { good: 3, bad: 1 } });
  });

  test('404 — equipo no encontrado', async () => {
    mockTeamRepo.findById.mockResolvedValueOnce(null);
    const res = mockRes();
    await getFeedback(req({ params: { id: '99' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'TEAM_NOT_FOUND' });
  });

  test('500 — error de repositorio', async () => {
    mockTeamRepo.findById.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await getFeedback(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teamsController — updatePokemonSpread', () => {
  const TP = { id: 5, spread_id: 3 };

  test('200 — actualiza spread de un pokémon del equipo', async () => {
    mockTeamRepo.updatePokemonSpread.mockResolvedValueOnce(TP);
    const res = mockRes();
    await updatePokemonSpread(req({ params: { id: '10', teamPokemonId: '5' }, body: { spread_id: 3 } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { team_pokemon: TP } });
  });

  test('400 — teamPokemonId no numérico', async () => {
    const res = mockRes();
    await updatePokemonSpread(req({ params: { id: '10', teamPokemonId: 'abc' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_POKEMON_ID' });
  });

  test('404 — no encontrado o sin permiso', async () => {
    mockTeamRepo.updatePokemonSpread.mockResolvedValueOnce(null);
    const res = mockRes();
    await updatePokemonSpread(req({ params: { id: '10', teamPokemonId: '5' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NOT_FOUND_OR_FORBIDDEN' });
  });

  test('404 — SPREAD_NOT_FOUND (error específico del modelo)', async () => {
    mockTeamRepo.updatePokemonSpread.mockRejectedValueOnce(new Error('SPREAD_NOT_FOUND'));
    const res = mockRes();
    await updatePokemonSpread(req({ params: { id: '10', teamPokemonId: '5' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'SPREAD_NOT_FOUND' });
  });

  test('500 — error genérico', async () => {
    mockTeamRepo.updatePokemonSpread.mockRejectedValueOnce(new Error('DB'));
    const res = mockRes();
    await updatePokemonSpread(req({ params: { id: '10', teamPokemonId: '5' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// adminController — éxito y error para cada función
// ═════════════════════════════════════════════════════════════════════════════

/** Helper: mock is_admin=true + datos de respuesta */
function adminSuccess(dataRows) {
  setupAdmin();
  mockQuery.mockResolvedValueOnce({ rows: dataRows });
}

/** Helper: mock is_admin=true + error en la query de datos */
function adminError() {
  setupAdmin();
  mockQuery.mockRejectedValueOnce(new Error('DB'));
}

describe('adminController — autorización compartida', () => {
  test('401 — sin user en req', async () => {
    const res = mockRes();
    await AdminCtrl.getTeamPerformance({ user: null, query: {}, params: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'NO_USER' });
  });

  test('403 — usuario no es admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ is_admin: false }] });
    const res = mockRes();
    await AdminCtrl.getTeamPerformance(req(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'FORBIDDEN' });
  });

  test('403 — usuario no encontrado (rows vacíos)', async () => {
    mockQuery.mockResolvedValueOnce(EMPTY);
    const res = mockRes();
    await AdminCtrl.getTeamPerformance(req(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('adminController — getTypesByCountry', () => {
  test('200 — vista tiene filas', async () => {
    adminSuccess([{ country: 'Chile', type: 'Fire', uses: 20 }]);
    const res = mockRes();
    await AdminCtrl.getTypesByCountry(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('200 — vista vacía → fallback a query en vivo', async () => {
    setupAdmin();
    mockQuery
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce({ rows: [{ country: 'Peru', type: 'Water', uses: 5 }] });
    const res = mockRes();
    await AdminCtrl.getTypesByCountry(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getTypesByCountry(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getTeamPerformance', () => {
  test('200 success', async () => {
    adminSuccess([{ created_by: 'manual', total_created: 5 }]);
    const res = mockRes();
    await AdminCtrl.getTeamPerformance(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getTeamPerformance(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getUsersByAge', () => {
  test('200 success', async () => {
    adminSuccess([{ region: 'LATAM', users: 10 }]);
    const res = mockRes();
    await AdminCtrl.getUsersByAge(req({ query: { age: '25' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('400 — age inválida', async () => {
    setupAdmin();
    const res = mockRes();
    await AdminCtrl.getUsersByAge(req({ query: { age: '999' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_AGE' });
  });

  test('400 — age ausente', async () => {
    setupAdmin();
    const res = mockRes();
    await AdminCtrl.getUsersByAge(req({ query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getUsersByAge(req({ query: { age: '25' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getUsersAgeBuckets', () => {
  test('200 success', async () => {
    adminSuccess([{ bucket: '18-24', users: 30 }]);
    const res = mockRes();
    await AdminCtrl.getUsersAgeBuckets(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getUsersAgeBuckets(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getSimulationDurationStats', () => {
  test('200 — devuelve stats (rows[0])', async () => {
    adminSuccess([{ avg_ms: 120, p95_ms: 300 }]);
    const res = mockRes();
    await AdminCtrl.getSimulationDurationStats(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('200 — sin filas devuelve {}', async () => {
    adminSuccess([]);
    const res = mockRes();
    await AdminCtrl.getSimulationDurationStats(req(), res);
    expect(res.json.mock.calls[0][0].data).toEqual({});
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getSimulationDurationStats(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getSimulationThroughputHourly', () => {
  test('200 success', async () => {
    adminSuccess([{ hour: '2024-01-01T00:00:00', simulations_count: 5 }]);
    const res = mockRes();
    await AdminCtrl.getSimulationThroughputHourly(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getSimulationThroughputHourly(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getSimulationErrors', () => {
  test('200 success', async () => {
    adminSuccess([{ status: 'failed', occurrences: 3 }]);
    const res = mockRes();
    await AdminCtrl.getSimulationErrors(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getSimulationErrors(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getUsersRegisteredByMonth', () => {
  test('200 — vista tiene filas (sin fallback)', async () => {
    adminSuccess([{ month_start: '2024-01-01', users: 10 }]);
    const res = mockRes();
    await AdminCtrl.getUsersRegisteredByMonth(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('200 — vista vacía → fallback a query en vivo', async () => {
    setupAdmin();
    mockQuery
      .mockResolvedValueOnce(EMPTY)                                        // vista vacía
      .mockResolvedValueOnce({ rows: [{ month_start: '2024-01', users: 5 }] }); // fallback
    const res = mockRes();
    await AdminCtrl.getUsersRegisteredByMonth(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(3); // is_admin + vista + fallback
  });

  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getUsersRegisteredByMonth(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getMostUsedPokemon', () => {
  test('200 — sin filtros de fecha', async () => {
    adminSuccess([{ pokemon_id: 6, pokemon_name: 'Charizard', uses: 50 }]);
    const res = mockRes();
    await AdminCtrl.getMostUsedPokemon(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('200 — con filtros from y to', async () => {
    adminSuccess([{ pokemon_id: 6, uses: 10 }]);
    const res = mockRes();
    await AdminCtrl.getMostUsedPokemon(req({ query: { from: '2024-01', to: '2024-12', limit: '10' } }), res);
    const params = mockQuery.mock.calls[1][1];
    expect(params[1]).toBe('2024-01-01');
    expect(params[2]).toBe('2024-12-01');
  });

  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getMostUsedPokemon(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getUsersByRegion', () => {
  test('200 success', async () => {
    adminSuccess([{ region: 'LATAM', total: 100 }]);
    const res = mockRes();
    await AdminCtrl.getUsersByRegion(req(), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getUsersByRegion(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getUsersRetention', () => {
  test('200 — devuelve rows[0] o {}', async () => {
    adminSuccess([{ total: 50, active: 40 }]);
    const res = mockRes();
    await AdminCtrl.getUsersRetention(req(), res);
    expect(res.json.mock.calls[0][0].data).toEqual({ total: 50, active: 40 });
  });
  test('200 — sin filas devuelve {}', async () => {
    adminSuccess([]);
    const res = mockRes();
    await AdminCtrl.getUsersRetention(req(), res);
    expect(res.json.mock.calls[0][0].data).toEqual({});
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getUsersRetention(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getUserEngagementByRegion', () => {
  test('200 success', async () => {
    adminSuccess([{ region: 'LATAM', avg_teams: 2.5 }]);
    const res = mockRes();
    await AdminCtrl.getUserEngagementByRegion(req({ query: { from: '2024-01', to: '2024-06' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getUserEngagementByRegion(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getAIUsageByRegion', () => {
  test('200 success', async () => {
    adminSuccess([{ region: 'LATAM', ai_pct: 35.5 }]);
    const res = mockRes();
    await AdminCtrl.getAIUsageByRegion(req({ query: {} }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getAIUsageByRegion(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getAgeEngagement', () => {
  test('200 success', async () => {
    adminSuccess([{ bucket: '18-24', avg_teams: 3.2 }]);
    const res = mockRes();
    await AdminCtrl.getAgeEngagement(req({ query: {} }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getAgeEngagement(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getTypeWinRates', () => {
  test('200 success', async () => {
    adminSuccess([{ type: 'Fire', win_rate: 55.2 }]);
    const res = mockRes();
    await AdminCtrl.getTypeWinRates(req({ query: {} }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getTypeWinRates(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getPokemonUsageVsWins', () => {
  test('200 success', async () => {
    adminSuccess([{ pokemon_name: 'Garchomp', teams_used: 100 }]);
    const res = mockRes();
    await AdminCtrl.getPokemonUsageVsWins(req({ query: {} }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getPokemonUsageVsWins(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getTeamsStatsByRegion', () => {
  test('200 success', async () => {
    adminSuccess([{ region: 'LATAM', total_teams: 200 }]);
    const res = mockRes();
    await AdminCtrl.getTeamsStatsByRegion(req({ query: {} }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getTeamsStatsByRegion(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getAllTeams', () => {
  test('200 — devuelve lista de equipos', async () => {
    adminSuccess([{ id: 10, name: 'Test Team', pokemon: [] }]);
    const res = mockRes();
    await AdminCtrl.getAllTeams(req(), res);
    expect(res.json.mock.calls[0][0]).toEqual({ success: true, data: { teams: [{ id: 10, name: 'Test Team', pokemon: [] }] } });
  });
  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getAllTeams(req(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminController — getTeamByIdAdmin', () => {
  test('200 — devuelve equipo completo con pokémon', async () => {
    const TEAM_ROW = { id: 10, name: 'T', user_id: 1 };
    const POKE_ROW = { team_pokemon_id: 1, pokemon_name: 'Pikachu', slot: 1 };
    setupAdmin();
    mockQuery
      .mockResolvedValueOnce({ rows: [TEAM_ROW] })  // team
      .mockResolvedValueOnce({ rows: [POKE_ROW] });  // pokemon
    const res = mockRes();
    await AdminCtrl.getTeamByIdAdmin(req({ params: { id: '10' } }), res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
    expect(res.json.mock.calls[0][0].data.team.pokemon).toEqual([POKE_ROW]);
  });

  test('400 — id inválido (NaN)', async () => {
    setupAdmin();
    const res = mockRes();
    await AdminCtrl.getTeamByIdAdmin(req({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'INVALID_ID' });
  });

  test('404 — equipo no encontrado', async () => {
    setupAdmin();
    mockQuery.mockResolvedValueOnce(EMPTY);
    const res = mockRes();
    await AdminCtrl.getTeamByIdAdmin(req({ params: { id: '99' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('500 error', async () => {
    adminError();
    const res = mockRes();
    await AdminCtrl.getTeamByIdAdmin(req({ params: { id: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
