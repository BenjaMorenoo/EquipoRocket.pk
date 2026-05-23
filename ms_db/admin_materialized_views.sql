-- Materialized view for admin team performance aggregates
-- Run as a DBA: psql -d <db> -f admin_materialized_views.sql

CREATE MATERIALIZED VIEW IF NOT EXISTS admin_team_performance AS
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
  CASE WHEN SUM(feedback_wins)+SUM(feedback_loses)=0 THEN NULL
    ELSE (SUM(feedback_wins)::decimal / (SUM(feedback_wins)+SUM(feedback_loses)))*100 END AS feedback_success_pct,
  SUM(sim_participated) AS sim_participated,
  SUM(sim_wins) AS sim_wins,
  CASE WHEN SUM(sim_participated)=0 THEN NULL
    ELSE (SUM(sim_wins)::decimal / SUM(sim_participated))*100 END AS sim_success_pct,
  CASE
      WHEN (SUM(sim_participated)=0 AND SUM(feedback_wins)+SUM(feedback_loses)=0) THEN NULL
      ELSE ABS(
        COALESCE( (SUM(sim_wins)::decimal / NULLIF(SUM(sim_participated),0))*100, 0 )
        - COALESCE( (SUM(feedback_wins)::decimal / NULLIF(SUM(feedback_wins)+SUM(feedback_loses),0))*100, 0 )
      )
  END AS discrepancy_pct,
  CASE
      WHEN SUM(sim_participated)=0 AND (SUM(feedback_wins)+SUM(feedback_loses))=0 THEN NULL
      WHEN SUM(sim_participated)=0 THEN (SUM(feedback_wins)::decimal / NULLIF(SUM(feedback_wins)+SUM(feedback_loses),0))*100
      WHEN (SUM(feedback_wins)+SUM(feedback_loses))=0 THEN (SUM(sim_wins)::decimal / NULLIF(SUM(sim_participated),0))*100
      ELSE ((SUM(sim_wins)::decimal / SUM(sim_participated))*0.8 + (SUM(feedback_wins)::decimal / (SUM(feedback_wins)+SUM(feedback_loses)))*0.2)*100
  END AS combined_confidence_pct
FROM team_metrics
GROUP BY created_by;

-- Create a unique index on created_by so REFRESH MATERIALIZED VIEW CONCURRENTLY can be used
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_team_performance_created_by_unique ON admin_team_performance(created_by);

-- To refresh periodically:
-- REFRESH MATERIALIZED VIEW admin_team_performance;

-- =====================================================
-- Simulation performance aggregates (durations, throughput, errors)
-- =====================================================

-- Duration percentiles and averages for simulations
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_simulation_duration_stats AS
SELECT
  COUNT(*) AS total_simulations,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS avg_duration_ms,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS p50_duration_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS p95_duration_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS p99_duration_ms
FROM battle_simulations
WHERE created_at IS NOT NULL AND completed_at IS NOT NULL;

-- Hourly throughput (simulations per hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_simulation_throughput_hourly AS
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS simulations_count
FROM battle_simulations
GROUP BY hour
ORDER BY hour;

-- Errors / failures breakdown
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_simulation_errors AS
SELECT
  CASE WHEN completed_at IS NULL THEN 'incomplete' ELSE 'completed' END AS status,
  COUNT(*) AS occurrences
FROM battle_simulations
GROUP BY CASE WHEN completed_at IS NULL THEN 'incomplete' ELSE 'completed' END
ORDER BY occurrences DESC;

-- Indexes to allow CONCURRENTLY refreshes where applicable
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_simulation_duration_stats_single ON admin_simulation_duration_stats((true));
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_simulation_throughput_hourly_hour ON admin_simulation_throughput_hourly(hour);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_simulation_errors_status ON admin_simulation_errors(status);

-- Refresh examples:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY admin_simulation_duration_stats;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY admin_simulation_throughput_hourly;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY admin_simulation_errors;
