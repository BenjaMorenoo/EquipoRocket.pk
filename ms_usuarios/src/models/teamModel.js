import { query, getClient } from '../config/db.js';

export const createTeam = async ({ user_id, name, format_id }) => {
  const { rows } = await query(
    `INSERT INTO teams (user_id, name, format_id, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,'manual',NOW(),NOW()) RETURNING *`,
    [user_id, name, format_id ?? null]
  );
  return rows[0];
};

export const getTeamsByUser = async (user_id) => {
  const { rows } = await query(`SELECT * FROM teams WHERE user_id = $1 ORDER BY created_at DESC`, [user_id]);
  return rows;
};

export const getTeamById = async (id) => {
  const { rows } = await query(`SELECT * FROM teams WHERE id = $1 LIMIT 1`, [id]);
  const team = rows[0] || null;
  if (!team) return null;
  const { rows: pokes } = await query(`SELECT tp.slot, p.id as pokemon_id, p.name FROM team_pokemon tp JOIN pokemon p ON tp.pokemon_id = p.id WHERE tp.team_id = $1 ORDER BY tp.slot`, [id]);
  team.pokemon = pokes;
  return team;
};

export const updateTeam = async (id, payload) => {
  const { name, format_id } = payload;
  const { rows } = await query(`UPDATE teams SET name = COALESCE($2,name), format_id = $3, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, name, format_id]);
  return rows[0] || null;
};

export const deleteTeam = async (id) => {
  await query(`DELETE FROM teams WHERE id = $1`, [id]);
  return true;
};

export const replaceTeamPokemons = async (team_id, pokemons) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM team_pokemon WHERE team_id = $1`, [team_id]);
    const insertText = `INSERT INTO team_pokemon (team_id, pokemon_id, slot) VALUES ($1,$2,$3)`;
    for (let i=0;i<pokemons.length;i++){
      const pk = pokemons[i];
      await client.query(insertText, [team_id, pk.id || pk.pokemon_id, i+1]);
    }
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
};
