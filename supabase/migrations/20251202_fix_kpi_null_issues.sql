-- ================================================================
-- FIX KPI NULL ISSUES - Add proper NULL handling to comparative KPIs
-- ================================================================
-- This migration fixes the "null value in column kpi_value_human" error
-- by adding COALESCE wrappers to all string concatenations

DROP FUNCTION IF EXISTS public.generate_comparative_kpis();

CREATE OR REPLACE FUNCTION public.generate_comparative_kpis()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    org_record RECORD;
    org_id UUID;
    
    -- Current period metrics
    current_mtd_revenue DECIMAL;
    current_mtd_trips INTEGER;
    current_mtd_distance DECIMAL;
    current_mtd_profit DECIMAL;
    current_week_distance DECIMAL;
    current_week_trips INTEGER;
    
    -- Previous period metrics
    prev_mtd_revenue DECIMAL;
    prev_mtd_trips INTEGER;
    prev_mtd_distance DECIMAL;
    prev_mtd_profit DECIMAL;
    prev_week_distance DECIMAL;
    prev_week_trips INTEGER;
    
    -- Comparison percentages
    revenue_change_pct DECIMAL;
    trips_change_pct DECIMAL;
    distance_change_pct DECIMAL;
    profit_change_pct DECIMAL;
    week_distance_change_pct DECIMAL;
    week_trips_change_pct DECIMAL;
    
    -- Top performers
    top_vehicle RECORD;
    top_driver RECORD;
    
    -- Efficiency metrics
    current_avg_kmpl DECIMAL;
    prev_avg_kmpl DECIMAL;
    current_cost_per_km DECIMAL;
    prev_cost_per_km DECIMAL;
    
    -- Date calculations
    current_day_of_month INTEGER;
    current_month_start DATE;
    prev_month_start DATE;
    prev_month_end DATE;
    current_week_start DATE;
    prev_week_start DATE;
    
    cards_created INTEGER := 0;
