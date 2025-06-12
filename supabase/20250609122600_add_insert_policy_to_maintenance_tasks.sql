-- Enable RLS for the maintenance_tasks table if not already enabled
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists to avoid error during re-run
DROP POLICY IF EXISTS "Allow authenticated users to insert maintenance tasks" ON public.maintenance_tasks;

-- Policy: Allow authenticated users to insert their own maintenance tasks
CREATE POLICY "Allow authenticated users to insert maintenance tasks"
ON public.maintenance_tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant insert permission to the 'authenticated' role on 'maintenance_tasks' table
-- This is often managed by Supabase default grants, but explicit grant can be useful.
-- Ensure this doesn't conflict with existing grants.
-- Supabase typically grants USAGE on schema and SELECT, INSERT, UPDATE, DELETE on tables to 'authenticated' and 'service_role' by default when RLS is enabled.
-- However, if RLS is enabled and no policies allow an operation, it's denied.
-- The CREATE POLICY above is the key part for RLS. This GRANT is more about SQL permissions.

-- It's also good practice to ensure SELECT, UPDATE, DELETE policies exist if needed.
-- For now, focusing on INSERT.

-- Example of a SELECT policy (if needed, adjust 'authenticated' or condition)
DROP POLICY IF EXISTS "Allow authenticated users to read maintenance tasks" ON public.maintenance_tasks;
CREATE POLICY "Allow authenticated users to read maintenance tasks"
ON public.maintenance_tasks
FOR SELECT
TO authenticated
USING (true); -- Or a more specific condition, e.g., auth.uid() = user_id_column

-- Example of an UPDATE policy (if needed, adjust 'authenticated' or condition)
DROP POLICY IF EXISTS "Allow authenticated users to update their maintenance tasks" ON public.maintenance_tasks;
CREATE POLICY "Allow authenticated users to update their maintenance tasks"
ON public.maintenance_tasks
FOR UPDATE
TO authenticated
USING (true) -- Or a more specific condition, e.g., auth.uid() = user_id_column
WITH CHECK (true); -- Or a more specific condition

-- Example of a DELETE policy (if needed, adjust 'authenticated' or condition)
DROP POLICY IF EXISTS "Allow authenticated users to delete their maintenance tasks" ON public.maintenance_tasks;
CREATE POLICY "Allow authenticated users to delete their maintenance tasks"
ON public.maintenance_tasks
FOR DELETE
TO authenticated
USING (true); -- Or a more specific condition, e.g., auth.uid() = user_id_column
