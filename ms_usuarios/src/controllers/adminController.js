import { query } from '../config/db.js';

// GET /api/admin/teams/performance
export const getTeamPerformance = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    // verify admin
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `
WITH team_metrics AS (
  SELECT t.id AS team_id,
         t.created_by,
         COALESCE(tf.wins,0) AS feedback_wins,
         COALESCE(tf.loses,0) AS feedback_loses,
         COALESCE(bs.total_simulations,0) AS sim_participated,
         COALESCE(bs.sim_wins,0) AS sim_wins
  FROM teams t
  LEFT JOIN (
    SELECT team_id, SUM(wins) AS wins, SUM(loses) AS loses
    FROM team_feedback GROUP BY team_id
  ) tf ON tf.team_id = t.id
  LEFT JOIN (
    SELECT team_id, COUNT(*) AS total_simulations, SUM(win) AS sim_wins
    FROM (
      SELECT team_a_id AS team_id, (winner_team_id = team_a_id)::int AS win FROM battle_simulations
      UNION ALL
      SELECT team_b_id AS team_id, (winner_team_id = team_b_id)::int AS win FROM battle_simulations
    ) x
    GROUP BY team_id
  ) bs ON bs.team_id = t.id
)
SELECT
  created_by,
  COUNT(*) AS total_created,
  SUM(feedback_wins) AS feedback_wins,
  SUM(feedback_loses) AS feedback_loses,
  ROUND(
    CASE WHEN SUM(feedback_wins)+SUM(feedback_loses)=0 THEN NULL
    ELSE (SUM(feedback_wins)::decimal / (SUM(feedback_wins)+SUM(feedback_loses)))*100 END
  ,2) AS feedback_success_pct,
  SUM(sim_participated) AS sim_participated,
  SUM(sim_wins) AS sim_wins,
  ROUND(
    CASE WHEN SUM(sim_participated)=0 THEN NULL
    ELSE (SUM(sim_wins)::decimal / SUM(sim_participated))*100 END
  ,2) AS sim_success_pct,
  ROUND(
    CASE
      WHEN (SUM(sim_participated)=0 AND SUM(feedback_wins)+SUM(feedback_loses)=0) THEN NULL
      ELSE ABS(
        COALESCE( (SUM(sim_wins)::decimal / NULLIF(SUM(sim_participated),0))*100, 0 )
        - COALESCE( (SUM(feedback_wins)::decimal / NULLIF(SUM(feedback_wins)+SUM(feedback_loses),0))*100, 0 )
      )
    END
  ,2) AS discrepancy_pct,
  ROUND(
    CASE
      WHEN SUM(sim_participated)=0 AND (SUM(feedback_wins)+SUM(feedback_loses))=0 THEN NULL
      WHEN SUM(sim_participated)=0 THEN (SUM(feedback_wins)::decimal / NULLIF(SUM(feedback_wins)+SUM(feedback_loses),0))*100
      WHEN (SUM(feedback_wins)+SUM(feedback_loses))=0 THEN (SUM(sim_wins)::decimal / NULLIF(SUM(sim_participated),0))*100
      ELSE ((SUM(sim_wins)::decimal / SUM(sim_participated))*0.8 + (SUM(feedback_wins)::decimal / (SUM(feedback_wins)+SUM(feedback_loses)))*0.2)*100
    END
  ,2) AS combined_confidence_pct
FROM team_metrics
GROUP BY created_by;
`;

    const { rows } = await query(sql);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getTeamPerformance', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/usage/types-by-country
