-- ================================================================
-- MIGRATION: Add organization_id to all tables for proper isolation
-- ================================================================
-- Purpose: Ensure all tables have organization_id for multi-tenant data isolation
-- Date: 2025-11-03
-- IMPORTANT: Review and test before running in production!
-- ================================================================

-- ================================================================
-- PHASE 1: HIGH PRIORITY - Critical Tables
-- ================================================================

-- ----------------------------------------------------------------
-- 1. maintenance_tasks
-- ----------------------------------------------------------------
DO $$
BEGIN
  -- Add column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks' AND column_name = 'organization_id'
  ) THEN
    -- Step 1: Add column (nullable first)
    ALTER TABLE maintenance_tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Step 2: Backfill from vehicles (maintenance is always tied to a vehicle)
    UPDATE maintenance_tasks mt
    SET organization_id = v.organization_id
    FROM vehicles v
    WHERE mt.vehicle_id = v.id;

    -- Step 3: Handle orphaned records (if any)
    -- Set to first available org for records without vehicle
    UPDATE maintenance_tasks mt
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    -- Step 4: Make NOT NULL
    ALTER TABLE maintenance_tasks ALTER COLUMN organization_id SET NOT NULL;

    -- Step 5: Create index
    CREATE INDEX idx_maintenance_tasks_org ON maintenance_tasks(organization_id);

    RAISE NOTICE 'Added organization_id to maintenance_tasks';
  ELSE
    RAISE NOTICE 'organization_id already exists in maintenance_tasks';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 2. ai_alerts
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_alerts' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE ai_alerts ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from user_id
    UPDATE ai_alerts aa
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE aa.user_id = ou.user_id;

    -- Handle orphaned records
    UPDATE ai_alerts
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE ai_alerts ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_ai_alerts_org ON ai_alerts(organization_id);

    RAISE NOTICE 'Added organization_id to ai_alerts';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 3. trip_corrections
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_corrections' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE trip_corrections ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from trips
    UPDATE trip_corrections tc
    SET organization_id = t.organization_id
    FROM trips t
    WHERE tc.trip_id = t.id;

    -- Handle orphaned records
    UPDATE trip_corrections
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE trip_corrections ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_trip_corrections_org ON trip_corrections(organization_id);

    RAISE NOTICE 'Added organization_id to trip_corrections';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 4. fuel_efficiency_baselines
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fuel_efficiency_baselines' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE fuel_efficiency_baselines ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from vehicles
    UPDATE fuel_efficiency_baselines feb
    SET organization_id = v.organization_id
    FROM vehicles v
    WHERE feb.vehicle_id = v.id;

    -- Handle orphaned records
    UPDATE fuel_efficiency_baselines
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE fuel_efficiency_baselines ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_fuel_efficiency_baselines_org ON fuel_efficiency_baselines(organization_id);

    RAISE NOTICE 'Added organization_id to fuel_efficiency_baselines';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 5. driver_vehicle_performance
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_vehicle_performance' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE driver_vehicle_performance ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from drivers
    UPDATE driver_vehicle_performance dvp
    SET organization_id = d.organization_id
    FROM drivers d
    WHERE dvp.driver_id = d.id;

    -- Handle orphaned records
    UPDATE driver_vehicle_performance
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE driver_vehicle_performance ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_driver_vehicle_performance_org ON driver_vehicle_performance(organization_id);

    RAISE NOTICE 'Added organization_id to driver_vehicle_performance';
  END IF;
END $$;

-- ================================================================
-- PHASE 2: MEDIUM PRIORITY - Maintenance System
-- ================================================================

