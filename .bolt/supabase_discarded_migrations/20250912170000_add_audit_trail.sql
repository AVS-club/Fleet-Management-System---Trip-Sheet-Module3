-- Create audit_trail table for comprehensive tracking of data integrity operations
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL, -- 'data_correction', 'validation_check', 'baseline_update', 'edge_case_detection', etc.
    operation_category VARCHAR(30) NOT NULL, -- 'trip_data', 'vehicle_data', 'driver_data', 'fuel_data', 'system_maintenance'
    entity_type VARCHAR(30) NOT NULL, -- 'trip', 'vehicle', 'driver', 'fuel_efficiency_baseline', 'edge_case'
    entity_id VARCHAR(100) NOT NULL, -- ID of the affected entity
    entity_description TEXT, -- Human-readable description of the entity
    action_performed VARCHAR(100) NOT NULL, -- 'created', 'updated', 'deleted', 'validated', 'corrected', 'flagged'
    
    -- User and context information
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_type VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user', 'system', 'admin'
    ip_address INET,
    user_agent TEXT,
    
    -- Change details
    changes_made JSONB, -- Detailed record of what changed (before/after values)
    validation_results JSONB, -- Results of validation checks
    severity_level VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    confidence_score INTEGER, -- 0-100 for AI/automatic operations
    
    -- Data integrity context
    related_operations UUID[], -- Array of related audit trail IDs
    cascade_operations UUID[], -- IDs of operations triggered by this one
    source_system VARCHAR(50) NOT NULL DEFAULT 'fleet_management', -- Source system identifier
    integration_context JSONB, -- Context from external integrations
    
    -- Quality and compliance
    data_quality_score INTEGER, -- 0-100 assessment of data quality after operation
    compliance_flags TEXT[], -- Array of compliance requirements affected
    risk_assessment JSONB, -- Risk analysis of the operation
    
    -- Operational metadata
    operation_duration_ms INTEGER, -- How long the operation took
    error_details JSONB, -- Error information if operation failed
    rollback_possible BOOLEAN DEFAULT TRUE, -- Whether this operation can be rolled back
    rollback_complexity VARCHAR(20) DEFAULT 'simple', -- 'simple', 'moderate', 'complex', 'impossible'
    
    -- Indexing and organization
    tags TEXT[], -- Searchable tags for categorization
    business_context TEXT, -- Business justification or context
    approval_required BOOLEAN DEFAULT FALSE, -- Whether this type of operation requires approval
    approved_by UUID REFERENCES auth.users(id), -- Who approved the operation (if required)
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Tenant isolation
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_at ON audit_trail(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_operation ON audit_trail(operation_type, operation_category);
CREATE INDEX IF NOT EXISTS idx_audit_trail_severity ON audit_trail(severity_level);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_type ON audit_trail(user_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_by ON audit_trail(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_tags ON audit_trail USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changes ON audit_trail USING GIN(changes_made);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity_time ON audit_trail(entity_type, entity_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_operation ON audit_trail(performed_by, operation_type, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_severity_time ON audit_trail(severity_level, performed_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit trail entries for their organization
CREATE POLICY "Users can view audit trail for their organization"
ON audit_trail FOR SELECT
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.organization_id = (
            SELECT organization_id FROM users WHERE id = audit_trail.created_by
        )
    )
);

-- RLS Policy: Only authenticated users can insert audit trail entries
CREATE POLICY "Users can insert audit trail entries"
ON audit_trail FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    performed_by = auth.uid() AND
    created_by = auth.uid()
);

-- RLS Policy: Prevent updates to audit trail (immutable)
CREATE POLICY "Audit trail entries are immutable"
ON audit_trail FOR UPDATE
USING (FALSE);

-- RLS Policy: Prevent deletion of audit trail entries
CREATE POLICY "Audit trail entries cannot be deleted"
ON audit_trail FOR DELETE
USING (FALSE);

-- Create audit trail summary view for dashboard queries
CREATE VIEW audit_trail_summary AS
SELECT 
    DATE_TRUNC('day', performed_at) as date,
    operation_type,
    operation_category,
    severity_level,
    user_type,
    COUNT(*) as operation_count,
    AVG(operation_duration_ms) as avg_duration_ms,
    COUNT(CASE WHEN error_details IS NOT NULL THEN 1 END) as error_count,
    AVG(data_quality_score) as avg_quality_score,
    AVG(confidence_score) as avg_confidence_score
FROM audit_trail
GROUP BY DATE_TRUNC('day', performed_at), operation_type, operation_category, severity_level, user_type;

-- Grant access to the summary view
ALTER VIEW audit_trail_summary OWNER TO postgres;

-- Create function to log audit trail entries
CREATE OR REPLACE FUNCTION log_audit_trail(
    p_operation_type VARCHAR(50),
    p_operation_category VARCHAR(30),
    p_entity_type VARCHAR(30),
    p_entity_id VARCHAR(100),
    p_entity_description TEXT,
    p_action_performed VARCHAR(100),
    p_changes_made JSONB DEFAULT NULL,
    p_validation_results JSONB DEFAULT NULL,
    p_severity_level VARCHAR(20) DEFAULT 'info',
    p_confidence_score INTEGER DEFAULT NULL,
    p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_business_context TEXT DEFAULT NULL,
    p_data_quality_score INTEGER DEFAULT NULL,
    p_operation_duration_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found';
    END IF;
    
    -- Insert audit trail entry
    INSERT INTO audit_trail (
        operation_type,
        operation_category,
        entity_type,
        entity_id,
        entity_description,
        action_performed,
        performed_by,
        changes_made,
        validation_results,
        severity_level,
        confidence_score,
        tags,
        business_context,
        data_quality_score,
        operation_duration_ms,
        created_by
    ) VALUES (
        p_operation_type,
        p_operation_category,
        p_entity_type,
        p_entity_id,
        p_entity_description,
        p_action_performed,
        current_user_id,
        p_changes_made,
        p_validation_results,
        p_severity_level,
        p_confidence_score,
        p_tags,
        p_business_context,
        p_data_quality_score,
        p_operation_duration_ms,
        current_user_id
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get audit trail for entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
    p_entity_type VARCHAR(30),
    p_entity_id VARCHAR(100),
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    id UUID,
    operation_type VARCHAR(50),
    operation_category VARCHAR(30),
    action_performed VARCHAR(100),
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE,
    user_type VARCHAR(20),
    changes_made JSONB,
    validation_results JSONB,
    severity_level VARCHAR(20),
    confidence_score INTEGER,
    business_context TEXT,
    data_quality_score INTEGER,
    operation_duration_ms INTEGER,
    performer_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.operation_type,
        a.operation_category,
        a.action_performed,
        a.performed_by,
        a.performed_at,
        a.user_type,
        a.changes_made,
        a.validation_results,
        a.severity_level,
        a.confidence_score,
        a.business_context,
        a.data_quality_score,
        a.operation_duration_ms,
        COALESCE(u.name, 'System') as performer_name
    FROM audit_trail a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.entity_type = p_entity_type 
    AND a.entity_id = p_entity_id
    AND a.created_by = auth.uid()
    ORDER BY a.performed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search audit trail
CREATE OR REPLACE FUNCTION search_audit_trail(
    p_operation_types VARCHAR(50)[] DEFAULT NULL,
    p_severity_levels VARCHAR(20)[] DEFAULT NULL,
    p_entity_types VARCHAR(30)[] DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_search_text TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    operation_type VARCHAR(50),
    operation_category VARCHAR(30),
    entity_type VARCHAR(30),
    entity_id VARCHAR(100),
    entity_description TEXT,
    action_performed VARCHAR(100),
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE,
    severity_level VARCHAR(20),
    confidence_score INTEGER,
    business_context TEXT,
    performer_name TEXT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.operation_type,
        a.operation_category,
        a.entity_type,
        a.entity_id,
        a.entity_description,
        a.action_performed,
        a.performed_by,
        a.performed_at,
        a.severity_level,
        a.confidence_score,
        a.business_context,
        COALESCE(u.name, 'System') as performer_name,
        COUNT(*) OVER() as total_count
    FROM audit_trail a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.created_by = auth.uid()
    AND (p_operation_types IS NULL OR a.operation_type = ANY(p_operation_types))
    AND (p_severity_levels IS NULL OR a.severity_level = ANY(p_severity_levels))
    AND (p_entity_types IS NULL OR a.entity_type = ANY(p_entity_types))
    AND (p_start_date IS NULL OR a.performed_at >= p_start_date)
    AND (p_end_date IS NULL OR a.performed_at <= p_end_date)
    AND (p_search_text IS NULL OR 
         a.entity_description ILIKE '%' || p_search_text || '%' OR
         a.business_context ILIKE '%' || p_search_text || '%' OR
         a.changes_made::text ILIKE '%' || p_search_text || '%')
    ORDER BY a.performed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;