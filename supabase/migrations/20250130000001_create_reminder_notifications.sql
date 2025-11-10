-- Create table to track email/SMS notifications sent for reminders
CREATE TABLE IF NOT EXISTS reminder_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id VARCHAR NOT NULL, -- References reminder_tracking.reminder_id
    entity_id VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    reminder_type VARCHAR NOT NULL,

    -- Notification details
    notification_method VARCHAR NOT NULL CHECK (notification_method IN ('email', 'sms')),
    recipient_email VARCHAR,
    recipient_phone VARCHAR,
    recipient_name VARCHAR,

    -- Delivery status
    status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'scheduled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- Email/SMS details
    subject TEXT,
    message_body TEXT,
    template_used VARCHAR,

    -- Metadata
    n8n_execution_id VARCHAR, -- Track n8n workflow execution ID
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Organization (for multi-tenancy)
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_reminder_id ON reminder_notifications(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_entity ON reminder_notifications(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_status ON reminder_notifications(status);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_method ON reminder_notifications(notification_method);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_sent_at ON reminder_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_org ON reminder_notifications(organization_id);

-- Add updated_at trigger
CREATE TRIGGER update_reminder_notifications_updated_at
    BEFORE UPDATE ON reminder_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE reminder_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reminder notifications for their organization"
    ON reminder_notifications FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert reminder notifications for their organization"
    ON reminder_notifications FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update reminder notifications for their organization"
    ON reminder_notifications FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Add index to track which reminders need notification
-- This helps n8n query efficiently
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_notification_needed
    ON reminder_tracking(status, due_date, created_at)
    WHERE status = 'active';

-- Comment
COMMENT ON TABLE reminder_notifications IS 'Tracks email and SMS notifications sent for reminders via n8n or other external services';