-- ----------------------------------------------------------------
-- 6. maintenance_service_tasks
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_service_tasks' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE maintenance_service_tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from maintenance_tasks
    UPDATE maintenance_service_tasks mst
    SET organization_id = mt.organization_id
    FROM maintenance_tasks mt
    WHERE mst.maintenance_task_id = mt.id;

    -- Handle orphaned records
    UPDATE maintenance_service_tasks
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE maintenance_service_tasks ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_maintenance_service_tasks_org ON maintenance_service_tasks(organization_id);

    RAISE NOTICE 'Added organization_id to maintenance_service_tasks';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 7. maintenance_audit_logs
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_audit_logs' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE maintenance_audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from maintenance_tasks
    UPDATE maintenance_audit_logs mal
    SET organization_id = mt.organization_id
    FROM maintenance_tasks mt
    WHERE mal.task_id = mt.id;

    -- Handle orphaned records
    UPDATE maintenance_audit_logs
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE maintenance_audit_logs ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_maintenance_audit_logs_org ON maintenance_audit_logs(organization_id);

    RAISE NOTICE 'Added organization_id to maintenance_audit_logs';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 8. maintenance_tasks_catalog
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_tasks_catalog' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE maintenance_tasks_catalog ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from created_by
    UPDATE maintenance_tasks_catalog mtc
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE mtc.created_by = ou.user_id;

    -- Handle orphaned records
    UPDATE maintenance_tasks_catalog
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE maintenance_tasks_catalog ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_maintenance_tasks_catalog_org ON maintenance_tasks_catalog(organization_id);

    RAISE NOTICE 'Added organization_id to maintenance_tasks_catalog';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 9. vehicle_configurations
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_configurations' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE vehicle_configurations ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from vehicles
    UPDATE vehicle_configurations vc
    SET organization_id = v.organization_id
    FROM vehicles v
    WHERE vc.vehicle_id = v.id;

    -- Handle orphaned records
    UPDATE vehicle_configurations
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE vehicle_configurations ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_vehicle_configurations_org ON vehicle_configurations(organization_id);

    RAISE NOTICE 'Added organization_id to vehicle_configurations';
  END IF;
END $$;

-- ================================================================
-- PHASE 3: Activity & Audit Logs
-- ================================================================

-- ----------------------------------------------------------------
-- 10. vehicle_activity_log
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_activity_log' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE vehicle_activity_log ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from vehicles
    UPDATE vehicle_activity_log val
    SET organization_id = v.organization_id
    FROM vehicles v
    WHERE val.vehicle_id = v.id;

    -- Handle orphaned records
    UPDATE vehicle_activity_log
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE vehicle_activity_log ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_vehicle_activity_log_org ON vehicle_activity_log(organization_id);

    RAISE NOTICE 'Added organization_id to vehicle_activity_log';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 11. activity_log
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_log' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE activity_log ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from action_by
    UPDATE activity_log al
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE al.action_by = ou.user_id;

    -- Handle orphaned records
    UPDATE activity_log
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE activity_log ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_activity_log_org ON activity_log(organization_id);

    RAISE NOTICE 'Added organization_id to activity_log';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 12. audit_trail
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_trail' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE audit_trail ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from created_by
    UPDATE audit_trail at
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE at.created_by = ou.user_id;

    -- Handle orphaned records
    UPDATE audit_trail
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE audit_trail ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_audit_trail_org ON audit_trail(organization_id);

    RAISE NOTICE 'Added organization_id to audit_trail';
  END IF;
END $$;

-- ================================================================
-- PHASE 4: Reminders & Alerts
-- ================================================================

-- ----------------------------------------------------------------
-- 13. reminder_tracking
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminder_tracking' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE reminder_tracking ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from added_by
    UPDATE reminder_tracking rt
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE rt.added_by = ou.user_id;

    -- Handle orphaned records
    UPDATE reminder_tracking
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE reminder_tracking ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_reminder_tracking_org ON reminder_tracking(organization_id);

    RAISE NOTICE 'Added organization_id to reminder_tracking';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 14. reminder_templates
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminder_templates' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE reminder_templates ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from created_by
    UPDATE reminder_templates rt
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE rt.created_by = ou.user_id;

    -- Handle orphaned records
    UPDATE reminder_templates
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE reminder_templates ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_reminder_templates_org ON reminder_templates(organization_id);

    RAISE NOTICE 'Added organization_id to reminder_templates';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 15. reminder_contacts
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminder_contacts' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE reminder_contacts ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from created_by
    UPDATE reminder_contacts rc
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE rc.created_by = ou.user_id;

    -- Handle orphaned records
    UPDATE reminder_contacts
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE reminder_contacts ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_reminder_contacts_org ON reminder_contacts(organization_id);

    RAISE NOTICE 'Added organization_id to reminder_contacts';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 16. alert_settings
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alert_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE alert_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from user_id
    UPDATE alert_settings as_table
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE as_table.user_id = ou.user_id;

    -- Handle orphaned records
    UPDATE alert_settings
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE alert_settings ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_alert_settings_org ON alert_settings(organization_id);

    RAISE NOTICE 'Added organization_id to alert_settings';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 17. alert_thresholds
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alert_thresholds' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE alert_thresholds ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from user_id
    UPDATE alert_thresholds at_table
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE at_table.user_id = ou.user_id;

    -- Handle orphaned records
    UPDATE alert_thresholds
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE alert_thresholds ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_alert_thresholds_org ON alert_thresholds(organization_id);

    RAISE NOTICE 'Added organization_id to alert_thresholds';
  END IF;
