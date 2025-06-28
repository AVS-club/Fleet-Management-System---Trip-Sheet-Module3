/*
  # Add popup_display_frequency column to alert_settings

  1. Changes
    - Add popup_display_frequency column to alert_settings table
    - This column will store the frequency setting for notification popups
    - Options: 'always', 'once_per_session', 'daily', 'never'
    - Default value is 'once_per_session' for backward compatibility
  
  2. Rename / Update
    - Keep show_popup_modal_on_load for backward compatibility
    - Consider migrating data from show_popup_modal_on_load to popup_display_frequency
*/

-- Add popup_display_frequency column to alert_settings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alert_settings' AND column_name = 'popup_display_frequency'
  ) THEN
    ALTER TABLE alert_settings ADD COLUMN popup_display_frequency text DEFAULT 'once_per_session';
  END IF;
END $$;

-- Add column description
COMMENT ON COLUMN alert_settings.popup_display_frequency IS 'Controls how often notification popups should appear: always, once_per_session, daily, never';