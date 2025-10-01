-- ============================================
-- REMAINING RLS POLICY CLEANUP
-- ============================================
-- This script focuses on remaining issues after initial cleanup
-- 
-- ALREADY CLEANED UP (from previous runs):
-- ✅ drivers, vehicles, trips, warehouses - have clean _org_ policies
-- ✅ organization_users - has simple_select policy
-- 
-- THIS SCRIPT WILL CLEAN UP:
-- 🔧 destinations - fix missing org_id + remove duplicate policies
-- 🔧 driver_documents, vehicle_documents - remove duplicates
-- 🔧 maintenance_entries, wear_parts - remove duplicates  
-- 🔧 Various other tables with duplicate/conflicting policies

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
-- 3. CLEAN UP DRIVER_DOCUMENTS TABLE
-- ============================================
-- Remove duplicate policies
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

-- ============================================
-- 3. CLEAN UP MAINTENANCE_ENTRIES TABLE
-- ============================================
-- Remove duplicate policies
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

-- ============================================
-- 4. CLEAN UP VEHICLE_DOCUMENTS TABLE
-- ============================================
-- Remove duplicate policies
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

-- ============================================
-- 5. CLEAN UP WEAR_PARTS TABLE
-- ============================================
-- Remove duplicate policies
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

-- ============================================
-- 6. CLEAN UP MAINTENANCE_SERVICE_TASKS TABLE
-- ============================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "maintenance_service_tasks_delete_policy" ON maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_insert_policy" ON maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_select_policy" ON maintenance_service_tasks;
DROP POLICY IF EXISTS "maintenance_service_tasks_update_policy" ON maintenance_service_tasks;

-- Keep only the clean policy
-- (The "Enable insert for authenticated users" policy should remain)

-- ============================================
-- 7. CLEAN UP USER_ACTIVITY_LOG TABLE
-- ============================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "Authenticated users can view user activity logs" ON user_activity_log;
DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_log;

-- Keep only the essential policies
-- (Keep "Users can insert own activity logs")

-- ============================================
-- 8. CLEAN UP VEHICLE_ACTIVITY_LOG TABLE
-- ============================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "Allow authenticated users to insert vehicle activity logs" ON vehicle_activity_log;
DROP POLICY IF EXISTS "Users can insert vehicle activity logs" ON vehicle_activity_log;
DROP POLICY IF EXISTS "Authenticated users can view all vehicle activity logs" ON vehicle_activity_log;
DROP POLICY IF EXISTS "Users can view vehicle activity logs" ON vehicle_activity_log;

-- Create clean organization-based policies
CREATE POLICY "vehicle_activity_log_org_select" ON vehicle_activity_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_activity_log_org_insert" ON vehicle_activity_log
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 9. CLEAN UP MAINTENANCE_AUDIT_LOGS TABLE
-- ============================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "Allow authenticated users to insert maintenance audit logs" ON maintenance_audit_logs;
DROP POLICY IF EXISTS "maintenance_audit_logs_insert_policy" ON maintenance_audit_logs;
DROP POLICY IF EXISTS "maintenance_audit_logs_select_policy" ON maintenance_audit_logs;

-- Create clean organization-based policies
CREATE POLICY "maintenance_audit_logs_org_select" ON maintenance_audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_audit_logs_org_insert" ON maintenance_audit_logs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 10. CLEAN UP VEHICLE_DOCUMENT_METADATA TABLE
-- ============================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "Users can manage documents for their vehicles" ON vehicle_document_metadata;
DROP POLICY IF EXISTS "Users can view documents for their vehicles" ON vehicle_document_metadata;

-- Create clean organization-based policies
CREATE POLICY "vehicle_document_metadata_org_select" ON vehicle_document_metadata
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_document_metadata_org_insert" ON vehicle_document_metadata
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_document_metadata_org_update" ON vehicle_document_metadata
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_document_metadata_org_delete" ON vehicle_document_metadata
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 11. CLEAN UP REPORT_TEMPLATES TABLE
-- ============================================
-- Remove duplicate policies
DROP POLICY IF EXISTS "Users can manage own report templates" ON report_templates;
DROP POLICY IF EXISTS "Users can view report templates" ON report_templates;

-- Create clean organization-based policies
CREATE POLICY "report_templates_org_select" ON report_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "report_templates_org_insert" ON report_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "report_templates_org_update" ON report_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "report_templates_org_delete" ON report_templates
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 12. CLEAN UP MAINTENANCE_VENDORS TABLE
-- ============================================
-- Remove overly broad policy
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
-- FINAL VERIFICATION
-- ============================================
-- Show remaining policies to verify cleanup
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename IN (
  'drivers', 'vehicles', 'trips', 'warehouses', 'destinations',
  'driver_documents', 'vehicle_documents', 'maintenance_entries',
  'wear_parts', 'maintenance_service_tasks', 'user_activity_log',
  'vehicle_activity_log', 'maintenance_audit_logs', 
  'vehicle_document_metadata', 'report_templates', 'maintenance_vendors'
)
GROUP BY tablename
ORDER BY tablename;
