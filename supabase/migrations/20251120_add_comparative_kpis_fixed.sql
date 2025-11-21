-- Add Comparative KPIs with Month-to-Date and Period-over-Period Analysis (FIXED)
-- This version works with the actual trips table structure

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
        AND DATE(COALESCE(trip_start_date, created_at)) >= current_month_start
        AND DATE(COALESCE(trip_start_date, created_at)) <= CURRENT_DATE;
        
        -- Get previous month-to-date metrics (same day count)
        SELECT 
            COALESCE(SUM(income_amount), 0),
            COUNT(*),
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COALESCE(SUM(net_profit), 0)
        INTO prev_mtd_revenue, prev_mtd_trips, prev_mtd_distance, prev_mtd_profit
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= prev_month_start
        AND DATE(COALESCE(trip_start_date, created_at)) <= prev_month_end;
        
        -- Get current week metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO current_week_distance, current_week_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= current_week_start
        AND DATE(COALESCE(trip_start_date, created_at)) <= CURRENT_DATE;
        
        -- Get previous week metrics
        SELECT 
            COALESCE(SUM(CASE WHEN end_km > start_km THEN end_km - start_km ELSE 0 END), 0),
            COUNT(*)
        INTO prev_week_distance, prev_week_trips
        FROM trips 
        WHERE organization_id = org_id
        AND DATE(COALESCE(trip_start_date, created_at)) >= prev_week_start
        AND DATE(COALESCE(trip_start_date, created_at)) < current_week_start;
        
        -- Calculate percentage changes
        revenue_change_pct := CASE 
            WHEN prev_mtd_revenue > 0 THEN ROUND(((current_mtd_revenue - prev_mtd_revenue) / prev_mtd_revenue) * 100, 1)
            WHEN current_mtd_revenue > 0 THEN 100
            ELSE 0 
        END;
        
        trips_change_pct := CASE 
            WHEN prev_mtd_trips > 0 THEN ROUND(((current_mtd_trips - prev_mtd_trips)::DECIMAL / prev_mtd_trips) * 100, 1)
            WHEN current_mtd_trips > 0 THEN 100
            ELSE 0 
        END;
        
        distance_change_pct := CASE 
            WHEN prev_mtd_distance > 0 THEN ROUND(((current_mtd_distance - prev_mtd_distance) / prev_mtd_distance) * 100, 1)
            WHEN current_mtd_distance > 0 THEN 100
            ELSE 0 
        END;
        
        profit_change_pct := CASE 
            WHEN prev_mtd_profit != 0 THEN ROUND(((current_mtd_profit - prev_mtd_profit) / ABS(prev_mtd_profit)) * 100, 1)
            WHEN current_mtd_profit != 0 THEN 100
            ELSE 0 
        END;
        
        week_distance_change_pct := CASE 
            WHEN prev_week_distance > 0 THEN ROUND(((current_week_distance - prev_week_distance) / prev_week_distance) * 100, 1)
            WHEN current_week_distance > 0 THEN 100
            ELSE 0 
        END;
        
        week_trips_change_pct := CASE 
            WHEN prev_week_trips > 0 THEN ROUND(((current_week_trips - prev_week_trips)::DECIMAL / prev_week_trips) * 100, 1)
            WHEN current_week_trips > 0 THEN 100
            ELSE 0 
        END;
        
        -- Insert MTD Revenue Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_revenue',
            'MTD Revenue vs Last Month',
            '₹' || TO_CHAR(current_mtd_revenue, 'FM999,999,999') || ' (' || 
            CASE WHEN revenue_change_pct >= 0 THEN '+' ELSE '' END || revenue_change_pct::TEXT || '%)',
            current_mtd_revenue,
            jsonb_build_object(
                'current_value', current_mtd_revenue,
                'previous_value', prev_mtd_revenue,
                'change_percent', revenue_change_pct,
                'trend', CASE WHEN revenue_change_pct >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'month_to_date',
                'period', 'Day 1-' || current_day_of_month
            ),
            CASE WHEN revenue_change_pct >= 0 THEN 'success' ELSE 'danger' END,
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
        
        -- Insert MTD Trips Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_trips',
            'MTD Trips vs Last Month',
            current_mtd_trips::TEXT || ' trips (' || 
            CASE WHEN trips_change_pct >= 0 THEN '+' ELSE '' END || trips_change_pct::TEXT || '%)',
            current_mtd_trips,
            jsonb_build_object(
                'current_value', current_mtd_trips,
                'previous_value', prev_mtd_trips,
                'change_percent', trips_change_pct,
                'trend', CASE WHEN trips_change_pct >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'month_to_date',
                'period', 'Day 1-' || current_day_of_month
            ),
            CASE WHEN trips_change_pct >= 0 THEN 'info' ELSE 'warning' END,
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
        
        -- Insert MTD Distance Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_distance',
            'MTD Distance vs Last Month',
            TO_CHAR(current_mtd_distance, 'FM999,999') || ' km (' || 
            CASE WHEN distance_change_pct >= 0 THEN '+' ELSE '' END || distance_change_pct::TEXT || '%)',
            current_mtd_distance,
            jsonb_build_object(
                'current_value', current_mtd_distance,
                'previous_value', prev_mtd_distance,
                'change_percent', distance_change_pct,
                'trend', CASE WHEN distance_change_pct >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'month_to_date',
                'period', 'Day 1-' || current_day_of_month
            ),
            CASE WHEN distance_change_pct >= 0 THEN 'primary' ELSE 'warning' END,
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
        
        -- Insert MTD Profit Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.mtd_profit',
            'MTD Profit vs Last Month',
            '₹' || TO_CHAR(current_mtd_profit, 'FM999,999,999') || ' (' || 
            CASE WHEN profit_change_pct >= 0 THEN '+' ELSE '' END || profit_change_pct::TEXT || '%)',
            current_mtd_profit,
            jsonb_build_object(
                'current_value', current_mtd_profit,
                'previous_value', prev_mtd_profit,
                'change_percent', profit_change_pct,
                'trend', CASE WHEN profit_change_pct >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'month_to_date',
                'period', 'Day 1-' || current_day_of_month
            ),
            CASE WHEN profit_change_pct >= 0 THEN 'success' ELSE 'danger' END,
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
        
        -- Insert Week-over-Week Distance Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.wow_distance',
            'This Week vs Last Week Distance',
            TO_CHAR(current_week_distance, 'FM999,999') || ' km (' || 
            CASE WHEN week_distance_change_pct >= 0 THEN '+' ELSE '' END || week_distance_change_pct::TEXT || '%)',
            current_week_distance,
            jsonb_build_object(
                'current_value', current_week_distance,
                'previous_value', prev_week_distance,
                'change_percent', week_distance_change_pct,
                'trend', CASE WHEN week_distance_change_pct >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'week_over_week'
            ),
            'info',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Insert Week-over-Week Trips Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'comparison.wow_trips',
            'This Week vs Last Week Trips',
            current_week_trips::TEXT || ' trips (' || 
            CASE WHEN week_trips_change_pct >= 0 THEN '+' ELSE '' END || week_trips_change_pct::TEXT || '%)',
            current_week_trips,
            jsonb_build_object(
                'current_value', current_week_trips,
                'previous_value', prev_week_trips,
                'change_percent', week_trips_change_pct,
                'trend', CASE WHEN week_trips_change_pct >= 0 THEN 'up' ELSE 'down' END,
                'comparison_type', 'week_over_week'
            ),
            'primary',
            org_id,
            NOW()
        )
        ON CONFLICT (kpi_key, organization_id) 
        DO UPDATE SET
            kpi_value_human = EXCLUDED.kpi_value_human,
            kpi_value_raw = EXCLUDED.kpi_value_raw,
            kpi_payload = EXCLUDED.kpi_payload,
            updated_at = NOW(),
            computed_at = NOW();
        
        -- Get Top Performing Vehicle
        SELECT 
            v.registration_number,
            COUNT(t.id) as trip_count,
            SUM(CASE WHEN t.end_km > t.start_km THEN t.end_km - t.start_km ELSE 0 END) as total_distance,
            AVG(t.calculated_kmpl) as avg_mileage,
            SUM(t.net_profit) as total_profit
        INTO top_vehicle
        FROM vehicles v
        LEFT JOIN trips t ON t.vehicle_id = v.id
        WHERE v.organization_id = org_id
        AND DATE(COALESCE(t.trip_start_date, t.created_at)) >= current_month_start
        GROUP BY v.id, v.registration_number
        ORDER BY total_profit DESC NULLS LAST
        LIMIT 1;
        
        -- Insert Top Vehicle KPI
        IF top_vehicle.registration_number IS NOT NULL THEN
            INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
            VALUES (
                'performance.top_vehicle',
                'Top Vehicle This Month',
                top_vehicle.registration_number || ' (₹' || TO_CHAR(COALESCE(top_vehicle.total_profit, 0), 'FM999,999') || ')',
                COALESCE(top_vehicle.total_profit, 0),
                jsonb_build_object(
                    'vehicle_number', top_vehicle.registration_number,
                    'total_distance', COALESCE(top_vehicle.total_distance, 0),
                    'trip_count', COALESCE(top_vehicle.trip_count, 0),
                    'total_profit', COALESCE(top_vehicle.total_profit, 0),
                    'avg_mileage', ROUND(COALESCE(top_vehicle.avg_mileage, 0)::NUMERIC, 2)
                ),
                'primary',
                org_id,
                NOW()
            )
            ON CONFLICT (kpi_key, organization_id) 
            DO UPDATE SET
                kpi_value_human = EXCLUDED.kpi_value_human,
                kpi_value_raw = EXCLUDED.kpi_value_raw,
                kpi_payload = EXCLUDED.kpi_payload,
                updated_at = NOW(),
                computed_at = NOW();
        END IF;
        
        -- Get Top Performing Driver
        SELECT 
            d.name,
            COUNT(t.id) as trip_count,
            SUM(CASE WHEN t.end_km > t.start_km THEN t.end_km - t.start_km ELSE 0 END) as total_distance,
            AVG(t.calculated_kmpl) as avg_mileage,
            SUM(t.net_profit) as total_profit
        INTO top_driver
        FROM drivers d
        LEFT JOIN trips t ON t.driver_id = d.id
        WHERE d.organization_id = org_id
        AND DATE(COALESCE(t.trip_start_date, t.created_at)) >= current_month_start
        GROUP BY d.id, d.name
        ORDER BY total_profit DESC NULLS LAST
        LIMIT 1;
        
        -- Insert Top Driver KPI
        IF top_driver.name IS NOT NULL THEN
            INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
            VALUES (
                'performance.top_driver',
                'Top Driver This Month',
                top_driver.name || ' (₹' || TO_CHAR(COALESCE(top_driver.total_profit, 0), 'FM999,999') || ')',
                COALESCE(top_driver.total_profit, 0),
                jsonb_build_object(
                    'driver_name', top_driver.name,
                    'total_distance', COALESCE(top_driver.total_distance, 0),
                    'trip_count', COALESCE(top_driver.trip_count, 0),
                    'total_profit', COALESCE(top_driver.total_profit, 0),
                    'avg_mileage', ROUND(COALESCE(top_driver.avg_mileage, 0)::NUMERIC, 2)
                ),
                'success',
                org_id,
                NOW()
            )
            ON CONFLICT (kpi_key, organization_id) 
            DO UPDATE SET
                kpi_value_human = EXCLUDED.kpi_value_human,
                kpi_value_raw = EXCLUDED.kpi_value_raw,
                kpi_payload = EXCLUDED.kpi_payload,
                updated_at = NOW(),
                computed_at = NOW();
        END IF;
        
        -- Calculate Fuel Efficiency Trends
        SELECT 
            AVG(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= current_month_start THEN calculated_kmpl END),
            AVG(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= prev_month_start 
                     AND DATE(COALESCE(trip_start_date, created_at)) < current_month_start THEN calculated_kmpl END)
        INTO current_avg_kmpl, prev_avg_kmpl
        FROM trips
        WHERE organization_id = org_id
        AND calculated_kmpl IS NOT NULL
        AND calculated_kmpl > 0
        AND calculated_kmpl < 50; -- Filter out unrealistic values
        
        -- Insert Fuel Efficiency Comparison
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'efficiency.fuel_trend',
            'Fuel Efficiency Trend',
            COALESCE(ROUND(current_avg_kmpl, 2), 0)::TEXT || ' km/L (' || 
            CASE 
                WHEN current_avg_kmpl > prev_avg_kmpl THEN '+' 
                WHEN current_avg_kmpl < prev_avg_kmpl THEN '-'
                ELSE ''
            END || 
            CASE 
                WHEN prev_avg_kmpl > 0 THEN ABS(ROUND(((current_avg_kmpl - prev_avg_kmpl) / prev_avg_kmpl) * 100, 1))::TEXT || '%'
                ELSE 'N/A'
            END || ')',
            COALESCE(current_avg_kmpl, 0),
            jsonb_build_object(
                'current_month_avg', ROUND(COALESCE(current_avg_kmpl, 0), 2),
                'prev_month_avg', ROUND(COALESCE(prev_avg_kmpl, 0), 2),
                'trend', CASE 
                    WHEN current_avg_kmpl > prev_avg_kmpl THEN 'up' 
                    WHEN current_avg_kmpl < prev_avg_kmpl THEN 'down'
                    ELSE 'stable'
                END
            ),
            CASE 
                WHEN current_avg_kmpl > prev_avg_kmpl THEN 'success' 
                WHEN current_avg_kmpl < prev_avg_kmpl THEN 'warning'
                ELSE 'info'
            END,
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
        
        -- Calculate Cost per KM
        SELECT 
            CASE WHEN SUM(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= current_month_start 
                              AND end_km > start_km THEN end_km - start_km END) > 0
                 THEN SUM(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= current_month_start THEN total_expense END) / 
                      SUM(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= current_month_start 
                              AND end_km > start_km THEN end_km - start_km END)
                 ELSE 0 END,
            CASE WHEN SUM(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= prev_month_start 
                              AND DATE(COALESCE(trip_start_date, created_at)) < current_month_start 
                              AND end_km > start_km THEN end_km - start_km END) > 0
                 THEN SUM(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= prev_month_start 
                              AND DATE(COALESCE(trip_start_date, created_at)) < current_month_start THEN total_expense END) / 
                      SUM(CASE WHEN DATE(COALESCE(trip_start_date, created_at)) >= prev_month_start 
                              AND DATE(COALESCE(trip_start_date, created_at)) < current_month_start 
                              AND end_km > start_km THEN end_km - start_km END)
                 ELSE 0 END
        INTO current_cost_per_km, prev_cost_per_km
        FROM trips
        WHERE organization_id = org_id;
        
        -- Insert Cost per KM KPI
        INSERT INTO kpi_cards (kpi_key, kpi_title, kpi_value_human, kpi_value_raw, kpi_payload, theme, organization_id, computed_at)
        VALUES (
            'efficiency.cost_per_km',
            'Cost per KM',
            '₹' || ROUND(COALESCE(current_cost_per_km, 0), 2)::TEXT || '/km (' || 
            CASE 
                WHEN current_cost_per_km < prev_cost_per_km THEN '-' 
                WHEN current_cost_per_km > prev_cost_per_km THEN '+'
                ELSE ''
            END || 
            CASE 
                WHEN prev_cost_per_km > 0 THEN ABS(ROUND(((current_cost_per_km - prev_cost_per_km) / prev_cost_per_km) * 100, 1))::TEXT || '%'
                ELSE 'N/A'
            END || ')',
            COALESCE(current_cost_per_km, 0),
            jsonb_build_object(
                'current_cost', ROUND(COALESCE(current_cost_per_km, 0), 2),
                'previous_cost', ROUND(COALESCE(prev_cost_per_km, 0), 2),
                'trend', CASE 
                    WHEN current_cost_per_km < prev_cost_per_km THEN 'down' 
                    WHEN current_cost_per_km > prev_cost_per_km THEN 'up'
                    ELSE 'stable'
                END
            ),
            CASE 
                WHEN current_cost_per_km < prev_cost_per_km THEN 'success' 
                WHEN current_cost_per_km > prev_cost_per_km THEN 'danger'
                ELSE 'info'
            END,
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
        
        cards_created := cards_created + 10;
    END LOOP;
    
    RETURN jsonb_build_object('cards_created', cards_created);
END;
$$;

-- Update the main generate_kpi_cards function to call comparative KPIs
CREATE OR REPLACE FUNCTION public.generate_kpi_cards_with_comparisons()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result1 jsonb;
    result2 jsonb;
    total_cards INTEGER;
BEGIN
    -- Call the original function
    SELECT generate_kpi_cards() INTO result1;
    
    -- Call the comparative function
    SELECT generate_comparative_kpis() INTO result2;
    
    -- Combine results
    total_cards := COALESCE((result1->>'cards_created')::INTEGER, 0) + 
                   COALESCE((result2->>'cards_created')::INTEGER, 0);
    
    RETURN jsonb_build_object(
        'cards_created', total_cards,
        'basic_kpis', result1,
        'comparative_kpis', result2
    );
END;
$$;

-- Run the functions to populate initial data
SELECT generate_comparative_kpis();

-- Show the new comparative KPIs
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    CASE 
        WHEN kpi_payload->>'trend' = 'up' THEN '📈'
        WHEN kpi_payload->>'trend' = 'down' THEN '📉'
        ELSE '➡️'
    END as trend,
    theme
FROM kpi_cards
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
AND (kpi_key LIKE 'comparison.%' OR kpi_key LIKE 'performance.%' OR kpi_key LIKE 'efficiency.%')
ORDER BY 
    CASE 
        WHEN kpi_key LIKE 'comparison.%' THEN 1
        WHEN kpi_key LIKE 'performance.%' THEN 2
        WHEN kpi_key LIKE 'efficiency.%' THEN 3
        ELSE 4
    END,
    kpi_key;
