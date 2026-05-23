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
