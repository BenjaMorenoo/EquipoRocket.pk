// src/services/api.js
import axios from 'axios';

// ── PokéAPI (public) ────────────────────────────────────────────────────────
const pokeAPI = axios.create({
  baseURL: 'https://pokeapi.co/api/v2',
  timeout: 10000,
});

/**
 * Fetch a paginated list of Pokemon names + urls.
 * Default: first 300 (covers Gen 1-3, enough for a demo).
 */
export const getPokemonList = async (limit = 400, offset = 0) => {
  const { data } = await pokeAPI.get(`/pokemon?limit=${limit}&offset=${offset}`);
  return data.results; // [{ name, url }]
};

/**
 * Fetch full Pokemon data (types, stats, sprites, etc.)
 */
export const getPokemon = async (nameOrId) => {
  const { data } = await pokeAPI.get(`/pokemon/${String(nameOrId).toLowerCase()}`);
  return data;
};

/**
 * Fetch Pokemon species data (for flavor text, genera, etc.)
 */
export const getPokemonSpecies = async (nameOrId) => {
  const { data } = await pokeAPI.get(`/pokemon-species/${String(nameOrId).toLowerCase()}`);
  return data;
};

// ── Team / Backend API (placeholder — wire up when microservices are ready) ─
const backendAPI = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach auth token if present
backendAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('pk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: unified error handling
backendAPI.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
    console.error('[API Error]', msg);
    return Promise.reject(new Error(msg));
  }
);

// ── Team endpoints ──────────────────────────────────────────────────────────
export const getTeams = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/teams`, { headers });
  return data;
};

export const getTeamById = async (id) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/teams/${id}`, { headers });
  return data;
};

export const createTeam = async (team) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.post(`${msUsersBase}/teams`, team, { headers });
  return data;
};

export const updateTeam = async (id, team) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.put(`${msUsersBase}/teams/${id}`, team, { headers });
  return data;
};

export const deleteTeam = async (id) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.delete(`${msUsersBase}/teams/${id}`, { headers });
  return data;
};

// ── User endpoints ──────────────────────────────────────────────────────────
export const loginUser = async (credentials) => {
  const { data } = await backendAPI.post('/auth/login', credentials);
  return data;
};

export const registerUser = async (userData) => {
  const { data } = await backendAPI.post('/auth/register', userData);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await backendAPI.get('/auth/me');
  return data;
};

export const updateCurrentUser = async (payload) => {
  const { data } = await backendAPI.patch('/auth/me', payload);
  return data;
};

export const verifyCurrentPassword = async (password) => {
  const { data } = await backendAPI.post('/auth/verify-password', { password });
  return data;
};

// Admin: list users and toggle active state
export const getUsers = async () => {
  const { data } = await backendAPI.get('/auth/users');
  return data;
};

export const setUserActive = async (id, active, password = undefined) => {
  const body = { active };
  if (typeof password === 'string' && password.length) body.password = password;
  const { data } = await backendAPI.patch(`/auth/users/${id}/active`, body);
  return data;
};

// ── User collections (ms_usuarios) ─────────────────────────────────────────
export const getCollections = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/users/collections`, { headers });
  return data;
};

export const addToCollection = async (pokemon_id) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.post(`${msUsersBase}/users/collections`, { pokemon_id }, { headers });
  return data;
};

export const removeFromCollection = async (pokemon_id) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.delete(`${msUsersBase}/users/collections/${pokemon_id}`, { headers });
  return data;
};

// ── ms_pokemon endpoints (DB-backed Pokédex)
const msPokemonAPI = axios.create({
  baseURL: import.meta.env.VITE_MS_POKEMON_URL || 'http://localhost:3002/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const getBackendPokemons = async (limit = 200, offset = 0) => {
  const { data } = await msPokemonAPI.get(`/pokemon?limit=${limit}&offset=${offset}`);
  return data;
};

export const getBackendPokemon = async (name) => {
  const { data } = await msPokemonAPI.get(`/pokemon/${encodeURIComponent(name)}`);
  return data;
};

// Data lists from ms_usuarios
export const getMovesList = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/data/moves`, { headers });
  return data;
};

export const getAbilitiesList = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/data/abilities`, { headers });
  return data;
};

export const getItemsList = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/data/items`, { headers });
  return data;
};

// Team feedback
export const postTeamFeedback = async (team_id, type) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.post(`${msUsersBase}/teams/${team_id}/feedback`, { type }, { headers });
  return data;
};

export const getTeamFeedback = async (team_id) => {
  try {
    const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
    const token = localStorage.getItem('pk_token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const { data } = await axios.get(`${msUsersBase}/teams/${team_id}/feedback`, { headers });
    return data;
  } catch (err) {
    // Fail gracefully — caller will handle missing data
    console.debug('getTeamFeedback error', err.message || err);
    return null;
  }
};

// ── ms_asistencia (AI assistance) ───────────────────────────────────────────
const msAsistenciaBase = import.meta.env.VITE_MS_ASISTENCIA_URL || 'http://localhost:8005';

export const analyzeTeamAI = async (team) => {
  const { data } = await axios.post(`${msAsistenciaBase}/analyze/team`, { team });
  return data;
};

export const recommendTeammateAI = async (team, top_n = 6) => {
  const { data } = await axios.post(`${msAsistenciaBase}/recommend/teammate`, { team, top_n });
  return data;
};

export const recommendBuildAI = async (name) => {
  const { data } = await axios.post(`${msAsistenciaBase}/recommend/build`, { name });
  return data;
};

// ── Montecarlo service
const msMonteBase = import.meta.env.VITE_MS_MONTECARLO_URL || 'http://localhost:8010';
export const simulateBattle = async (payload) => {
  const { data } = await axios.post(`${msMonteBase}/simulate`, payload);
  return data;
};

export const persistBestConfiguration = async (payload) => {
  const { data } = await axios.post(`${msMonteBase}/persist_best`, payload);
  return data;
};

export const getSpreadsList = async (pokemonName) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const url = `${msUsersBase}/data/spreads${pokemonName ? `?pokemon=${encodeURIComponent(pokemonName)}` : ''}`;
  const { data } = await axios.get(url, { headers });
  return data;
};

export const createSpread = async ({ nature, ev }) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.post(`${msUsersBase}/data/spreads`, { nature, ev }, { headers });
  return data;
};

// Admin metrics
export const getAdminTeamPerformance = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/teams/performance`, { headers });
  return data;
};

export const getTypesByCountry = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/usage/types-by-country`, { headers });
  return data;
};

export const getUsersByAge = async (age) => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/users/by-age?age=${encodeURIComponent(age)}`, { headers });
  return data;
};

export const getUsersAgeBuckets = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/users/age-buckets`, { headers });
  return data;
};

export const getPerformanceLatency = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/performance/latency`, { headers });
  return data;
};

export const getPerformanceThroughput = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/performance/throughput`, { headers });
  return data;
};

export const getPerformanceErrors = async () => {
  const msUsersBase = import.meta.env.VITE_MS_USUARIOS_URL || 'http://localhost:3003/api';
  const token = localStorage.getItem('pk_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const { data } = await axios.get(`${msUsersBase}/admin/performance/errors`, { headers });
  return data;
};