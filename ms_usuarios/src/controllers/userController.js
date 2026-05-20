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
