import { query, getClient } from '../config/db.js';

export const createTeam = async ({ user_id, name, format_id, created_by = 'manual' }) => {
  const { rows } = await query(
    `INSERT INTO teams (user_id, name, format_id, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *`,
    [user_id, name, format_id ?? null, created_by]
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
  // Fetch team pokemons with ability/item/spread and moves
  const { rows: pokes } = await query(`
    SELECT tp.id as team_pokemon_id, tp.slot, p.id as pokemon_id, p.name,
           tp.ability_id, a.name AS ability_name, tp.item_id, it.name AS item_name, tp.spread_id
    FROM team_pokemon tp
    JOIN pokemon p ON tp.pokemon_id = p.id
    LEFT JOIN abilities a ON tp.ability_id = a.id
    LEFT JOIN items it ON tp.item_id = it.id
    WHERE tp.team_id = $1
    ORDER BY tp.slot
  `, [id]);
  // Attach moves for each team_pokemon
  for (const pk of pokes) {
    const { rows: moves } = await query(`SELECT m.id, m.name FROM team_pokemon_moves tpm JOIN moves m ON tpm.move_id = m.id WHERE tpm.team_pokemon_id = $1 ORDER BY tpm.slot`, [pk.team_pokemon_id]);
    pk.moves = moves.map(m => ({ id: m.id, name: m.name }));
    // expose ability/item names if available
    pk.ability = pk.ability_name || null;
    pk.item = pk.item_name || null;
    delete pk.ability_name; delete pk.item_name;
  }
  team.pokemon = pokes;
  return team;
};

export const updateTeam = async (id, payload) => {
  const { name, format_id, synergy_score } = payload;
  const { rows } = await query(
    `UPDATE teams SET name = COALESCE($2,name), format_id = COALESCE($3, format_id), synergy_score = COALESCE($4, synergy_score), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, name, format_id ?? null, synergy_score ?? null]
  );
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
    await client.query(`DELETE FROM team_pokemon_moves WHERE team_pokemon_id IN (SELECT id FROM team_pokemon WHERE team_id = $1)`, [team_id]);
    await client.query(`DELETE FROM team_pokemon WHERE team_id = $1`, [team_id]);

    const insertTpText = `INSERT INTO team_pokemon (team_id, pokemon_id, slot, ability_id, item_id, spread_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
    for (let i=0;i<pokemons.length;i++){
      const pk = pokemons[i];
      const pokemonId = pk.id || pk.pokemon_id;
      // resolve ability_id and item_id if provided as names
      let abilityId = null;
      let itemId = null;
      if (pk.ability) {
        if (typeof pk.ability === 'number') abilityId = pk.ability;
        else {
          const { rows: arows } = await client.query(`SELECT id FROM abilities WHERE LOWER(name)=LOWER($1) LIMIT 1`, [pk.ability]);
          if (arows.length) abilityId = arows[0].id;
        }
      }
      if (pk.item) {
        if (typeof pk.item === 'number') itemId = pk.item;
        else {
          const { rows: irows } = await client.query(`SELECT id FROM items WHERE LOWER(name)=LOWER($1) LIMIT 1`, [pk.item]);
          if (irows.length) itemId = irows[0].id;
        }
      }
      const spreadId = pk.spread_id || null;
      const { rows: inserted } = await client.query(insertTpText, [team_id, pokemonId, i+1, abilityId, itemId, spreadId]);
      const teamPokemonId = inserted[0].id;
      // insert moves if provided (accept ids or names)
      if (Array.isArray(pk.moves) && pk.moves.length) {
        const insertMoveText = `INSERT INTO team_pokemon_moves (team_pokemon_id, move_id, slot) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`;
        for (let m = 0; m < pk.moves.length; m++) {
          const mv = pk.moves[m];
          let moveId = null;
          if (!mv) continue;
          if (typeof mv === 'number') moveId = mv;
          else {
            const { rows: mrows } = await client.query(`SELECT id FROM moves WHERE LOWER(name)=LOWER($1) LIMIT 1`, [mv]);
            if (mrows.length) moveId = mrows[0].id;
          }
          if (moveId) await client.query(insertMoveText, [teamPokemonId, moveId, m+1]);
        }
      }
    }
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
};

export const getFeedbackCounts = async (team_id) => {
  const { rows } = await query(`SELECT COALESCE(SUM(wins),0) AS wins, COALESCE(SUM(loses),0) AS loses FROM team_feedback WHERE team_id = $1`, [team_id]);
  return rows[0] || { wins: 0, loses: 0 };
};

export const addTeamFeedback = async (team_id, user_id, type = 'good') => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT id, wins, loses FROM team_feedback WHERE team_id=$1 AND user_id=$2 LIMIT 1`, [team_id, user_id]);
    if (rows && rows.length) {
      const r = rows[0];
      if (type === 'good') {
        await client.query(`UPDATE team_feedback SET wins = COALESCE(wins,0)+1 WHERE id=$1`, [r.id]);
      } else {
        await client.query(`UPDATE team_feedback SET loses = COALESCE(loses,0)+1 WHERE id=$1`, [r.id]);
      }
      const { rows: out } = await client.query(`SELECT * FROM team_feedback WHERE id=$1`, [r.id]);
      await client.query('COMMIT');
      return out[0];
    } else {
      const wins = type === 'good' ? 1 : 0;
      const loses = type === 'bad' ? 1 : 0;
      const { rows: ins } = await client.query(`INSERT INTO team_feedback (team_id, user_id, wins, loses, created_by, created_at) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`, [team_id, user_id, wins, loses, 'manual']);
      await client.query('COMMIT');
      return ins[0];
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const updateTeamPokemonSpread = async (team_pokemon_id, user_id, spread_id) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    // verify ownership: team_pokemon -> teams.user_id == user_id
    const { rows: owner } = await client.query(`
      SELECT tp.id FROM team_pokemon tp JOIN teams t ON tp.team_id = t.id WHERE tp.id = $1 AND t.user_id = $2 LIMIT 1
    `, [team_pokemon_id, user_id]);
    if (!owner.length) {
      await client.query('ROLLBACK');
      return null; // caller will handle not found / forbidden
    }
    // validate spread exists (allow null to clear)
    if (spread_id !== null && spread_id !== undefined) {
      const { rows: srows } = await client.query(`SELECT id FROM spreads WHERE id = $1 LIMIT 1`, [spread_id]);
      if (!srows.length) { await client.query('ROLLBACK'); throw new Error('SPREAD_NOT_FOUND'); }
    }
    const { rows } = await client.query(`UPDATE team_pokemon SET spread_id = $1 WHERE id = $2 RETURNING *`, [spread_id ?? null, team_pokemon_id]);
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
};
