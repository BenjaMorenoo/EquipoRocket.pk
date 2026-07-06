// src/services/api.js
import axios from 'axios';

// ── PokéAPI (public)
const pokeAPI = axios.create({ baseURL: 'https://pokeapi.co/api/v2', timeout: 10000 });

export const getPokemonList = async (limit = 400, offset = 0) => {
  const { data } = await pokeAPI.get(`/pokemon?limit=${limit}&offset=${offset}`);
  return data.results;
};

// Pikalytics uses shortened/different names; PokeAPI requires the full official slug
const POKEAPI_NAME_MAP = {
  'calyrex-shadow':       'calyrex-shadow-rider',
  'calyrex-ice':          'calyrex-ice-rider',
  'urshifu':              'urshifu-single-strike',
  'urshifu-rapid':        'urshifu-rapid-strike',
  'ogerpon-teal':         'ogerpon',
  'ogerpon-hearthflame':  'ogerpon-hearthflame-mask',
  'ogerpon-wellspring':   'ogerpon-wellspring-mask',
  'ogerpon-cornerstone':  'ogerpon-cornerstone-mask',
  'tauros-fire':          'tauros-paldea-blaze-breed',
  'tauros-water':         'tauros-paldea-aqua-breed',
  'tauros-combat':        'tauros-paldea-combat-breed',
  'tauros-paldea-blaze':  'tauros-paldea-blaze-breed',
  'tauros-paldea-aqua':   'tauros-paldea-aqua-breed',
  'tauros-paldea-combat': 'tauros-paldea-combat-breed',
  'basculegion':          'basculegion-male',
  'basculegion-f':        'basculegion-female',
  'indeedee-f':           'indeedee-female',
  'meowstic':             'meowstic-male',
  'meowstic-f':           'meowstic-female',
  'meowstic-f-mega':      'meowstic-female',
  'meowstic-m-mega':      'meowstic-male',
  'aegislash':            'aegislash-shield',
  'mimikyu':              'mimikyu-disguised',
  'maushold':             'maushold-family-of-four',
  'morpeko':              'morpeko-full-belly',
  'palafin':              'palafin-zero',
  'lycanroc':             'lycanroc-midday',
  'mr. rime':             'mr-rime',
  'mr.rime':              'mr-rime',
};

export const getPokemon = async (nameOrId) => {
  if (typeof nameOrId !== 'string') {
    const { data } = await pokeAPI.get(`/pokemon/${nameOrId}`);
    return data;
  }
  const raw = nameOrId.toLowerCase().trim();
  // engine.py normalizes names with spaces ("steelix mega"); PokeAPI needs hyphens ("steelix-mega")
  const hyphenated = raw.replace(/\s+/g, '-');
  const resolved = POKEAPI_NAME_MAP[raw] ?? POKEAPI_NAME_MAP[hyphenated] ?? hyphenated;
  const { data } = await pokeAPI.get(`/pokemon/${resolved}`);
  return data;
};

export const getPokemonSpecies = async (nameOrId) => {
  const { data } = await pokeAPI.get(`/pokemon-species/${String(nameOrId).toLowerCase()}`);
  return data;
};

// ── API Gateway (use gateway for all backend calls in production)
// Default to host port 9000 because gateway is mapped to host 9000:8000 in docker-compose
const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';
// Increase default timeout to handle longer-running backend requests (e.g. asistencia, montecarlo)
export const gatewayAPI = axios.create({ baseURL: GATEWAY_URL, timeout: 60000, headers: { 'Content-Type': 'application/json' } });

gatewayAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('pk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

gatewayAPI.interceptors.response.use((res) => res, (err) => {
  const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
  console.error('[Gateway Error]', msg);
  return Promise.reject(new Error(msg));
});

// ── Auth / Users
export const loginUser = async (credentials) => { const { data } = await gatewayAPI.post('/api/auth/login', credentials); return data; };
export const registerUser = async (userData) => { const { data } = await gatewayAPI.post('/api/auth/register', userData); return data; };
export const getCurrentUser = async () => { const { data } = await gatewayAPI.get('/api/auth/me'); return data; };
export const updateCurrentUser = async (payload) => { const { data } = await gatewayAPI.patch('/api/auth/me', payload); return data; };
export const verifyCurrentPassword = async (password) => { const { data } = await gatewayAPI.post('/api/auth/verify-password', { password }); return data; };
export const getUsers = async () => { const { data } = await gatewayAPI.get('/api/usuarios/users'); return data; };
export const setUserActive = async (id, active, password = undefined) => { const body = { active }; if (typeof password === 'string' && password.length) body.password = password; const { data } = await gatewayAPI.patch(`/api/usuarios/users/${id}/active`, body); return data; };

// ── Teams (ms_usuarios)
export const getTeams = async () => { const { data } = await gatewayAPI.get('/api/teams'); return data; };
export const getTeamById = async (id) => { const { data } = await gatewayAPI.get(`/api/teams/${id}`); return data; };
export const createTeam = async (team) => { const { data } = await gatewayAPI.post('/api/teams', team); return data; };
export const updateTeam = async (id, team) => { const { data } = await gatewayAPI.put(`/api/teams/${id}`, team); return data; };
export const deleteTeam = async (id) => { const { data } = await gatewayAPI.delete(`/api/teams/${id}`); return data; };

// ── Collections
export const getCollections = async () => { const { data } = await gatewayAPI.get('/api/usuarios/collections'); return data; };
export const addToCollection = async (pokemon_id) => { const { data } = await gatewayAPI.post('/api/usuarios/collections', { pokemon_id }); return data; };
export const removeFromCollection = async (pokemon_id) => { const { data } = await gatewayAPI.delete(`/api/usuarios/collections/${pokemon_id}`); return data; };

// ── ms_pokemon via gateway
export const getBackendPokemons = async (limit = 200, offset = 0) => { const { data } = await gatewayAPI.get(`/api/pokemon?limit=${limit}&offset=${offset}`); return data; };
export const getBackendPokemon = async (name) => { const { data } = await gatewayAPI.get(`/api/pokemon/${encodeURIComponent(name)}`); return data; };

// ── Data lists
export const getMovesList = async () => { const { data } = await gatewayAPI.get('/api/usuarios/data/moves'); return data; };
export const getAbilitiesList = async () => { const { data } = await gatewayAPI.get('/api/usuarios/data/abilities'); return data; };
export const getItemsList = async () => { const { data } = await gatewayAPI.get('/api/usuarios/data/items'); return data; };
export const getSpreadsList = async (pokemonName) => { const url = `/api/usuarios/data/spreads${pokemonName ? `?pokemon=${encodeURIComponent(pokemonName)}` : ''}`; const { data } = await gatewayAPI.get(url); return data; };
export const createSpread = async ({ nature, ev }) => { const { data } = await gatewayAPI.post('/api/usuarios/data/spreads', { nature, ev }); return data; };

// ── Team feedback
export const postTeamFeedback = async (team_id, type) => { const { data } = await gatewayAPI.post(`/api/teams/${team_id}/feedback`, { type }); return data; };
export const getTeamFeedback = async (team_id) => { try { const { data } = await gatewayAPI.get(`/api/teams/${team_id}/feedback`); return data; } catch (err) { console.debug('getTeamFeedback error', err.message || err); return null; } };

// ── Admin metrics
export const getAdminTeamPerformance = async () => { const { data } = await gatewayAPI.get('/api/usuarios/admin/teams/performance'); return data; };
export const getTypesByCountry = async () => { const { data } = await gatewayAPI.get('/api/usuarios/admin/usage/types-by-country'); return data; };
export const getUsersByAge = async (age) => { const { data } = await gatewayAPI.get(`/api/usuarios/admin/users/by-age?age=${encodeURIComponent(age)}`); return data; };
export const getPerformanceLatency = async () => { try { const { data } = await gatewayAPI.get('/api/usuarios/admin/performance/latency'); return data; } catch (err) { console.warn('Performance latency metric unavailable:', err.message); return null; } };
export const getPerformanceThroughput = async () => { try { const { data } = await gatewayAPI.get('/api/usuarios/admin/performance/throughput'); return data; } catch (err) { console.warn('Performance throughput metric unavailable:', err.message); return null; } };
export const getPerformanceErrors = async () => { try { const { data } = await gatewayAPI.get('/api/usuarios/admin/performance/errors'); return data; } catch (err) { console.warn('Performance errors metric unavailable:', err.message); return null; } };

// ── Assistance & Montecarlo & Carga
export const analyzeTeamAI = async (team) => { const { data } = await gatewayAPI.post('/api/asistencia/analyze/team', { team }); return data; };
export const recommendTeammateAI = async (team, top_n = 6) => { const { data } = await gatewayAPI.post('/api/asistencia/recommend/teammate', { team, top_n }); return data; };
export const recommendBuildAI = async (name) => { const { data } = await gatewayAPI.post('/api/asistencia/recommend/build', { name }); return data; };
export const simulateBattle = async (payload) => { const { data } = await gatewayAPI.post('/api/montecarlo/simulate', payload); return data; };
export const persistBestConfiguration = async (payload) => { const { data } = await gatewayAPI.post('/api/montecarlo/persist_best', payload); return data; };
export const loadExternalData = async (url) => { const { data } = await gatewayAPI.post('/api/carga/load', { url }); return data; };
export const getDataStatus = async () => { try { const { data } = await gatewayAPI.get('/api/carga/status'); return data; } catch { return { loaded: false }; } };

// Additional endpoints not previously defined above — keep them going through the gateway
export const getUsersAgeBuckets = async () => {
  const { data } = await gatewayAPI.get('/api/usuarios/admin/users/age-buckets');
  return data;
};

export const getMostUsedPokemon = async (limit = 20, from = '', to = '') => {
  const p = new URLSearchParams({ limit });
  if (from) p.set('from', from);
  if (to)   p.set('to', to);
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/pokemon/most-used?${p}`);
  return data;
};

export const getUsersByRegion = async () => {
  const { data } = await gatewayAPI.get('/api/usuarios/admin/users/by-region');
  return data;
};

export const getUsersRetention = async () => {
  const { data } = await gatewayAPI.get('/api/usuarios/admin/users/retention');
  return data;
};

export const getAdminUsersRegisteredByMonth = async () => {
  const { data } = await gatewayAPI.get('/api/usuarios/admin/users/registered-by-month');
  return data;
};

export const getPublicTeams = async () => {
  const { data } = await gatewayAPI.get('/api/teams/public');
  return data;
};

const dateParams = (from, to) => { const p = new URLSearchParams(); if (from) p.set('from', from); if (to) p.set('to', to); const s = p.toString(); return s ? `?${s}` : ''; };

export const getUserEngagementByRegion = async (from = '', to = '') => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/users/engagement-by-region${dateParams(from, to)}`);
  return data;
};
export const getAIUsageByRegion = async (from = '', to = '') => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/users/ai-usage-by-region${dateParams(from, to)}`);
  return data;
};
export const getAgeEngagement = async (from = '', to = '') => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/users/age-engagement${dateParams(from, to)}`);
  return data;
};
export const getTypeWinRates = async (from = '', to = '') => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/pokemon/type-win-rates${dateParams(from, to)}`);
  return data;
};
export const getPokemonUsageVsWins = async (from = '', to = '') => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/pokemon/usage-vs-wins${dateParams(from, to)}`);
  return data;
};
export const getTeamsStatsByRegion = async (from = '', to = '') => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/teams/stats-by-region${dateParams(from, to)}`);
  return data;
};

export const getAdminTeams = async () => {
  const { data } = await gatewayAPI.get('/api/usuarios/admin/teams');
  return data;
};
export const getAdminTeamById = async (id) => {
  const { data } = await gatewayAPI.get(`/api/usuarios/admin/teams/${id}`);
  return data;
};