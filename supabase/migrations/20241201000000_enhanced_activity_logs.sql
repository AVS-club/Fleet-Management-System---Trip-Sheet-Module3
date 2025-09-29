-- Enhanced Activity Log System Migration
-- This migration creates comprehensive activity logging tables for the Fleet Management System

-- Create user_activity_log table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    device VARCHAR(100),
    location VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_activity_log for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id_timestamp ON user_activity_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_type ON user_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_timestamp ON user_activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_resource ON user_activity_log(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_ip_address ON user_activity_log(ip_address);

-- Enhance existing vehicle_activity_log table if it doesn't have all columns
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_activity_log' AND column_name = 'metadata') THEN
        ALTER TABLE vehicle_activity_log ADD COLUMN metadata JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_activity_log' AND column_name = 'ip_address') THEN
        ALTER TABLE vehicle_activity_log ADD COLUMN ip_address INET;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_activity_log' AND column_name = 'user_agent') THEN
        ALTER TABLE vehicle_activity_log ADD COLUMN user_agent TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_activity_log' AND column_name = 'device') THEN
        ALTER TABLE vehicle_activity_log ADD COLUMN device VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_activity_log' AND column_name = 'location') THEN
        ALTER TABLE vehicle_activity_log ADD COLUMN location VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_activity_log' AND column_name = 'updated_at') THEN
        ALTER TABLE vehicle_activity_log ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create indexes for vehicle_activity_log for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_vehicle_id_timestamp ON vehicle_activity_log(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_action_type ON vehicle_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_timestamp ON vehicle_activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_activity_log_action_by ON vehicle_activity_log(action_by);

-- Create a view for combined activity logs (optional)
CREATE OR REPLACE VIEW combined_activity_logs AS
SELECT 
    'vehicle' as log_type,
    id,
    vehicle_id as entity_id,
    action_type,
    action_by as user_name,
    notes as description,
    metadata,
    ip_address,
    user_agent,
    device,
    location,
    timestamp,
    created_at
FROM vehicle_activity_log
UNION ALL
SELECT 
    'user' as log_type,
    id,
    user_id as entity_id,
    action_type,
    COALESCE(
        (SELECT email FROM auth.users WHERE id = user_id),
        'Unknown User'
    ) as user_name,
    resource as description,
    metadata,
    ip_address,
    user_agent,
    device,
    location,
    timestamp,
    created_at
FROM user_activity_log;

-- Create RLS policies for user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity logs
CREATE POLICY "Users can view own activity logs" ON user_activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs" ON user_activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all user activity logs
-- Note: Since role column was dropped, we'll allow all authenticated users to view user activity logs
-- You can modify this policy based on your specific admin requirements
CREATE POLICY "Authenticated users can view user activity logs" ON user_activity_log
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for vehicle_activity_log (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_activity_log' AND policyname = 'Users can view vehicle activity logs') THEN
        CREATE POLICY "Users can view vehicle activity logs" ON vehicle_activity_log
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM vehicles 
                    WHERE id = vehicle_activity_log.vehicle_id 
                    AND created_by = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_activity_log' AND policyname = 'Users can insert vehicle activity logs') THEN
        CREATE POLICY "Users can insert vehicle activity logs" ON vehicle_activity_log
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM vehicles 
                    WHERE id = vehicle_activity_log.vehicle_id 
                    AND created_by = auth.uid()
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_activity_log' AND policyname = 'Authenticated users can view all vehicle activity logs') THEN
        CREATE POLICY "Authenticated users can view all vehicle activity logs" ON vehicle_activity_log
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_activity_log_updated_at ON user_activity_log;
CREATE TRIGGER update_user_activity_log_updated_at
    BEFORE UPDATE ON user_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_activity_log_updated_at ON vehicle_activity_log;
CREATE TRIGGER update_vehicle_activity_log_updated_at
    BEFORE UPDATE ON vehicle_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action_type VARCHAR(50),
    p_resource VARCHAR(100) DEFAULT NULL,
    p_resource_id VARCHAR(100) DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device VARCHAR(100) DEFAULT NULL,
    p_location VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO user_activity_log (
        user_id,
        action_type,
        resource,
        resource_id,
        metadata,
        ip_address,
        user_agent,
        device,
        location
    ) VALUES (
        p_user_id,
        p_action_type,
        p_resource,
        p_resource_id,
        p_metadata,
        p_ip_address,
        p_user_agent,
        p_device,
        p_location
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log vehicle activity (enhanced version)
CREATE OR REPLACE FUNCTION log_vehicle_activity(
    p_vehicle_id UUID,
    p_action_type VARCHAR(50),
    p_action_by VARCHAR(100),
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device VARCHAR(100) DEFAULT NULL,
    p_location VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO vehicle_activity_log (
        vehicle_id,
        action_type,
        action_by,
        notes,
        metadata,
        ip_address,
        user_agent,
        device,
        location
    ) VALUES (
        p_vehicle_id,
        p_action_type,
        p_action_by,
        p_notes,
        p_metadata,
        p_ip_address,
        p_user_agent,
        p_device,
        p_location
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get activity log analytics
CREATE OR REPLACE FUNCTION get_activity_log_analytics(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH vehicle_stats AS (
        SELECT 
            action_type,
            COUNT(*) as count
        FROM vehicle_activity_log
        WHERE (p_start_date IS NULL OR timestamp >= p_start_date)
        AND (p_end_date IS NULL OR timestamp <= p_end_date)
        GROUP BY action_type
    ),
    user_stats AS (
        SELECT 
            action_type,
            COUNT(*) as count
        FROM user_activity_log
        WHERE (p_start_date IS NULL OR timestamp >= p_start_date)
        AND (p_end_date IS NULL OR timestamp <= p_end_date)
        GROUP BY action_type
    )
    SELECT jsonb_build_object(
        'vehicle_activities', (
            SELECT jsonb_object_agg(action_type, count)
            FROM vehicle_stats
        ),
        'user_activities', (
            SELECT jsonb_object_agg(action_type, count)
            FROM user_stats
        ),
        'total_vehicle_logs', (
            SELECT COUNT(*) FROM vehicle_activity_log
            WHERE (p_start_date IS NULL OR timestamp >= p_start_date)
            AND (p_end_date IS NULL OR timestamp <= p_end_date)
        ),
        'total_user_logs', (
            SELECT COUNT(*) FROM user_activity_log
            WHERE (p_start_date IS NULL OR timestamp >= p_start_date)
            AND (p_end_date IS NULL OR timestamp <= p_end_date)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT ON user_activity_log TO authenticated;
GRANT SELECT, INSERT ON vehicle_activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION log_vehicle_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_log_analytics TO authenticated;

-- Create a materialized view for performance (optional, for large datasets)
CREATE MATERIALIZED VIEW IF NOT EXISTS activity_log_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as log_date,
    'vehicle' as log_type,
    action_type,
    COUNT(*) as count
FROM vehicle_activity_log
GROUP BY DATE_TRUNC('day', timestamp), action_type
UNION ALL
SELECT 
    DATE_TRUNC('day', timestamp) as log_date,
    'user' as log_type,
    action_type,
    COUNT(*) as count
FROM user_activity_log
GROUP BY DATE_TRUNC('day', timestamp), action_type;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_activity_log_summary_date_type ON activity_log_summary(log_date, log_type);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_activity_log_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW activity_log_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for materialized view
GRANT SELECT ON activity_log_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_activity_log_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_activity_log IS 'Tracks user activities and system interactions';
COMMENT ON TABLE vehicle_activity_log IS 'Tracks vehicle-related activities and changes';
COMMENT ON VIEW combined_activity_logs IS 'Combined view of all activity logs for unified reporting';
COMMENT ON MATERIALIZED VIEW activity_log_summary IS 'Daily summary of activity logs for analytics';
COMMENT ON FUNCTION log_user_activity IS 'Logs user activity with metadata';
COMMENT ON FUNCTION log_vehicle_activity IS 'Logs vehicle activity with metadata';
COMMENT ON FUNCTION get_activity_log_analytics IS 'Returns analytics data for activity logs';
