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
    const msg = err.response?.data?.message || err.message || 'Error desconocido';
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
