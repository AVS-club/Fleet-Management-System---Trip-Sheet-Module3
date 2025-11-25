-- ================================================================
-- DELETE KPIs FROM TEST ORGANIZATIONS
-- ================================================================
-- Keep ONLY KPIs for your organization
-- ================================================================

-- Your organization ID (keep this one)
DO $$
DECLARE
    your_org_id UUID := 'ab6c2178-32f9-4a03-b5ab-d535db827a58';
    deleted_count INTEGER;
BEGIN
    -- Delete ALL KPIs that are NOT for your organization
    DELETE FROM kpi_cards
    WHERE organization_id != your_org_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Deleted % KPIs from test organizations', deleted_count;
    
    -- Show remaining KPIs (should be ONLY yours)
    RAISE NOTICE '📊 Remaining KPIs for your organization:';
END $$;

-- Verify cleanup
SELECT 
    'After cleanup' as status,
    organization_id,
    COUNT(*) as kpi_count,
    COUNT(DISTINCT kpi_key) as unique_keys
FROM kpi_cards
GROUP BY organization_id
ORDER BY kpi_count DESC;






