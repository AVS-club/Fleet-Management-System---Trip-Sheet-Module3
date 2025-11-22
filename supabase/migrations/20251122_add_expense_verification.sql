-- Add expense verification fields to trips table
-- This allows manual verification of total expenses between paper records and system entries

-- Add verification columns
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS expense_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expense_verified_by TEXT,
ADD COLUMN IF NOT EXISTS expense_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_trips_expense_verified 
ON public.trips(expense_verified);

-- Create index for verification timestamp
CREATE INDEX IF NOT EXISTS idx_trips_expense_verified_at 
ON public.trips(expense_verified_at);

-- Add comment for documentation
COMMENT ON COLUMN public.trips.expense_verified IS 'Indicates if the total expense has been manually verified against paper records';
COMMENT ON COLUMN public.trips.expense_verified_by IS 'Email or ID of the user who verified the expense';
COMMENT ON COLUMN public.trips.expense_verified_at IS 'Timestamp when the expense was verified';

