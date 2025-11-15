-- ================================================================
-- CHECK LAST KPI REFRESH TIME
-- ================================================================
-- Run this to see when KPIs were last updated
-- ================================================================

-- Check the most recent KPI computation time
SELECT
  organization_id,
  theme,
  kpi_title,
  kpi_value_human,
  computed_at,
  NOW() - computed_at AS age
FROM public.kpi_cards
ORDER BY computed_at DESC
LIMIT 20;

-- Check KPI refresh history from cron job runs
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time AS duration
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname LIKE '%kpi%'
)
ORDER BY start_time DESC
LIMIT 10;
