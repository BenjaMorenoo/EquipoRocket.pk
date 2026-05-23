import { query } from '../config/db.js';

export const listMoves = async (req, res) => {
  try {
    const q = `SELECT id, name FROM moves ORDER BY name ASC`;
    const { rows } = await query(q);
    return res.json({ success: true, data: { moves: rows } });
  } catch (e) {
    console.error('[ms_usuarios] listMoves', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

export const listAbilities = async (req, res) => {
  try {
    const q = `SELECT id, name FROM abilities ORDER BY name ASC`;
    const { rows } = await query(q);
    return res.json({ success: true, data: { abilities: rows } });
  } catch (e) {
    console.error('[ms_usuarios] listAbilities', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

export const listItems = async (req, res) => {
  try {
    const q = `SELECT id, name FROM items ORDER BY name ASC`;
    const { rows } = await query(q);
    return res.json({ success: true, data: { items: rows } });
  } catch (e) {
    console.error('[ms_usuarios] listItems', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

export const listSpreads = async (req, res) => {
  try {
    const pokemonName = req.query.pokemon || null;
    if (pokemonName) {
      // return spreads linked to a specific pokemon
      const q = `SELECT DISTINCT s.id, s.nature_id, n.name AS nature, n.increased_stat, n.decreased_stat, s.hp_evs, s.attack_evs, s.defense_evs, s.sp_attack_evs, s.sp_defense_evs, s.speed_evs FROM spreads s LEFT JOIN natures n ON s.nature_id = n.id JOIN pokemon_spreads ps ON ps.spread_id = s.id JOIN pokemon p ON ps.pokemon_id = p.id WHERE LOWER(p.name) = LOWER($1) ORDER BY s.id`;
      const { rows } = await query(q, [pokemonName]);
      return res.json({ success: true, data: { spreads: rows } });
    }
    const q = `SELECT s.id, s.nature_id, n.name AS nature, n.increased_stat, n.decreased_stat, s.hp_evs, s.attack_evs, s.defense_evs, s.sp_attack_evs, s.sp_defense_evs, s.speed_evs FROM spreads s LEFT JOIN natures n ON s.nature_id = n.id ORDER BY s.id`;
    const { rows } = await query(q);
    return res.json({ success: true, data: { spreads: rows } });
  } catch (e) {
    console.error('[ms_usuarios] listSpreads', e.message);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

export const createSpread = async (req, res) => {
  try {
    const { nature, ev } = req.body; // ev: '32/0/0/252/0/224' or array
    if (!nature || !ev) return res.status(400).json({ success:false, error: 'NATURE_AND_EV_REQUIRED' });
    // ensure nature exists or create
    const { rows: nrows } = await query(`INSERT INTO natures (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = natures.name RETURNING id, name`, [nature]);
    const nature_id = nrows[0].id;
    // parse ev string
    const evParts = Array.isArray(ev) ? ev : String(ev).split('/').map(x => Number(x) || 0);
    const [hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs] = [...evParts].concat([0,0,0,0,0,0]).slice(0,6);
    const { rows: srows } = await query(`INSERT INTO spreads (nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs`, [nature_id, hp_evs, attack_evs, defense_evs, sp_attack_evs, sp_defense_evs, speed_evs]);
    const spread = srows[0];
    // attach nature name
    spread.nature = nature;
    return res.status(201).json({ success:true, data: { spread } });
  } catch (e) {
    console.error('[ms_usuarios] createSpread', e.message || e);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};
