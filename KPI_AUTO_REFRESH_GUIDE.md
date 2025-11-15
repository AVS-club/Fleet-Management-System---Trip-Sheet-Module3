# KPI Auto-Refresh Guide

## Overview
Your KPIs are now configured to automatically refresh every 30 minutes, ensuring your AI Alerts page always shows up-to-date data.

## How It Works

### 1. Database Function
- **Function Name**: `generate_kpi_cards()`
- **Location**: Created in migration `20251115000000_setup_kpi_auto_refresh.sql`
- **What it does**: Calculates all KPIs for all organizations and updates the `kpi_cards` table
- **Returns**: Number of KPI cards created

### 2. Automatic Scheduling
- **Tool**: PostgreSQL pg_cron extension
- **Schedule**: Every 30 minutes (at :00 and :30 of each hour)
- **Job Name**: `refresh-kpis-every-30-minutes`
- **Cron Expression**: `0,30 * * * *`

## Applying the Migration

### Using Supabase CLI
```bash
# Make sure you're in the project directory
cd /home/user/Fleet-Management-System---Trip-Sheet-Module3

# Apply the migration
supabase db push

# Or if using migration files
supabase migration up
```

### Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20251115000000_setup_kpi_auto_refresh.sql`
4. Click **Run**

## Manual Operations

### Manually Refresh KPIs (Anytime)
```sql
SELECT public.generate_kpi_cards();
```
Or run the helper script:
```bash
# Using psql
psql -f kpi_manual_refresh.sql

# Or copy/paste in Supabase SQL Editor
```

### Check Scheduled Jobs
```sql
-- View the schedule
SELECT * FROM cron.job WHERE jobname LIKE '%kpi%';
```
Or run:
```bash
psql -f kpi_check_schedule.sql
```

### Check Last Refresh Time
```sql
-- See when KPIs were last updated
SELECT
  kpi_title,
  computed_at,
  NOW() - computed_at AS age
FROM public.kpi_cards
ORDER BY computed_at DESC
LIMIT 10;
```
Or run:
```bash
psql -f kpi_check_last_run.sql
```

## Changing the Refresh Interval

### To 5 Minutes (More Frequent)
1. Open `supabase/migrations/20251115000000_setup_kpi_auto_refresh.sql`
2. Find the commented section "ALTERNATIVE: For 5-minute intervals"
3. Uncomment those lines
4. Run the migration again

Or run this SQL directly:
```sql
-- Remove 30-minute job
SELECT cron.unschedule('refresh-kpis-every-30-minutes');

-- Add 5-minute job
SELECT cron.schedule(
  'refresh-kpis-every-5-minutes',
  '*/5 * * * *',
  $$SELECT public.generate_kpi_cards();$$
);
```

### To 1 Hour (Less Frequent)
```sql
SELECT cron.unschedule('refresh-kpis-every-30-minutes');

SELECT cron.schedule(
  'refresh-kpis-every-hour',
  '0 * * * *',
  $$SELECT public.generate_kpi_cards();$$
);
```

## Monitoring

### View Job Run History
```sql
SELECT
  job_pid,
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
```

### Check for Errors
```sql
SELECT *
FROM cron.job_run_details
WHERE status = 'failed'
  AND jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%kpi%')
ORDER BY start_time DESC;
```

## Troubleshooting

### KPIs Not Updating?

1. **Check if the cron job is active:**
   ```sql
   SELECT jobname, active FROM cron.job WHERE jobname LIKE '%kpi%';
   ```

2. **Check recent job runs:**
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%kpi%')
   ORDER BY start_time DESC LIMIT 5;
   ```

3. **Test the function manually:**
   ```sql
   SELECT public.generate_kpi_cards();
   ```

### pg_cron Not Available?

Supabase enables pg_cron by default on paid plans. For the free tier, you may need to:
- Upgrade to a paid plan, or
- Use the Supabase Edge Function approach (calling the refresh-kpis function via HTTP)

### Alternative: Frontend Polling (Not Recommended)

If pg_cron is not available, you can use the existing hook `useKPICards` which already auto-refetches every 5 minutes:
```typescript
// In src/hooks/useKPICards.ts (already implemented)
refetchInterval: 5 * 60 * 1000 // 5 minutes
```

However, this only works when users have the page open. The pg_cron approach is better because it runs server-side regardless of whether users are viewing the page.

## Testing

After applying the migration:

1. **Verify the function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'generate_kpi_cards';
   ```

2. **Run it manually once:**
   ```sql
   SELECT * FROM public.generate_kpi_cards();
   ```

3. **Check the schedule:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'refresh-kpis-every-30-minutes';
   ```

4. **Wait 30 minutes and check run history:**
   ```sql
   SELECT start_time, status, return_message
   FROM cron.job_run_details
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%kpi%')
   ORDER BY start_time DESC
   LIMIT 5;
   ```

## Performance Considerations

- **30 minutes** is a good balance between freshness and server load
- **5 minutes** may be too frequent if you have many organizations (increases database load)
- The function uses efficient queries with proper indexing
- Each run processes all organizations, so execution time scales with number of orgs

## Next Steps

1. Apply the migration to your Supabase database
2. Verify it's running: `SELECT * FROM cron.job;`
3. Wait 30 minutes and check if KPIs updated: `SELECT MAX(computed_at) FROM kpi_cards;`
4. Monitor the AI Alerts page to see fresh data every 30 minutes
