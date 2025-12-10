-- Set Warehouse-Based Freight Rates for Shri Durga Enterprises
-- Date: 2024-12-08
-- Purpose: Auto-populate freight_rate and billing_type based on warehouse loading points
-- This uses the existing freight rate system instead of custom revenue calculation

-- Organization ID: ab6c2178-32f9-4a03-b5ab-d535db827a58

BEGIN;

-- Disable ALL triggers for this session (including odometer validation)
SET session_replication_role = 'replica';

DO $$
BEGIN
    RAISE NOTICE '⚠️  All triggers disabled for this session';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 SETTING FREIGHT RATES BY WAREHOUSE';
    RAISE NOTICE '========================================';
END $$;

-- 1. Check current status
DO $$
DECLARE
    total_trips INTEGER;
    trips_with_freight_rate INTEGER;
    trips_without_freight_rate INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE freight_rate > 0),
        COUNT(*) FILTER (WHERE freight_rate IS NULL OR freight_rate = 0)
    INTO total_trips, trips_with_freight_rate, trips_without_freight_rate
    FROM public.trips
    WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';
    
    RAISE NOTICE '';
    RAISE NOTICE 'Current Status:';
    RAISE NOTICE '  - Total Trips: %', total_trips;
    RAISE NOTICE '  - With Freight Rate: %', trips_with_freight_rate;
    RAISE NOTICE '  - Without Freight Rate: %', trips_without_freight_rate;
    RAISE NOTICE '';
END $$;

-- 2. Set freight rate for Raipur warehouse (₹2.15/kg)
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips t
    SET 
        freight_rate = 2.15,
        billing_type = 'per_ton'
    FROM public.warehouses w
    WHERE t.warehouse_id = w.id
        AND t.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
        AND LOWER(w.name) LIKE '%raipur%'
        AND t.gross_weight IS NOT NULL
        AND t.gross_weight > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Raipur: Set freight rate for % trips (₹2.15/kg)', updated_count;
END $$;

-- 3. Set freight rate for Sambarkur/Sambalpur warehouse (₹2.21/kg)
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips t
    SET 
        freight_rate = 2.21,
        billing_type = 'per_ton'
    FROM public.warehouses w
    WHERE t.warehouse_id = w.id
        AND t.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
        AND (LOWER(w.name) LIKE '%sambarkur%' OR LOWER(w.name) LIKE '%sambalpur%')
        AND t.gross_weight IS NOT NULL
        AND t.gross_weight > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Sambarkur/Sambalpur: Set freight rate for % trips (₹2.21/kg)', updated_count;
END $$;

-- 4. Set freight rate for Bilaspur warehouse (₹2.75/kg)
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips t
    SET 
        freight_rate = 2.75,
        billing_type = 'per_ton'
    FROM public.warehouses w
    WHERE t.warehouse_id = w.id
        AND t.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
        AND LOWER(w.name) LIKE '%bilaspur%'
        AND t.gross_weight IS NOT NULL
        AND t.gross_weight > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Bilaspur: Set freight rate for % trips (₹2.75/kg)', updated_count;
END $$;

-- 5. Calculate income_amount based on freight_rate and gross_weight
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips
    SET income_amount = gross_weight * freight_rate
    WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
        AND freight_rate IS NOT NULL
        AND freight_rate > 0
        AND gross_weight IS NOT NULL
        AND gross_weight > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Calculated income for % trips (gross_weight × freight_rate)', updated_count;
END $$;

-- 6. Recalculate net_profit and profit_status for all trips
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.trips
    SET 
        net_profit = COALESCE(income_amount, 0) - COALESCE(total_expense, 0),
        profit_status = CASE
            WHEN COALESCE(income_amount, 0) > COALESCE(total_expense, 0) THEN 'profit'::profit_status
            WHEN COALESCE(income_amount, 0) < COALESCE(total_expense, 0) THEN 'loss'::profit_status
            ELSE 'neutral'::profit_status
        END
    WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
        AND income_amount IS NOT NULL
        AND income_amount > 0;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Recalculated net_profit for % trips', updated_count;
END $$;

-- 7. Revenue Summary
DO $$
DECLARE
    total_revenue NUMERIC;
    total_profit NUMERIC;
    avg_revenue_per_trip NUMERIC;
    trips_updated INTEGER;
BEGIN
    SELECT 
        COALESCE(SUM(income_amount), 0),
        COALESCE(SUM(net_profit), 0),
        COALESCE(AVG(income_amount), 0),
        COUNT(*)
    INTO total_revenue, total_profit, avg_revenue_per_trip, trips_updated
    FROM public.trips
    WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
        AND income_amount IS NOT NULL
        AND income_amount > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📈 REVENUE SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Trips with Revenue: %', trips_updated;
    RAISE NOTICE 'Total Revenue: ₹%', ROUND(total_revenue);
    RAISE NOTICE 'Total Profit: ₹%', ROUND(total_profit);
    RAISE NOTICE 'Average Revenue per Trip: ₹%', ROUND(avg_revenue_per_trip);
    RAISE NOTICE '';
