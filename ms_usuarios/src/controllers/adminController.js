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
  ORDER BY 1 DESC
  LIMIT 24;
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

export default {
  getTeamPerformance,
  getTypesByCountry,
  getUsersByAge,
  getUsersAgeBuckets,
  getSimulationDurationStats,
  getSimulationThroughputHourly,
  getSimulationErrors,
  getUsersRegisteredByMonth,
};
