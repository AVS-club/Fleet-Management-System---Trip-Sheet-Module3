-- ================================================================
-- FIX KPI CARDS RLS POLICY
-- ================================================================
-- Users should ONLY see KPIs for their own organization
-- This prevents seeing KPIs from other organizations
-- ================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view KPI cards from their organization" ON public.kpi_cards;
DROP POLICY IF EXISTS "Service role can manage all KPI cards" ON public.kpi_cards;

-- Create policy for regular users to view only their org's KPIs
CREATE POLICY "Users can view KPI cards from their organization" 
ON public.kpi_cards
FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_users 
        WHERE user_id = auth.uid()
    )
);

-- Create policy for service role to manage all KPIs (for automation)
CREATE POLICY "Service role can manage all KPI cards" 
ON public.kpi_cards
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'kpi_cards';

-- Test: Count KPIs per organization (as admin, you'll see all)
SELECT 
    organization_id,
    COUNT(*) as kpi_count,
    COUNT(DISTINCT kpi_key) as unique_keys
FROM kpi_cards
WHERE computed_at >= NOW() - INTERVAL '1 hour'
GROUP BY organization_id
ORDER BY kpi_count DESC;
