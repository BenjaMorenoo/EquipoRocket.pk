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
    const p = rows[0];

    // load types
    const tQ = `SELECT t.name FROM types t JOIN pokemon_types pt ON t.id = pt.type_id WHERE pt.pokemon_id = $1 ORDER BY pt.slot NULLS LAST`;
    const tRes = await query(tQ, [p.id]);
    const types = tRes.rows.map(r => ({ type: { name: r.name } }));

    // load abilities
    const aQ = `SELECT a.name, pa.is_hidden FROM abilities a JOIN pokemon_abilities pa ON a.id = pa.ability_id WHERE pa.pokemon_id = $1`;
    const aRes = await query(aQ, [p.id]);
    const abilities = aRes.rows.map(r => ({ ability: { name: r.name }, is_hidden: r.is_hidden }));

    // construct stats array similar to PokeAPI minimal
    const stats = [
      { stat: { name: 'hp' }, base_stat: p.hp ?? 0 },
      { stat: { name: 'attack' }, base_stat: p.attack ?? 0 },
      { stat: { name: 'defense' }, base_stat: p.defense ?? 0 },
      { stat: { name: 'sp_attack' }, base_stat: p.sp_attack ?? 0 },
      { stat: { name: 'sp_defense' }, base_stat: p.sp_defense ?? 0 },
      { stat: { name: 'speed' }, base_stat: p.speed ?? 0 },
    ];

    const publicPokemon = {
      id: p.id,
      name: p.name,
      hp: p.hp,
      attack: p.attack,
      defense: p.defense,
      sp_attack: p.sp_attack,
      sp_defense: p.sp_defense,
      speed: p.speed,
      types,
      abilities,
      stats,
    };

    return res.json({ success: true, data: { pokemon: publicPokemon } });
  } catch (e) {
    console.error('[ms_pokemon] getPokemon error', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};
