import { query } from '../config/db.js';

export const getMe = async (req, res) => {
  try {
    const id = req.user.id;
    const { rows } = await query(`SELECT id, username, email, region_id, country_id, fecha_nac, is_active, created_at FROM users WHERE id = $1 LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ success:false, error: 'NOT_FOUND' });
    return res.json({ success:true, data: { user: rows[0] } });
  } catch (e) {
    console.error('[ms_usuarios] getMe', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const updateMe = async (req, res) => {
  try {
    const id = req.user.id;
    const { username, email, region_id, country_id, fecha_nac } = req.body;
    const { rows } = await query(`UPDATE users SET username = COALESCE($2, username), email = COALESCE($3, email), region_id = COALESCE($4, region_id), country_id = COALESCE($5, country_id), fecha_nac = COALESCE($6, fecha_nac), updated_at = NOW() WHERE id = $1 RETURNING id, username, email, region_id, country_id, fecha_nac, is_active, created_at`, [id, username, email, region_id, country_id, fecha_nac]);
    return res.json({ success:true, data: { user: rows[0] } });
  } catch (e) {
    console.error('[ms_usuarios] updateMe', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const getCollections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await query(`SELECT pokemon_id FROM user_collections WHERE user_id = $1`, [userId]);
    const pokemonIds = rows.map(r => r.pokemon_id);
    return res.json({ success: true, data: { pokemonIds } });
  } catch (e) {
    console.error('[ms_usuarios] getCollections', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const addCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pokemon_id } = req.body;
    if (!pokemon_id) return res.status(400).json({ success:false, error: 'MISSING_POKEMON_ID' });
    await query(`INSERT INTO user_collections (user_id, pokemon_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, pokemon_id]);
    return res.json({ success: true });
  } catch (e) {
    console.error('[ms_usuarios] addCollection', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const removeCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const pokemonId = parseInt(req.params.pokemonId, 10);
    if (!pokemonId) return res.status(400).json({ success:false, error: 'MISSING_POKEMON_ID' });
    await query(`DELETE FROM user_collections WHERE user_id = $1 AND pokemon_id = $2`, [userId, pokemonId]);
    return res.json({ success: true });
  } catch (e) {
    console.error('[ms_usuarios] removeCollection', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const listUsers = async (req, res) => {
  try {
    // Return basic user fields for admin UI
    const { rows } = await query(`SELECT id, username, email, region_id, country_id, is_admin, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 1000`);
    return res.json({ success: true, data: { users: rows } });
  } catch (e) {
    console.error('[ms_usuarios] listUsers', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};
