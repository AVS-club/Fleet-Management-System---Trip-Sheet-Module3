-- Add the missing kpi_value_raw column to kpi_cards table
-- This column stores the numeric value of the KPI for calculations and sorting

ALTER TABLE public.kpi_cards 
ADD COLUMN IF NOT EXISTS kpi_value_raw NUMERIC;

-- Update existing records to populate kpi_value_raw from kpi_value_human
-- This extracts the numeric part from strings like "100 km" or "₹5000"
UPDATE public.kpi_cards
SET kpi_value_raw = 
    CASE 
        WHEN kpi_value_human ~ '^[0-9]+' THEN 
            -- Extract leading numbers
            REGEXP_REPLACE(kpi_value_human, '[^0-9.].*', '')::NUMERIC
        WHEN kpi_value_human ~ '^₹[0-9]+' THEN 
            -- Extract numbers after ₹ symbol
            REGEXP_REPLACE(kpi_value_human, '^₹([0-9.]+).*', '\1')::NUMERIC
        ELSE 
            0
    END
WHERE kpi_value_raw IS NULL;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'kpi_cards' 
AND column_name = 'kpi_value_raw'
AND table_schema = 'public';