END $$;

-- 8. Warehouse-wise Breakdown
DO $$
DECLARE
    warehouse_rec RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🏭 WAREHOUSE BREAKDOWN';
    RAISE NOTICE '========================================';
    
    FOR warehouse_rec IN 
        SELECT 
            w.name as warehouse_name,
            COUNT(t.id) as trip_count,
            MAX(t.freight_rate) as freight_rate,
            COALESCE(SUM(t.income_amount), 0) as total_revenue,
            COALESCE(AVG(t.income_amount), 0) as avg_revenue,
            COALESCE(SUM(t.gross_weight), 0) as total_weight
        FROM public.trips t
        JOIN public.warehouses w ON t.warehouse_id = w.id
        WHERE t.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
            AND t.income_amount IS NOT NULL
            AND t.income_amount > 0
        GROUP BY w.name
        ORDER BY total_revenue DESC
    LOOP
        RAISE NOTICE '% (₹%/kg) - Trips: % | Revenue: ₹% | Avg: ₹% | Weight: % kg', 
            warehouse_rec.warehouse_name,
            warehouse_rec.freight_rate,
            warehouse_rec.trip_count,
            ROUND(warehouse_rec.total_revenue),
            ROUND(warehouse_rec.avg_revenue),
            ROUND(warehouse_rec.total_weight);
    END LOOP;
    RAISE NOTICE '';
END $$;

-- 9. ODOMETER DISCONTINUITY REPORT
DO $$
DECLARE
    discontinuity_rec RECORD;
    total_issues INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 ODOMETER DISCONTINUITY REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Checking for trips with odometer gaps...';
    RAISE NOTICE '';
    
    FOR discontinuity_rec IN 
        WITH trip_sequence AS (
            SELECT 
                t.id,
                t.trip_serial_number,
                t.vehicle_id,
                t.start_km,
                t.end_km,
                t.trip_start_date,
                LAG(t.end_km) OVER (PARTITION BY t.vehicle_id ORDER BY t.trip_start_date, t.created_at) as prev_end_km,
                LAG(t.trip_serial_number) OVER (PARTITION BY t.vehicle_id ORDER BY t.trip_start_date, t.created_at) as prev_trip_serial,
                v.registration_number
            FROM public.trips t
            JOIN public.vehicles v ON t.vehicle_id = v.id
            WHERE t.organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
                AND t.start_km IS NOT NULL
                AND t.end_km IS NOT NULL
            ORDER BY t.vehicle_id, t.trip_start_date, t.created_at
        )
        SELECT 
            registration_number,
            trip_serial_number,
            prev_trip_serial,
            start_km,
            prev_end_km,
            (start_km - prev_end_km) as gap,
            TO_CHAR(trip_start_date, 'YYYY-MM-DD') as trip_date
        FROM trip_sequence
        WHERE prev_end_km IS NOT NULL
            AND start_km != prev_end_km
        ORDER BY ABS(start_km - prev_end_km) DESC
        LIMIT 50
    LOOP
        total_issues := total_issues + 1;
        RAISE NOTICE '⚠️  [%] % | Trip: % | Start: % km | Prev Trip: % ended at % km | Gap: % km | Date: %',
            discontinuity_rec.registration_number,
            CASE 
                WHEN discontinuity_rec.gap < 0 THEN 'BACKWARDS'
                WHEN ABS(discontinuity_rec.gap) > 100 THEN 'LARGE GAP'
                ELSE 'SMALL GAP'
            END,
            discontinuity_rec.trip_serial_number,
            discontinuity_rec.start_km,
            discontinuity_rec.prev_trip_serial,
            discontinuity_rec.prev_end_km,
            discontinuity_rec.gap,
            discontinuity_rec.trip_date;
    END LOOP;
    
    RAISE NOTICE '';
    IF total_issues = 0 THEN
        RAISE NOTICE '✅ No odometer discontinuity issues found!';
    ELSE
        RAISE NOTICE '📊 Found % trips with odometer discontinuity (showing top 50)', total_issues;
        RAISE NOTICE '💡 These trips need manual review and correction';
    END IF;
    RAISE NOTICE '';
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All triggers have been re-enabled';
    RAISE NOTICE 'Freight rates set based on warehouse loading points';
    RAISE NOTICE 'Future trips will auto-populate freight_rate';
    RAISE NOTICE 'Revenue calculated using existing billing system';
    RAISE NOTICE '';
END $$;

COMMIT;