BEGIN
    -- Calculate date boundaries
    current_day_of_month := EXTRACT(DAY FROM CURRENT_DATE);
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    prev_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
    prev_month_end := prev_month_start + (current_day_of_month - 1) * INTERVAL '1 day';
    current_week_start := DATE_TRUNC('week', CURRENT_DATE);
    prev_week_start := DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week');
    
    -- Process each organization
    FOR org_record IN SELECT id, name FROM organizations LOOP
        org_id := org_record.id;
        
        -- Get current month-to-date metrics
        SELECT 
            COALESCE(SUM(income_amount), 0),
            COUNT(*),
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COALESCE(SUM(net_profit), 0)
        INTO current_mtd_revenue, current_mtd_trips, current_mtd_distance, current_mtd_profit
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(trip_start_date) >= current_month_start
        AND DATE(trip_start_date) <= CURRENT_DATE;
        
        -- Get previous month-to-date metrics (same day count)
        SELECT 
            COALESCE(SUM(income_amount), 0),
            COUNT(*),
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COALESCE(SUM(net_profit), 0)
        INTO prev_mtd_revenue, prev_mtd_trips, prev_mtd_distance, prev_mtd_profit
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(trip_start_date) >= prev_month_start
        AND DATE(trip_start_date) <= prev_month_end;
        
        -- Get current week metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO current_week_distance, current_week_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(trip_start_date) >= current_week_start
        AND DATE(trip_start_date) <= CURRENT_DATE;
        
        -- Get previous week metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO prev_week_distance, prev_week_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(trip_start_date) >= prev_week_start
        AND DATE(trip_start_date) < current_week_start;
        
        -- Calculate percentage changes with NULL safety
        revenue_change_pct := CASE 
            WHEN COALESCE(prev_mtd_revenue, 0) = 0 THEN 
                CASE WHEN COALESCE(current_mtd_revenue, 0) > 0 THEN 100 ELSE 0 END
            ELSE ROUND(((COALESCE(current_mtd_revenue, 0) - COALESCE(prev_mtd_revenue, 0)) / COALESCE(prev_mtd_revenue, 1) * 100)::NUMERIC, 1)
        END;
        
        trips_change_pct := CASE 
            WHEN COALESCE(prev_mtd_trips, 0) = 0 THEN 
                CASE WHEN COALESCE(current_mtd_trips, 0) > 0 THEN 100 ELSE 0 END
            ELSE ROUND(((COALESCE(current_mtd_trips, 0) - COALESCE(prev_mtd_trips, 0))::NUMERIC / COALESCE(prev_mtd_trips, 1) * 100), 1)
        END;
        
        distance_change_pct := CASE 
            WHEN COALESCE(prev_mtd_distance, 0) = 0 THEN 
                CASE WHEN COALESCE(current_mtd_distance, 0) > 0 THEN 100 ELSE 0 END
            ELSE ROUND(((COALESCE(current_mtd_distance, 0) - COALESCE(prev_mtd_distance, 0)) / COALESCE(prev_mtd_distance, 1) * 100)::NUMERIC, 1)
        END;
        
        profit_change_pct := CASE 
            WHEN COALESCE(prev_mtd_profit, 0) = 0 THEN 
                CASE WHEN COALESCE(current_mtd_profit, 0) > 0 THEN 100 ELSE 0 END
            ELSE ROUND(((COALESCE(current_mtd_profit, 0) - COALESCE(prev_mtd_profit, 0)) / COALESCE(prev_mtd_profit, 1) * 100)::NUMERIC, 1)
        END;
        
        week_distance_change_pct := CASE 
            WHEN COALESCE(prev_week_distance, 0) = 0 THEN 
                CASE WHEN COALESCE(current_week_distance, 0) > 0 THEN 100 ELSE 0 END
            ELSE ROUND(((COALESCE(current_week_distance, 0) - COALESCE(prev_week_distance, 0)) / COALESCE(prev_week_distance, 1) * 100)::NUMERIC, 1)
        END;
        
        week_trips_change_pct := CASE 
            WHEN COALESCE(prev_week_trips, 0) = 0 THEN 
                CASE WHEN COALESCE(current_week_trips, 0) > 0 THEN 100 ELSE 0 END
            ELSE ROUND(((COALESCE(current_week_trips, 0) - COALESCE(prev_week_trips, 0))::NUMERIC / COALESCE(prev_week_trips, 1) * 100), 1)
        END;
        
        -- Get top vehicle this month
        SELECT 
            v.registration_number,
            COUNT(t.id) as trip_count,
            COALESCE(SUM(t.net_profit), 0) as total_profit
        INTO top_vehicle
        FROM trips t
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.organization_id = org_id
        AND DATE(t.trip_start_date) >= current_month_start
        AND DATE(t.trip_start_date) <= CURRENT_DATE
        GROUP BY v.registration_number
        ORDER BY total_profit DESC NULLS LAST
        LIMIT 1;
        
        -- Get top driver this month
        SELECT 
            d.name,
            COUNT(t.id) as trip_count,
            COALESCE(SUM(t.net_profit), 0) as total_profit
        INTO top_driver
        FROM trips t
        JOIN drivers d ON t.driver_id = d.id
        WHERE t.organization_id = org_id
        AND DATE(t.trip_start_date) >= current_month_start
        AND DATE(t.trip_start_date) <= CURRENT_DATE
        GROUP BY d.name
        ORDER BY total_profit DESC NULLS LAST
        LIMIT 1;
        
        -- Get efficiency metrics
        SELECT 
            COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0),
            CASE WHEN SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END) > 0
                 THEN COALESCE(SUM(total_expense) / NULLIF(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0), 0)
                 ELSE 0 END
        INTO current_avg_kmpl, current_cost_per_km
        FROM trips
        WHERE organization_id = org_id
        AND DATE(trip_start_date) >= current_month_start
        AND DATE(trip_start_date) <= CURRENT_DATE;
        
        SELECT 
            COALESCE(AVG(NULLIF(calculated_kmpl, 0)), 0),
            CASE WHEN SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END) > 0
                 THEN COALESCE(SUM(total_expense) / NULLIF(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0), 0)
                 ELSE 0 END
        INTO prev_avg_kmpl, prev_cost_per_km
        FROM trips
        WHERE organization_id = org_id
        AND DATE(trip_start_date) >= prev_month_start
        AND DATE(trip_start_date) <= prev_month_end;
        
        -- Insert all comparative KPIs with proper NULL handling
        
        -- MTD Revenue
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_revenue',
            'MTD Revenue vs Last Month',
            '₹' || TO_CHAR(COALESCE(current_mtd_revenue, 0), 'FM999,999,999') || ' (' || 
            CASE WHEN COALESCE(revenue_change_pct, 0) >= 0 THEN '+' ELSE '' END || COALESCE(revenue_change_pct, 0)::TEXT || '%)',
            COALESCE(current_mtd_revenue, 0),
            jsonb_build_object(
                'current_value', COALESCE(current_mtd_revenue, 0),
                'previous_value', COALESCE(prev_mtd_revenue, 0),
                'change_percent', COALESCE(revenue_change_pct, 0),
                'trend', CASE WHEN COALESCE(revenue_change_pct, 0) >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'month_to_date',
                'period', 'Day 1-' || current_day_of_month
            ),
            CASE WHEN COALESCE(revenue_change_pct, 0) >= 0 THEN 'success' ELSE 'danger' END,
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- MTD Trips
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_trips',
            'MTD Trips vs Last Month',
            COALESCE(current_mtd_trips, 0)::TEXT || ' trips (' || 
            CASE WHEN COALESCE(trips_change_pct, 0) >= 0 THEN '+' ELSE '' END || COALESCE(trips_change_pct, 0)::TEXT || '%)',
            COALESCE(current_mtd_trips, 0),
            jsonb_build_object(
                'current_value', COALESCE(current_mtd_trips, 0),
                'previous_value', COALESCE(prev_mtd_trips, 0),
                'change_percent', COALESCE(trips_change_pct, 0),
                'trend', CASE WHEN COALESCE(trips_change_pct, 0) >= 0 THEN 'up' ELSE 'down' END
            ),
            CASE WHEN COALESCE(trips_change_pct, 0) >= 0 THEN 'info' ELSE 'warning' END,
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- MTD Distance
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_distance',
            'MTD Distance vs Last Month',
            TO_CHAR(COALESCE(current_mtd_distance, 0), 'FM999,999') || ' km (' || 
            CASE WHEN COALESCE(distance_change_pct, 0) >= 0 THEN '+' ELSE '' END || COALESCE(distance_change_pct, 0)::TEXT || '%)',
            COALESCE(current_mtd_distance, 0),
            jsonb_build_object(
                'current_value', COALESCE(current_mtd_distance, 0),
                'previous_value', COALESCE(prev_mtd_distance, 0),
                'change_percent', COALESCE(distance_change_pct, 0)
            ),
            CASE WHEN COALESCE(distance_change_pct, 0) >= 0 THEN 'primary' ELSE 'warning' END,
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- MTD Profit
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_profit',
            'MTD Profit vs Last Month',
            '₹' || TO_CHAR(COALESCE(current_mtd_profit, 0), 'FM999,999,999') || ' (' || 
            CASE WHEN COALESCE(profit_change_pct, 0) >= 0 THEN '+' ELSE '' END || COALESCE(profit_change_pct, 0)::TEXT || '%)',
            COALESCE(current_mtd_profit, 0),
            jsonb_build_object(
                'current_value', COALESCE(current_mtd_profit, 0),
                'previous_value', COALESCE(prev_mtd_profit, 0),
                'change_percent', COALESCE(profit_change_pct, 0)
            ),
            CASE WHEN COALESCE(profit_change_pct, 0) >= 0 THEN 'success' ELSE 'danger' END,
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            theme = EXCLUDED.theme,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- WoW Distance
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.wow_distance',
            'This Week vs Last Week Distance',
            TO_CHAR(COALESCE(current_week_distance, 0), 'FM999,999') || ' km (' || 
            CASE WHEN COALESCE(week_distance_change_pct, 0) >= 0 THEN '+' ELSE '' END || COALESCE(week_distance_change_pct, 0)::TEXT || '%)',
            COALESCE(current_week_distance, 0),
            jsonb_build_object(
                'current_value', COALESCE(current_week_distance, 0),
                'previous_value', COALESCE(prev_week_distance, 0),
                'change_percent', COALESCE(week_distance_change_pct, 0)
            ),
            'info',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- WoW Trips
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.wow_trips',
            'This Week vs Last Week Trips',
            COALESCE(current_week_trips, 0)::TEXT || ' trips (' || 
            CASE WHEN COALESCE(week_trips_change_pct, 0) >= 0 THEN '+' ELSE '' END || COALESCE(week_trips_change_pct, 0)::TEXT || '%)',
            COALESCE(current_week_trips, 0),
            jsonb_build_object(
                'current_value', COALESCE(current_week_trips, 0),
                'previous_value', COALESCE(prev_week_trips, 0),
                'change_percent', COALESCE(week_trips_change_pct, 0)
            ),
            'primary',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Top Vehicle (if exists)
        IF top_vehicle.registration_number IS NOT NULL THEN
            INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
            VALUES (
                'performance.top_vehicle',
                'Top Vehicle This Month',
                COALESCE(top_vehicle.registration_number, 'N/A') || ' (₹' || TO_CHAR(COALESCE(top_vehicle.total_profit, 0), 'FM999,999') || ')',
                COALESCE(top_vehicle.total_profit, 0),
                jsonb_build_object(
                    'vehicle', COALESCE(top_vehicle.registration_number, 'N/A'),
                    'trip_count', COALESCE(top_vehicle.trip_count, 0),
                    'total_profit', COALESCE(top_vehicle.total_profit, 0)
                ),
                'primary',
                org_id,
                NOW()
            )
            ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
                kpi_value_human = EXCLUDED.kpi_value_human,
                kpi_value_raw = EXCLUDED.kpi_value_raw,
                kpi_payload = EXCLUDED.kpi_payload,
                updated_at = NOW(),
                computed_at = NOW();
        END IF;
        
        -- Top Driver (if exists)
        IF top_driver.name IS NOT NULL THEN
            INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
            VALUES (
                'performance.top_driver',
                'Top Driver This Month',
                COALESCE(top_driver.name, 'N/A') || ' (₹' || TO_CHAR(COALESCE(top_driver.total_profit, 0), 'FM999,999') || ')',
                COALESCE(top_driver.total_profit, 0),
                jsonb_build_object(
                    'driver', COALESCE(top_driver.name, 'N/A'),
                    'trip_count', COALESCE(top_driver.trip_count, 0),
                    'total_profit', COALESCE(top_driver.total_profit, 0)
                ),
                'success',
                org_id,
                NOW()
            )
            ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
                kpi_value_human = EXCLUDED.kpi_value_human,
                kpi_value_raw = EXCLUDED.kpi_value_raw,
                kpi_payload = EXCLUDED.kpi_payload,
                updated_at = NOW(),
                computed_at = NOW();
        END IF;
        
        -- Fuel Efficiency
        IF COALESCE(current_avg_kmpl, 0) > 0 THEN
            INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
            VALUES (
                'efficiency.fuel_trend',
                'Fuel Efficiency Trend',
                ROUND(COALESCE(current_avg_kmpl, 0), 2)::TEXT || ' km/L',
                ROUND(COALESCE(current_avg_kmpl, 0), 2),
                jsonb_build_object(
                    'current_value', ROUND(COALESCE(current_avg_kmpl, 0), 2),
                    'previous_value', ROUND(COALESCE(prev_avg_kmpl, 0), 2)
                ),
                'info',
                org_id,
                NOW()
            )
            ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
                kpi_value_human = EXCLUDED.kpi_value_human,
                kpi_value_raw = EXCLUDED.kpi_value_raw,
                kpi_payload = EXCLUDED.kpi_payload,
                updated_at = NOW(),
                computed_at = NOW();
        END IF;
        
        -- Cost per KM
        IF COALESCE(current_cost_per_km, 0) > 0 THEN
            INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
            VALUES (
                'efficiency.cost_per_km',
                'Cost per KM',
                '₹' || ROUND(COALESCE(current_cost_per_km, 0), 2)::TEXT || '/km',
                ROUND(COALESCE(current_cost_per_km, 0), 2),
                jsonb_build_object(
                    'current_value', ROUND(COALESCE(current_cost_per_km, 0), 2),
                    'previous_value', ROUND(COALESCE(prev_cost_per_km, 0), 2)
                ),
                'info',
                org_id,
                NOW()
            )
            ON CONFLICT (kpi_key, organization_id) DO UPDATE SET
                kpi_value_human = EXCLUDED.kpi_value_human,
                kpi_value_raw = EXCLUDED.kpi_value_raw,
                kpi_payload = EXCLUDED.kpi_payload,
                updated_at = NOW(),
                computed_at = NOW();
        END IF;
        
        cards_created := cards_created + 10;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'cards_created', cards_created,
        'message', 'Comparative KPIs generated successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_comparative_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_comparative_kpis() TO service_role;

