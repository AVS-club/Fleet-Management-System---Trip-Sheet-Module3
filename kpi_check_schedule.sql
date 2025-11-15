-- ================================================================
-- CHECK KPI AUTO-REFRESH SCHEDULE
-- ================================================================
-- Run this to see the scheduled cron jobs for KPI refresh
-- ================================================================

-- View all scheduled jobs
SELECT
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job
WHERE jobname LIKE '%kpi%';

-- Expected output should show:
-- jobname: 'refresh-kpis-every-30-minutes'
-- schedule: '0,30 * * * *'
-- command: 'SELECT public.generate_kpi_cards();'
-- active: true
