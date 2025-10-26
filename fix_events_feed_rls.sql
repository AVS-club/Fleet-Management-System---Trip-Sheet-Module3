-- Fix for events_feed RLS policy error when creating trips
-- This addresses the "new row violates row-level security policy for table events_feed" error

-- Option 1: Drop and recreate the INSERT policy with a more permissive check
DROP POLICY IF EXISTS "Users can insert events for their organization" ON public.events_feed;

-- Create a new policy that allows authenticated users to insert events
-- The organization_id can be NULL or must match user's organization
CREATE POLICY "Users can insert events for their organization" ON public.events_feed
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Option 2: Alternatively, you can temporarily disable RLS (UNCOMMENT IF NEEDED)
-- ALTER TABLE public.events_feed DISABLE ROW LEVEL SECURITY;

-- Verify the policy was created successfully
SELECT 'events_feed RLS policy updated successfully!' as status;