export const getTypesByCountry = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    // Use materialized view for performance and stability (includes inactive teams)
    const sql = `SELECT country_id, country, type_id, type, uses FROM admin_types_by_country ORDER BY country NULLS LAST, uses DESC;`;
    const { rows } = await query(sql);
    // If materialized view is not populated yet, fallback to a live aggregation
    if (!rows.length) {
      const liveSql = `
SELECT
  c.id AS country_id,
  c.name AS country,
  ty.id AS type_id,
  ty.name AS type,
  COUNT(*) AS uses
FROM team_pokemon tp
JOIN teams te ON tp.team_id = te.id
JOIN users u ON te.user_id = u.id
LEFT JOIN countries c ON u.country_id = c.id
JOIN pokemon_types pt ON tp.pokemon_id = pt.pokemon_id AND COALESCE(pt.slot,1) = 1
JOIN types ty ON pt.type_id = ty.id
GROUP BY c.id, c.name, ty.id, ty.name
ORDER BY c.name NULLS LAST, uses DESC;
      `;
      const { rows: liveRows } = await query(liveSql);
      return res.json({ success: true, data: liveRows });
    }
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getTypesByCountry', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/users/by-age?age=NN
export const getUsersByAge = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const age = Number(req.query.age);
    if (!age || isNaN(age) || age < 0 || age > 150) return res.status(400).json({ success: false, error: 'INVALID_AGE' });

    const sql = `
SELECT r.id AS region_id, r.name AS region, c.id AS country_id, c.name AS country, COUNT(*) AS users
FROM users u
LEFT JOIN countries c ON u.country_id = c.id
LEFT JOIN regions r ON u.region_id = r.id
WHERE date_part('year', age(current_date, u.fecha_nac)) = $1
GROUP BY r.id, r.name, c.id, c.name
ORDER BY r.name NULLS LAST, users DESC;
`;
    const { rows } = await query(sql, [age]);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getUsersByAge', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/users/age-buckets
export const getUsersAgeBuckets = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `
SELECT
  bucket,
  r.id AS region_id, r.name AS region,
  c.id AS country_id, c.name AS country,
  COUNT(*) AS users
FROM (
  SELECT id, fecha_nac,
    CASE
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 0 AND 17 THEN '0-17'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 18 AND 24 THEN '18-24'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 25 AND 34 THEN '25-34'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 35 AND 44 THEN '35-44'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 45 AND 54 THEN '45-54'
      ELSE '55+'
    END AS bucket,
    region_id, country_id
  FROM users
  WHERE fecha_nac IS NOT NULL
) ub
LEFT JOIN countries c ON ub.country_id = c.id
LEFT JOIN regions r ON ub.region_id = r.id
GROUP BY bucket, r.id, r.name, c.id, c.name
ORDER BY bucket, r.name NULLS LAST, users DESC;
`;

    const { rows } = await query(sql);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getUsersAgeBuckets', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/performance/latency
