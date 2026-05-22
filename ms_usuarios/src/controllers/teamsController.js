import TeamRepo from '../repositories/teamRepository.js';
import { query } from '../config/db.js';
import fetch from 'node-fetch';

export const listTeams = async (req, res) => {
  try {
    const userId = req.user.id;
    // get base teams then enrich with pokemon list for each team
    const baseTeams = await TeamRepo.findByUser(userId);
    const teams = [];
    for (const t of baseTeams) {
      const full = await TeamRepo.findById(t.id);
      if (full) teams.push(full);
    }
    return res.json({ success:true, data: { teams } });
  } catch (e) {
    console.error('[ms_usuarios] listTeams', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const createTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, format_id, pokemon = [], created_by } = req.body;
    if (!name) return res.status(400).json({ success:false, error: 'NAME_REQUIRED' });
    // validate user exists
    const { rows: urows } = await query('SELECT id FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length) return res.status(400).json({ success:false, error: 'USER_NOT_FOUND' });
    const team = await TeamRepo.create({ user_id: userId, name, format_id, created_by: created_by || 'manual' });
    if (pokemon.length) await TeamRepo.replacePokemons(team.id, pokemon);
    const t = await TeamRepo.findById(team.id);
    // Synchronously compute team synergy via ms_asistencia and update teams.synergy_score,
    // then fire-and-forget to store pairwise synergy records.
    (async () => {
      try {
        const msAsst = process.env.MS_ASISTENCIA_URL || 'http://localhost:8005';
        const names = (t.pokemon || []).map(p => p.name).filter(Boolean);
        if (names.length >= 2) {
          // analyze team
          try {
            const resp = await fetch(`${msAsst.replace(/\/$/, '')}/analyze/team`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ team: names })
            });
            if (resp.ok) {
              const data = await resp.json();
              const synergy = Number(data?.synergy_percent ?? data?.synergy ?? null);
              if (!Number.isNaN(synergy)) {
                await TeamRepo.update(team.id, { synergy_score: synergy });
              }
            }
          } catch (e) {
            console.warn('[ms_usuarios] analyze/team failed', e.message);
          }

          // store pairwise details (non-blocking)
          (async () => {
            try {
              await fetch(`${msAsst.replace(/\/$/, '')}/store/synergy`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team: names, format_id: t.format_id || null })
              });
            } catch (e) {
              console.warn('[ms_usuarios] failed to store synergy', e.message);
            }
          })();
        }
      } catch (e) {
        console.warn('[ms_usuarios] synergy background task error', e.message);
      }
    })();
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
    // Update: compute and persist team synergy score, then store pairwise synergy (background)
    (async () => {
      try {
        const msAsst = process.env.MS_ASISTENCIA_URL || 'http://localhost:8005';
        const names = (t.pokemon || []).map(p => p.name).filter(Boolean);
        if (names.length >= 2) {
          try {
            const resp = await fetch(`${msAsst.replace(/\/$/, '')}/analyze/team`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ team: names })
            });
            if (resp.ok) {
              const data = await resp.json();
              const synergy = Number(data?.synergy_percent ?? data?.synergy ?? null);
              if (!Number.isNaN(synergy)) {
                await TeamRepo.update(id, { synergy_score: synergy });
              }
            }
          } catch (e) {
            console.warn('[ms_usuarios] analyze/team failed', e.message);
          }

          (async () => {
            try {
              await fetch(`${msAsst.replace(/\/$/, '')}/store/synergy`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team: names, format_id: t.format_id || null })
              });
            } catch (e) {
              console.warn('[ms_usuarios] failed to store synergy', e.message);
            }
          })();
        }
      } catch (e) {
        console.warn('[ms_usuarios] synergy background task error', e.message);
      }
    })();
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