END $$;

-- ================================================================
-- PHASE 5: Settings Tables (User-specific, but org-scoped)
-- ================================================================

-- ----------------------------------------------------------------
-- 18. document_settings
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE document_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from user_id
    UPDATE document_settings ds
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE ds.user_id = ou.user_id;

    -- Handle orphaned records
    UPDATE document_settings
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE document_settings ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_document_settings_org ON document_settings(organization_id);

    RAISE NOTICE 'Added organization_id to document_settings';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 19. driver_ranking_settings
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_ranking_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE driver_ranking_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from user_id
    UPDATE driver_ranking_settings drs
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE drs.user_id = ou.user_id;

    -- Handle orphaned records
    UPDATE driver_ranking_settings
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE driver_ranking_settings ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_driver_ranking_settings_org ON driver_ranking_settings(organization_id);

    RAISE NOTICE 'Added organization_id to driver_ranking_settings';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 20. global_settings
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'global_settings' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE global_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from user_id
    UPDATE global_settings gs
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE gs.user_id = ou.user_id;

    -- Handle orphaned records
    UPDATE global_settings
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE global_settings ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_global_settings_org ON global_settings(organization_id);

    RAISE NOTICE 'Added organization_id to global_settings';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 21. message_templates
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_templates' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE message_templates ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Backfill from created_by
    UPDATE message_templates mt
    SET organization_id = ou.organization_id
    FROM organization_users ou
    WHERE mt.created_by = ou.user_id;

    -- Handle orphaned records
    UPDATE message_templates
    SET organization_id = (SELECT id FROM organizations LIMIT 1)
    WHERE organization_id IS NULL;

    ALTER TABLE message_templates ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX idx_message_templates_org ON message_templates(organization_id);

    RAISE NOTICE 'Added organization_id to message_templates';
  END IF;
END $$;

-- ================================================================
-- PHASE 6: Reports (if table exists)
-- ================================================================

-- ----------------------------------------------------------------
-- 22. generated_reports (if exists)
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_reports') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'generated_reports' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE generated_reports ADD COLUMN organization_id UUID REFERENCES organizations(id);

      -- Attempt to backfill (adjust based on actual table structure)
      -- This is a placeholder - adjust the backfill logic based on your table
      UPDATE generated_reports
      SET organization_id = (SELECT id FROM organizations LIMIT 1)
      WHERE organization_id IS NULL;

      ALTER TABLE generated_reports ALTER COLUMN organization_id SET NOT NULL;
      CREATE INDEX idx_generated_reports_org ON generated_reports(organization_id);

      RAISE NOTICE 'Added organization_id to generated_reports';
    END IF;
  END IF;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Show summary of tables with organization_id
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'organization_id';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE 'Total tables with organization_id: %', table_count;
  RAISE NOTICE '============================================';
END $$;

-- ================================================================
-- IMPORTANT NOTES:
-- ================================================================
-- 1. This migration is IDEMPOTENT - safe to run multiple times
-- 2. Each table addition is wrapped in IF NOT EXISTS check
-- 3. Orphaned records are assigned to first available organization
-- 4. You may want to manually review orphaned records before making NOT NULL
-- 5. After running, update RLS policies (see next migration file)
-- 6. Test thoroughly in staging environment first!
-- ================================================================
