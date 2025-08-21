import { supabase } from './supabaseClient';

/**
 * Type definition for vehicle activity log entries
 */
export interface VehicleActivityLog {
  id?: string;
  vehicle_id: string;
  action_type: 'deleted' | 'archived' | 'assigned_driver' | 'unassigned_driver' | 'updated' | 'exported' | 'permanently_deleted';
  action_by: string;
  timestamp?: string;
  notes?: string;
  created_at?: string;
}

/**
 * Logs vehicle activity to the vehicle_activity_log table
 * @param vehicleId ID of the vehicle
 * @param actionType Type of action performed
 * @param actionBy User who performed the action
 * @param notes Optional notes about the action
 * @returns The created log entry or null if there was an error
 */
export const logVehicleActivity = async (
  vehicleId: string, 
  actionType: VehicleActivityLog['action_type'], 
  actionBy: string, 
  notes?: string
): Promise<VehicleActivityLog | null> => {
  try {
    const logEntry: VehicleActivityLog = {
      vehicle_id: vehicleId,
      action_type: actionType,
      action_by: actionBy,
      notes: notes
    };

    const { data, error } = await supabase
      .from('vehicle_activity_log')
      .insert(logEntry)
      .select()
      .single();

    if (error) {
      console.error('Error logging vehicle activity:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception logging vehicle activity:', error);
    return null;
  }
};

/**
 * Gets vehicle activity logs for a specific vehicle
 * @param vehicleId ID of the vehicle
 * @returns Array of activity logs or empty array if there was an error
 */
const getVehicleActivityLogs = async (vehicleId: string): Promise<VehicleActivityLog[]> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_activity_log')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle activity logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching vehicle activity logs:', error);
    return [];
  }
};

/**
 * Gets all vehicle activity logs
 * @param limit Optional limit on the number of logs to return
 * @returns Array of activity logs or empty array if there was an error
 */
export const getAllVehicleActivityLogs = async (limit?: number): Promise<VehicleActivityLog[]> => {
  try {
    let query = supabase
      .from('vehicle_activity_log')
      .select('*, vehicles!inner(registration_number)')
      .order('timestamp', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all vehicle activity logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching all vehicle activity logs:', error);
    return [];
  }
};