export const getSimulationDurationStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `SELECT * FROM admin_simulation_duration_stats LIMIT 1;`;
    const { rows } = await query(sql);
    return res.json({ success: true, data: rows[0] || {} });
  } catch (e) {
    console.error('[ms_usuarios] getSimulationDurationStats', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/performance/throughput
export const getSimulationThroughputHourly = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `SELECT hour, simulations_count FROM admin_simulation_throughput_hourly ORDER BY hour DESC LIMIT 168;`;
    const { rows } = await query(sql);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getSimulationThroughputHourly', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/performance/errors
export const getSimulationErrors = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    // admin_simulation_errors currently exposes `status` and `occurrences` (no error_type)
    const sql = `SELECT status, occurrences FROM admin_simulation_errors ORDER BY occurrences DESC LIMIT 100;`;
    const { rows } = await query(sql);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getSimulationErrors', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/users/by-region
export const getUsersByRegion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `
SELECT
  COALESCE(r.name, 'Sin región') AS region,
  r.id AS region_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE u.is_active = TRUE OR u.is_active IS NULL) AS active,
  COUNT(*) FILTER (WHERE u.is_active = FALSE) AS inactive
FROM users u
LEFT JOIN regions r ON u.region_id = r.id
GROUP BY r.id, r.name
ORDER BY total DESC;
    `;
    const { rows } = await query(sql);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getUsersByRegion', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/users/retention
export const getUsersRetention = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `
WITH team_counts AS (
  SELECT user_id, COUNT(*) AS team_count
  FROM teams
  WHERE active IS NULL OR active = TRUE
  GROUP BY user_id
),
full_teams AS (
  SELECT t.user_id
  FROM teams t
  JOIN (
    SELECT team_id FROM team_pokemon GROUP BY team_id HAVING COUNT(*) >= 6
  ) big ON big.team_id = t.id
  WHERE t.active IS NULL OR t.active = TRUE
)
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE u.is_active = TRUE OR u.is_active IS NULL) AS active,
  SUM(CASE WHEN COALESCE(tc.team_count, 0) >= 1 THEN 1 ELSE 0 END) AS with_teams,
  SUM(CASE WHEN COALESCE(tc.team_count, 0) >= 3 THEN 1 ELSE 0 END) AS with_3teams,
  SUM(CASE WHEN ft.user_id IS NOT NULL THEN 1 ELSE 0 END) AS with_full_team
FROM users u
LEFT JOIN team_counts tc ON tc.user_id = u.id
LEFT JOIN full_teams ft ON ft.user_id = u.id;
    `;
    const { rows } = await query(sql);
    return res.json({ success: true, data: rows[0] || {} });
  } catch (e) {
    console.error('[ms_usuarios] getUsersRetention', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/users/registered-by-month
export const getUsersRegisteredByMonth = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const sql = `SELECT month_start, users FROM admin_users_registered_by_month ORDER BY month_start DESC;`;
      const { rows } = await query(sql);
      // If materialized view is empty (not yet populated), fallback to a live aggregation
      if (!rows.length) {
        const liveSql = `
  SELECT date_trunc('month', created_at) AS month_start, COUNT(*) AS users
  FROM users
  GROUP BY 1
  ORDER BY 1 DESC;
        `;
        const { rows: liveRows } = await query(liveSql);
        return res.json({ success: true, data: liveRows });
      }
      return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getUsersRegisteredByMonth', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /api/admin/pokemon/most-used?limit=20
export const getMostUsedPokemon = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 5), 50);
    const from = req.query.from || null;
    const to   = req.query.to   || null;

    const sql = `
SELECT
  p.id         AS pokemon_id,
  p.pokeapi_id AS pokeapi_id,
  p.name       AS pokemon_name,
  COUNT(*) AS uses,
  t1.name AS type1,
  t2.name AS type2
FROM team_pokemon tp
JOIN pokemon p ON tp.pokemon_id = p.id
JOIN teams t   ON tp.team_id = t.id
LEFT JOIN (
  SELECT pt.pokemon_id, ty.name
  FROM pokemon_types pt JOIN types ty ON pt.type_id = ty.id
  WHERE COALESCE(pt.slot, 1) = 1
) t1 ON t1.pokemon_id = p.id
LEFT JOIN (
  SELECT pt.pokemon_id, ty.name
  FROM pokemon_types pt JOIN types ty ON pt.type_id = ty.id
  WHERE pt.slot = 2
) t2 ON t2.pokemon_id = p.id
WHERE (t.active IS NULL OR t.active = TRUE)
  AND ($2::date IS NULL OR t.created_at::date >= $2::date)
  AND ($3::date IS NULL OR t.created_at::date < ($3::date + INTERVAL '1 month'))
GROUP BY p.id, p.name, t1.name, t2.name
ORDER BY uses DESC
LIMIT $1;
`;
    const { rows } = await query(sql, [limit, from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[ms_usuarios] getMostUsedPokemon', e.message || e);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
};

// GET /admin/users/engagement-by-region
export const getUserEngagementByRegion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const sql = `
SELECT
  COALESCE(r.name, 'Sin región') AS region,
  COUNT(u.id) AS total_users,
  ROUND(AVG(COALESCE(tc.team_count, 0))::numeric, 1) AS avg_teams,
  ROUND(
    COUNT(u.id) FILTER (WHERE u.is_active = TRUE OR u.is_active IS NULL)::decimal
    / NULLIF(COUNT(u.id), 0) * 100
  , 1) AS active_pct
FROM users u
LEFT JOIN regions r ON u.region_id = r.id
LEFT JOIN (
  SELECT user_id, COUNT(*) AS team_count
  FROM teams
  WHERE (active IS NULL OR active = TRUE)
    AND ($1::date IS NULL OR created_at::date >= $1::date)
    AND ($2::date IS NULL OR created_at::date < ($2::date + INTERVAL '1 month'))
  GROUP BY user_id
) tc ON tc.user_id = u.id
GROUP BY r.id, r.name
ORDER BY avg_teams DESC NULLS LAST, total_users DESC`;
    const { rows } = await query(sql, [from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getUserEngagementByRegion', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/users/ai-usage-by-region
export const getAIUsageByRegion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const sql = `
SELECT
  COALESCE(r.name, 'Sin región') AS region,
  COUNT(t.id) AS total_teams,
  COUNT(t.id) FILTER (WHERE t.created_by = 'ai') AS ai_teams,
  COUNT(t.id) FILTER (WHERE t.created_by = 'manual' OR t.created_by IS NULL) AS manual_teams,
  ROUND(
    COUNT(t.id) FILTER (WHERE t.created_by = 'ai')::decimal
    / NULLIF(COUNT(t.id), 0) * 100
  , 1) AS ai_pct
FROM teams t
JOIN users u ON t.user_id = u.id
LEFT JOIN regions r ON u.region_id = r.id
WHERE (t.active IS NULL OR t.active = TRUE)
  AND ($1::date IS NULL OR t.created_at::date >= $1::date)
  AND ($2::date IS NULL OR t.created_at::date < ($2::date + INTERVAL '1 month'))
GROUP BY r.id, r.name
ORDER BY total_teams DESC`;
    const { rows } = await query(sql, [from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAIUsageByRegion', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/users/age-engagement
export const getAgeEngagement = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const sql = `
SELECT
  bucket,
  COUNT(u.id) AS total_users,
  ROUND(AVG(COALESCE(tc.team_count, 0))::numeric, 1) AS avg_teams,
  ROUND(
    COUNT(u.id) FILTER (WHERE COALESCE(tc.ai_count, 0) > COALESCE(tc.manual_count, 0))::decimal
    / NULLIF(COUNT(u.id), 0) * 100
  , 1) AS prefers_ai_pct
FROM (
  SELECT id,
    CASE
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 0  AND 17 THEN '0-17'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 18 AND 24 THEN '18-24'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 25 AND 34 THEN '25-34'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 35 AND 44 THEN '35-44'
      WHEN date_part('year', age(current_date, fecha_nac)) BETWEEN 45 AND 54 THEN '45-54'
      ELSE '55+'
    END AS bucket
  FROM users WHERE fecha_nac IS NOT NULL
) u
LEFT JOIN (
  SELECT user_id,
    COUNT(*) AS team_count,
    COUNT(*) FILTER (WHERE created_by = 'ai') AS ai_count,
    COUNT(*) FILTER (WHERE created_by = 'manual' OR created_by IS NULL) AS manual_count
  FROM teams
  WHERE (active IS NULL OR active = TRUE)
    AND ($1::date IS NULL OR created_at::date >= $1::date)
    AND ($2::date IS NULL OR created_at::date < ($2::date + INTERVAL '1 month'))
  GROUP BY user_id
) tc ON tc.user_id = u.id
GROUP BY bucket
ORDER BY bucket`;
    const { rows } = await query(sql, [from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getAgeEngagement', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/pokemon/type-win-rates
export const getTypeWinRates = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const sql = `
WITH team_participations AS (
  SELECT team_a_id AS team_id, (winner_team_id = team_a_id)::int AS won FROM battle_simulations
  WHERE ($1::date IS NULL OR created_at::date >= $1::date)
    AND ($2::date IS NULL OR created_at::date < ($2::date + INTERVAL '1 month'))
  UNION ALL
  SELECT team_b_id AS team_id, (winner_team_id = team_b_id)::int AS won FROM battle_simulations
  WHERE ($1::date IS NULL OR created_at::date >= $1::date)
    AND ($2::date IS NULL OR created_at::date < ($2::date + INTERVAL '1 month'))
),
team_types AS (
  SELECT DISTINCT tp.team_id, ty.id AS type_id, ty.name AS type_name
  FROM team_pokemon tp
  JOIN pokemon_types pt ON tp.pokemon_id = pt.pokemon_id AND COALESCE(pt.slot, 1) = 1
  JOIN types ty ON pt.type_id = ty.id
)
SELECT
  tt.type_name AS type,
  COUNT(*) AS participations,
  SUM(tpar.won) AS wins,
  ROUND(AVG(tpar.won::decimal) * 100, 1) AS win_rate
FROM team_types tt
JOIN team_participations tpar ON tpar.team_id = tt.team_id
GROUP BY tt.type_id, tt.type_name
HAVING COUNT(*) >= 1
ORDER BY win_rate DESC, participations DESC`;
    const { rows } = await query(sql, [from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getTypeWinRates', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/pokemon/usage-vs-wins
export const getPokemonUsageVsWins = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const sql = `
WITH team_participations AS (
  SELECT team_a_id AS team_id, (winner_team_id = team_a_id)::int AS won FROM battle_simulations
  WHERE ($1::date IS NULL OR created_at::date >= $1::date)
    AND ($2::date IS NULL OR created_at::date < ($2::date + INTERVAL '1 month'))
  UNION ALL
  SELECT team_b_id AS team_id, (winner_team_id = team_b_id)::int AS won FROM battle_simulations
  WHERE ($1::date IS NULL OR created_at::date >= $1::date)
    AND ($2::date IS NULL OR created_at::date < ($2::date + INTERVAL '1 month'))
),
pokemon_in_teams AS (
  SELECT DISTINCT tp.pokemon_id, tp.team_id
  FROM team_pokemon tp
  JOIN teams t ON tp.team_id = t.id
  WHERE t.active IS NULL OR t.active = TRUE
)
SELECT
  p.id         AS pokemon_id,
  p.pokeapi_id AS pokeapi_id,
  p.name       AS pokemon_name,
  COUNT(DISTINCT pit.team_id) AS teams_used,
  COUNT(tpar.won) AS sim_participations,
  SUM(COALESCE(tpar.won, 0)) AS sim_wins,
  CASE WHEN COUNT(tpar.won) > 0
    THEN ROUND(SUM(COALESCE(tpar.won, 0))::decimal / COUNT(tpar.won) * 100, 1)
    ELSE NULL
  END AS win_rate,
  ty1.name AS type1
FROM pokemon_in_teams pit
JOIN pokemon p ON pit.pokemon_id = p.id
LEFT JOIN team_participations tpar ON tpar.team_id = pit.team_id
LEFT JOIN (
  SELECT pt.pokemon_id, ty.name
  FROM pokemon_types pt JOIN types ty ON pt.type_id = ty.id
  WHERE COALESCE(pt.slot, 1) = 1
) ty1 ON ty1.pokemon_id = p.id
GROUP BY p.id, p.name, ty1.name
ORDER BY teams_used DESC
LIMIT 25`;
    const { rows } = await query(sql, [from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getPokemonUsageVsWins', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/teams/stats-by-region
export const getTeamsStatsByRegion = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    const sql = `
SELECT
  COALESCE(r.name, 'Sin región') AS region,
  COUNT(t.id) AS total_teams,
  ROUND(COUNT(t.id) FILTER (WHERE t.created_by = 'ai')::decimal / NULLIF(COUNT(t.id), 0) * 100, 1) AS ai_pct,
  ROUND(AVG(COALESCE(tpc.members, 0))::numeric, 1) AS avg_size,
  ROUND(COUNT(t.id) FILTER (WHERE COALESCE(tpc.members, 0) = 6)::decimal / NULLIF(COUNT(t.id), 0) * 100, 1) AS complete_pct
FROM teams t
JOIN users u ON t.user_id = u.id
LEFT JOIN regions r ON u.region_id = r.id
LEFT JOIN (
  SELECT team_id, COUNT(*) AS members FROM team_pokemon GROUP BY team_id
) tpc ON tpc.team_id = t.id
WHERE (t.active IS NULL OR t.active = TRUE)
  AND ($1::date IS NULL OR t.created_at::date >= $1::date)
  AND ($2::date IS NULL OR t.created_at::date < ($2::date + INTERVAL '1 month'))
GROUP BY r.id, r.name
ORDER BY total_teams DESC`;
    const { rows } = await query(sql, [from ? `${from}-01` : null, to ? `${to}-01` : null]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getTeamsStatsByRegion', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/teams — lista todos los equipos con pokémon anidados (para el panel admin)
export const getAllTeams = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const { rows } = await query(`
      SELECT
        t.id, t.user_id, t.name, t.created_by, t.created_at, t.active,
        t.win_rate, t.synergy_score,
        u.username AS creator_username,
        COALESCE(
          json_agg(
            json_build_object('pokemon_id', tp.pokemon_id, 'pokeapi_id', p.pokeapi_id, 'pokemon_name', p.name, 'slot', tp.slot)
            ORDER BY tp.slot
          ) FILTER (WHERE tp.pokemon_id IS NOT NULL),
          '[]'::json
        ) AS pokemon
      FROM teams t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN team_pokemon tp ON tp.team_id = t.id
      LEFT JOIN pokemon p ON tp.pokemon_id = p.id
      WHERE (t.active IS NULL OR t.active = TRUE)
      GROUP BY t.id, u.username
      ORDER BY t.created_at DESC
    `);

    return res.json({ success: true, data: { teams: rows } });
  } catch (err) {
    console.error('getAllTeams', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/teams/:id — detalle completo de un equipo sin restricción de dueño
export const getTeamByIdAdmin = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'NO_USER' });
    const { rows: urows } = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!urows.length || !urows[0].is_admin) return res.status(403).json({ success: false, error: 'FORBIDDEN' });

    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'INVALID_ID' });

    const { rows: teamRows } = await query('SELECT t.*, u.username AS creator_username FROM teams t LEFT JOIN users u ON t.user_id = u.id WHERE t.id = $1 LIMIT 1', [id]);
    if (!teamRows.length) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    const team = teamRows[0];

    const { rows: pokes } = await query(`
      SELECT tp.id AS team_pokemon_id, tp.slot,
             p.id AS pokemon_id, p.pokeapi_id, p.name AS pokemon_name,
             tp.ability_id, a.name AS ability,
             tp.item_id, it.name AS item,
             tp.spread_id
      FROM team_pokemon tp
      JOIN pokemon p ON tp.pokemon_id = p.id
      LEFT JOIN abilities a ON tp.ability_id = a.id
      LEFT JOIN items it ON tp.item_id = it.id
      WHERE tp.team_id = $1
      ORDER BY tp.slot
    `, [id]);

    team.pokemon = pokes;
    return res.json({ success: true, data: { team } });
  } catch (err) {
    console.error('getTeamByIdAdmin', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export default {
  getTeamPerformance,
  getTypesByCountry,
  getUsersByAge,
  getUsersAgeBuckets,
  getSimulationDurationStats,
  getSimulationThroughputHourly,
  getSimulationErrors,
  getUsersRegisteredByMonth,
  getMostUsedPokemon,
  getUsersByRegion,
  getUsersRetention,
  getUserEngagementByRegion,
  getAIUsageByRegion,
  getAgeEngagement,
  getTypeWinRates,
  getPokemonUsageVsWins,
  getTeamsStatsByRegion,
  getAllTeams,
  getTeamByIdAdmin,
};
