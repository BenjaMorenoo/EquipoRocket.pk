import TeamRepo from '../repositories/teamRepository.js';
import { query } from '../config/db.js';

export const listTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    const teams = await TeamRepo.findByUser(userId);
    return res.json({ success:true, data: { teams } });
  } catch (e) {
    console.error('[ms_usuarios] listTeams', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const createTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, format_id, pokemon = [] } = req.body;
    if (!name) return res.status(400).json({ success:false, error: 'NAME_REQUIRED' });
    // validate user exists
    const { rows: urows } = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length) return res.status(400).json({ success:false, error: 'USER_NOT_FOUND' });
    const team = await TeamRepo.create({ user_id: userId, name, format_id });
    if (pokemon.length) await TeamRepo.replacePokemons(team.id, pokemon);
    const t = await TeamRepo.findById(team.id);
    return res.status(201).json({ success:true, data: { team: t } });
  } catch (e) {
    console.error('[ms_usuarios] createTeam', e);
    // Return helpful error for FK violations or validation errors
    const msg = e?.constraint || e?.message || 'INTERNAL_ERROR';
    return res.status(500).json({ success:false, error: msg });
  }
};

export const getTeam = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const team = await TeamRepo.findById(id);
    if (!team) return res.status(404).json({ success:false, error: 'NOT_FOUND' });
    if (team.user_id !== req.user.id) return res.status(403).json({ success:false, error: 'FORBIDDEN' });
    return res.json({ success:true, data: { team } });
  } catch (e) {
    console.error('[ms_usuarios] getTeam', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const team = await TeamRepo.findById(id);
    if (!team) return res.status(404).json({ success:false, error: 'NOT_FOUND' });
    if (team.user_id !== req.user.id) return res.status(403).json({ success:false, error: 'FORBIDDEN' });
    const { name, format_id, pokemon = [] } = req.body;
    const updated = await TeamRepo.update(id, { name, format_id });
    if (pokemon.length) await TeamRepo.replacePokemons(id, pokemon);
    const t = await TeamRepo.findById(id);
    return res.json({ success:true, data: { team: t } });
  } catch (e) {
    console.error('[ms_usuarios] updateTeam', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const team = await TeamRepo.findById(id);
    if (!team) return res.status(404).json({ success:false, error: 'NOT_FOUND' });
    if (team.user_id !== req.user.id) return res.status(403).json({ success:false, error: 'FORBIDDEN' });
    await TeamRepo.delete(id);
    return res.json({ success:true });
  } catch (e) {
    console.error('[ms_usuarios] deleteTeam', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};
