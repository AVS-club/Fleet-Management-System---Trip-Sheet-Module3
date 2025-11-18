-- Fix Financial Data Using CORRECT Column Names
-- Organization ID: ab6c2178-32f9-4a03-b5ab-d535db827a58

-- 1. Check current financial data status
SELECT 
    'Current Financial Status' as check_type,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE income_amount > 0) as trips_with_income,
    COUNT(*) FILTER (WHERE net_profit != 0) as trips_with_profit,
    ROUND(SUM(income_amount)) as total_income,
    ROUND(SUM(net_profit)) as total_profit
FROM public.trips
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE);

-- 2. For trips with no income_amount, calculate based on distance and freight_rate
UPDATE public.trips
SET 
    income_amount = CASE 
        WHEN (income_amount IS NULL OR income_amount = 0)
            AND freight_rate IS NOT NULL 
            AND freight_rate > 0 
        THEN freight_rate * (end_km - start_km)
        WHEN (income_amount IS NULL OR income_amount = 0)
        THEN (end_km - start_km) * 30  -- Default ₹30 per km if no freight rate
        ELSE income_amount 
    END,
    updated_at = NOW()
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND (income_amount IS NULL OR income_amount = 0)
    AND end_km > start_km
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE);

-- 3. Set total_expense if missing (using CORRECT column names)
UPDATE public.trips
SET 
    total_expense = CASE 
        WHEN (total_expense IS NULL OR total_expense = 0)
        THEN COALESCE(total_fuel_cost, 0) + 
             COALESCE(driver_expense, 0) +  -- Corrected from driver_allowance
             COALESCE(estimated_toll_cost, 0) +  -- Corrected from toll_expenses
             COALESCE(other_expense, 0) +  -- Corrected from other_expenses
             COALESCE(miscellaneous_expense, 0)  -- Added miscellaneous_expense
        ELSE total_expense 
    END,
    updated_at = NOW()
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND (total_expense IS NULL OR total_expense = 0)
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE);

-- 4. If still no expense data, use a default
UPDATE public.trips
SET 
    total_expense = (end_km - start_km) * 10,  -- ₹10 per km default expense
    updated_at = NOW()
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND (total_expense IS NULL OR total_expense = 0)
    AND end_km > start_km
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE);

-- 5. Calculate net_profit
UPDATE public.trips
SET 
    net_profit = income_amount - COALESCE(total_expense, 0),
    updated_at = NOW()
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND (net_profit IS NULL OR net_profit = 0)
    AND income_amount > 0
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE);

-- 6. Show the results after update
SELECT 
    'Updated November Financials' as status,
    COUNT(*) as trip_count,
    SUM(end_km - start_km) as total_distance_km,
    ROUND(SUM(income_amount)) as total_revenue,
    ROUND(SUM(total_expense)) as total_expenses,
    ROUND(SUM(net_profit)) as total_profit,
    ROUND(AVG(net_profit)) as avg_profit_per_trip
FROM public.trips
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND trip_start_date >= '2025-11-01'
    AND trip_start_date < '2025-12-01';

-- 7. Show breakdown of expenses
SELECT 
    'Expense Breakdown' as category,
    COUNT(*) as trips_with_data,
    ROUND(SUM(total_fuel_cost)) as total_fuel,
    ROUND(SUM(driver_expense)) as total_driver,
    ROUND(SUM(estimated_toll_cost)) as total_tolls,
    ROUND(SUM(other_expense)) as total_other,
    ROUND(SUM(miscellaneous_expense)) as total_misc,
    ROUND(SUM(total_expense)) as grand_total_expenses
FROM public.trips
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE);

-- 8. Show sample trips with financial data
SELECT 
    trip_serial_number,
    trip_start_date,
    (end_km - start_km) as distance_km,
    freight_rate,
    income_amount,
    total_fuel_cost,
    driver_expense,
    estimated_toll_cost,
    total_expense,
    net_profit
FROM public.trips
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
    AND trip_start_date >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY trip_start_date DESC
LIMIT 5;

-- 9. Regenerate KPIs with updated financial data
SELECT generate_kpi_cards();

-- 10. Display ALL KPIs to see the complete picture
SELECT 
    kpi_key,
    kpi_title,
    kpi_value_human,
    kpi_payload->>'value' as actual_value,
    theme
FROM public.kpi_cards
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
ORDER BY 
    CASE 
        WHEN kpi_key LIKE 'today%' THEN 1
        WHEN kpi_key LIKE 'weekly%' THEN 2
        WHEN kpi_key LIKE 'monthly%' THEN 3
        ELSE 4
    END,
    kpi_key;
