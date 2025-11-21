-- Remove station field and add GPS screenshots support
-- This migration replaces the station text field with a proper GPS screenshots table

-- Step 1: Create the trip_gps_screenshots table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trip_gps_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create index for better query performance (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'trip_gps_screenshots' 
        AND indexname = 'idx_trip_gps_screenshots_trip_id'
    ) THEN
        CREATE INDEX idx_trip_gps_screenshots_trip_id ON public.trip_gps_screenshots(trip_id);
    END IF;
END $$;

-- Step 3: Enable RLS
ALTER TABLE public.trip_gps_screenshots ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
DROP POLICY IF EXISTS "Users can view GPS screenshots" ON public.trip_gps_screenshots;
CREATE POLICY "Users can view GPS screenshots" ON public.trip_gps_screenshots
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert GPS screenshots" ON public.trip_gps_screenshots;
CREATE POLICY "Users can insert GPS screenshots" ON public.trip_gps_screenshots
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update GPS screenshots" ON public.trip_gps_screenshots;
CREATE POLICY "Users can update GPS screenshots" ON public.trip_gps_screenshots
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete GPS screenshots" ON public.trip_gps_screenshots;
CREATE POLICY "Users can delete GPS screenshots" ON public.trip_gps_screenshots
    FOR DELETE USING (true);

-- Step 5: Drop the station column from trips table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'station'
    ) THEN
        ALTER TABLE public.trips DROP COLUMN station;
    END IF;
END $$;

-- Step 6: Create or replace function to handle GPS screenshot updates
CREATE OR REPLACE FUNCTION public.handle_gps_screenshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS trip_gps_screenshots_updated_at ON public.trip_gps_screenshots;
CREATE TRIGGER trip_gps_screenshots_updated_at
    BEFORE UPDATE ON public.trip_gps_screenshots
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_gps_screenshot_updated_at();
