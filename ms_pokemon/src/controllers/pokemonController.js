import { query } from '../config/db.js';

export const listPokemons = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '200'), 2000);
  const offset = parseInt(req.query.offset || '0');
  try {
    const q = `SELECT id, name, hp, attack, defense, sp_attack, sp_defense, speed FROM pokemon ORDER BY id ASC LIMIT $1 OFFSET $2`;
    const { rows } = await query(q, [limit, offset]);
    return res.json({ success: true, data: { pokemons: rows } });
  } catch (e) {
    console.error('[ms_pokemon] listPokemons error', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

export const getPokemon = async (req, res) => {
  const name = req.params.name;
  if (!name) return res.status(400).json({ success: false, error: 'NAME_REQUIRED' });
  try {
    const q = `SELECT id, name, hp, attack, defense, sp_attack, sp_defense, speed FROM pokemon WHERE LOWER(name)=LOWER($1) LIMIT 1`;
    const { rows } = await query(q, [name]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return res.json({ success: true, data: { pokemon: rows[0] } });
  } catch (e) {
    console.error('[ms_pokemon] getPokemon error', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};
