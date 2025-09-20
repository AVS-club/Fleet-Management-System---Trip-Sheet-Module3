import { supabase } from "./supabaseClient";
import { handleSupabaseError } from "./errors";

export interface AlertThreshold {
  id: string;
  user_id: string;
  alert_type: string;
  entity_type: string;
  threshold_days: number;
  threshold_km?: number;
  is_enabled: boolean;
  priority: 'critical' | 'warning' | 'normal';
  notification_methods: string[];
  created_at: string;
  updated_at: string;
}

export interface AlertThresholdConfig {
  alert_type: string;
  entity_type: string;
  threshold_days: number;
  threshold_km?: number;
  is_enabled: boolean;
  priority: 'critical' | 'warning' | 'normal';
  notification_methods: string[];
}

/**
 * Get all alert thresholds for the current user
 */
export const getAlertThresholds = async (): Promise<AlertThreshold[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    const { data, error } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('user_id', user.id)
      .order('entity_type', { ascending: true })
      .order('alert_type', { ascending: true });

    if (error) {
      handleSupabaseError('fetch alert thresholds', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching alert thresholds:', error);
    return [];
  }
};

/**
 * Get alert threshold for a specific alert type and entity type
 */
export const getAlertThreshold = async (
  alertType: string, 
  entityType: string
): Promise<AlertThreshold | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }

    const { data, error } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('user_id', user.id)
      .eq('alert_type', alertType)
      .eq('entity_type', entityType)
      .maybeSingle();

    if (error) {
      handleSupabaseError('fetch alert threshold', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching alert threshold:', error);
    return null;
  }
};

/**
 * Create or update an alert threshold
 */
export const upsertAlertThreshold = async (
  config: AlertThresholdConfig
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    const { error } = await supabase
      .from('alert_thresholds')
      .upsert({
        user_id: user.id,
        alert_type: config.alert_type,
        entity_type: config.entity_type,
        threshold_days: config.threshold_days,
        threshold_km: config.threshold_km,
        is_enabled: config.is_enabled,
        priority: config.priority,
        notification_methods: config.notification_methods,
      }, {
        onConflict: 'user_id,alert_type,entity_type'
      });

    if (error) {
      handleSupabaseError('upsert alert threshold', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error upserting alert threshold:', error);
    return false;
  }
};

/**
 * Delete an alert threshold
 */
export const deleteAlertThreshold = async (
  alertType: string, 
  entityType: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    const { error } = await supabase
      .from('alert_thresholds')
      .delete()
      .eq('user_id', user.id)
      .eq('alert_type', alertType)
      .eq('entity_type', entityType);

    if (error) {
      handleSupabaseError('delete alert threshold', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting alert threshold:', error);
    return false;
  }
};

/**
 * Reset alert thresholds to default values
 */
export const resetAlertThresholdsToDefault = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    // Delete existing thresholds
    const { error: deleteError } = await supabase
      .from('alert_thresholds')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      handleSupabaseError('delete existing alert thresholds', deleteError);
      return false;
    }

    // Insert default thresholds
    const defaultThresholds: AlertThresholdConfig[] = [
      // Vehicle document expiry thresholds
      { alert_type: 'rc_expiry', entity_type: 'vehicle', threshold_days: 30, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'insurance_expiry', entity_type: 'vehicle', threshold_days: 30, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'puc_expiry', entity_type: 'vehicle', threshold_days: 15, priority: 'critical', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'fitness_expiry', entity_type: 'vehicle', threshold_days: 30, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'permit_expiry', entity_type: 'vehicle', threshold_days: 30, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      
      // Driver document expiry thresholds
      { alert_type: 'license_expiry', entity_type: 'driver', threshold_days: 30, priority: 'critical', is_enabled: true, notification_methods: ['in_app'] },
      
      // Maintenance thresholds
      { alert_type: 'service_due_date', entity_type: 'maintenance', threshold_days: 7, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'service_due_km', entity_type: 'maintenance', threshold_days: 0, threshold_km: 1000, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'task_open_too_long', entity_type: 'maintenance', threshold_days: 7, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'no_recent_maintenance', entity_type: 'maintenance', threshold_days: 90, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      
      // Trip thresholds
      { alert_type: 'missing_fuel_bill', entity_type: 'trip', threshold_days: 3, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'missing_end_km', entity_type: 'trip', threshold_days: 1, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'missing_fuel_data', entity_type: 'trip', threshold_days: 1, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
      { alert_type: 'high_route_deviation', entity_type: 'trip', threshold_days: 0, priority: 'warning', is_enabled: true, notification_methods: ['in_app'] },
    ];

    const { error: insertError } = await supabase
      .from('alert_thresholds')
      .insert(
        defaultThresholds.map(threshold => ({
          ...threshold,
          user_id: user.id,
        }))
      );

    if (insertError) {
      handleSupabaseError('insert default alert thresholds', insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error resetting alert thresholds to default:', error);
    return false;
  }
};

/**
 * Get alert threshold configuration grouped by entity type
 */
export const getAlertThresholdsByEntityType = async (): Promise<Record<string, AlertThreshold[]>> => {
  const thresholds = await getAlertThresholds();
  
  return thresholds.reduce((acc, threshold) => {
    if (!acc[threshold.entity_type]) {
      acc[threshold.entity_type] = [];
    }
    acc[threshold.entity_type].push(threshold);
    return acc;
  }, {} as Record<string, AlertThreshold[]>);
};

/**
 * Check if an alert should be triggered based on threshold configuration
 */
export const shouldTriggerAlert = (
  alertType: string,
  entityType: string,
  daysLeft?: number,
  kmLeft?: number,
  threshold?: AlertThreshold
): boolean => {
  if (!threshold || !threshold.is_enabled) {
    return false;
  }

  // Check days threshold
  if (daysLeft !== undefined && threshold.threshold_days > 0) {
    return daysLeft <= threshold.threshold_days;
  }

  // Check km threshold
  if (kmLeft !== undefined && threshold.threshold_km && threshold.threshold_km > 0) {
    return kmLeft <= threshold.threshold_km;
  }

  return false;
};
