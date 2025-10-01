-- ============================================
-- FINAL RLS POLICY CLEANUP
-- ============================================
-- Based on actual tables that have organization_id column

-- ============================================
-- 1. FIX DESTINATIONS MISSING ORGANIZATION_ID
-- ============================================
-- Update the 2 destinations missing org_id
UPDATE destinations d
SET organization_id = (
  SELECT ou.organization_id 
  FROM organization_users ou 
  WHERE ou.user_id = COALESCE(d.added_by, d.created_by)
  LIMIT 1
)
WHERE organization_id IS NULL;

-- ============================================
-- 2. CLEAN UP DESTINATIONS DUPLICATE POLICIES
-- ============================================
-- Remove duplicate destination policies (keep the cleaner ones)
DROP POLICY IF EXISTS "Users can view organization destinations" ON destinations;
DROP POLICY IF EXISTS "Users can insert organization destinations" ON destinations;
DROP POLICY IF EXISTS "Users can update organization destinations" ON destinations;
DROP POLICY IF EXISTS "Only owners can delete destinations" ON destinations;
-- Keep: destinations_select_policy, destinations_insert_policy, destinations_update_policy, destinations_delete_policy

-- ============================================
-- 3. CLEAN UP TABLES WITH ORGANIZATION_ID
-- ============================================

-- DRIVER_DOCUMENTS (has organization_id)
DROP POLICY IF EXISTS "Users can manage driver documents" ON driver_documents;
DROP POLICY IF EXISTS "Users can insert org driver documents" ON driver_documents;
DROP POLICY IF EXISTS "Users can view org driver documents" ON driver_documents;
DROP POLICY IF EXISTS "Org driver_documents delete" ON driver_documents;
DROP POLICY IF EXISTS "Org driver_documents insert" ON driver_documents;
DROP POLICY IF EXISTS "Org driver_documents select" ON driver_documents;
DROP POLICY IF EXISTS "Org driver_documents update" ON driver_documents;

-- Create clean organization-based policies
CREATE POLICY "driver_documents_org_select" ON driver_documents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "driver_documents_org_insert" ON driver_documents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "driver_documents_org_update" ON driver_documents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "driver_documents_org_delete" ON driver_documents
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- VEHICLE_DOCUMENTS (has organization_id)
DROP POLICY IF EXISTS "Users can manage vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert org vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can view org vehicle documents" ON vehicle_documents;
DROP POLICY IF EXISTS "Org vehicle_documents delete" ON vehicle_documents;
DROP POLICY IF EXISTS "Org vehicle_documents insert" ON vehicle_documents;
DROP POLICY IF EXISTS "Org vehicle_documents select" ON vehicle_documents;
DROP POLICY IF EXISTS "Org vehicle_documents update" ON vehicle_documents;

-- Create clean organization-based policies
CREATE POLICY "vehicle_documents_org_select" ON vehicle_documents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_documents_org_insert" ON vehicle_documents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_documents_org_update" ON vehicle_documents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_documents_org_delete" ON vehicle_documents
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- MAINTENANCE_ENTRIES (has organization_id)
DROP POLICY IF EXISTS "Users can manage own maintenance entries" ON maintenance_entries;
DROP POLICY IF EXISTS "Only owners can delete maintenance" ON maintenance_entries;
DROP POLICY IF EXISTS "Users can insert organization maintenance" ON maintenance_entries;
DROP POLICY IF EXISTS "Users can view organization maintenance" ON maintenance_entries;
DROP POLICY IF EXISTS "Users can update organization maintenance" ON maintenance_entries;
DROP POLICY IF EXISTS "Org maintenance delete" ON maintenance_entries;
DROP POLICY IF EXISTS "Org maintenance insert" ON maintenance_entries;
DROP POLICY IF EXISTS "Org maintenance select" ON maintenance_entries;
DROP POLICY IF EXISTS "Org maintenance update" ON maintenance_entries;

-- Create clean organization-based policies
CREATE POLICY "maintenance_entries_org_select" ON maintenance_entries
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_entries_org_insert" ON maintenance_entries
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_entries_org_update" ON maintenance_entries
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_entries_org_delete" ON maintenance_entries
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- WEAR_PARTS (has organization_id)
DROP POLICY IF EXISTS "Users can manage own wear parts" ON wear_parts;
DROP POLICY IF EXISTS "Org wear_parts delete" ON wear_parts;
DROP POLICY IF EXISTS "Org wear_parts insert" ON wear_parts;
DROP POLICY IF EXISTS "Org wear_parts select" ON wear_parts;
DROP POLICY IF EXISTS "Org wear_parts update" ON wear_parts;

-- Create clean organization-based policies
CREATE POLICY "wear_parts_org_select" ON wear_parts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "wear_parts_org_insert" ON wear_parts
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "wear_parts_org_update" ON wear_parts
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "wear_parts_org_delete" ON wear_parts
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- MAINTENANCE_VENDORS (has organization_id)
DROP POLICY IF EXISTS "Users can manage own vendors" ON maintenance_vendors;

-- Create clean organization-based policies
CREATE POLICY "maintenance_vendors_org_select" ON maintenance_vendors
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_vendors_org_insert" ON maintenance_vendors
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_vendors_org_update" ON maintenance_vendors
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_vendors_org_delete" ON maintenance_vendors
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 4. CLEAN UP TABLES WITHOUT ORGANIZATION_ID
-- ============================================
-- These tables don't have organization_id, so we'll just remove duplicates

-- MAINTENANCE_SERVICE_TASKS
DROP POLICY IF EXISTS "maintenance_service_tasks_delete_policy" ON maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_insert_policy" ON maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_select_policy" ON maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_update_policy" ON maintenance_service_tasks;
-- Keep: "Enable insert for authenticated users"

-- USER_ACTIVITY_LOG
DROP POLICY IF EXISTS "Authenticated users can view user activity logs" ON user_activity_log;
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_log;
-- Keep: "Users can insert own activity logs"

-- VEHICLE_ACTIVITY_LOG
DROP POLICY IF EXISTS "Allow authenticated users to insert vehicle activity logs" ON vehicle_activity_log;
DROP POLICY IF EXISTS "Users can insert vehicle activity logs" ON vehicle_activity_log;
DROP POLICY IF EXISTS "Authenticated users can view all vehicle activity logs" ON vehicle_activity_log;
DROP POLICY IF EXISTS "Users can view vehicle activity logs" ON vehicle_activity_log;

-- MAINTENANCE_AUDIT_LOGS
DROP POLICY IF EXISTS "Allow authenticated users to insert maintenance audit logs" ON maintenance_audit_logs;
DROP POLICY IF EXISTS "maintenance_audit_logs_insert_policy" ON maintenance_audit_logs;
DROP POLICY IF EXISTS "maintenance_audit_logs_select_policy" ON maintenance_audit_logs;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
-- Show remaining policies to verify cleanup
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename IN (
  'destinations', 'driver_documents', 'vehicle_documents', 'maintenance_entries',
  'wear_parts', 'maintenance_vendors', 'maintenance_service_tasks', 
  'user_activity_log', 'vehicle_activity_log', 'maintenance_audit_logs'
)
GROUP BY tablename
ORDER BY tablename;
