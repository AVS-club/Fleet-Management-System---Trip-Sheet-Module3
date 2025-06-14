import { Trip, RouteAnalysis } from '../types';
import { supabase } from './supabaseClient';

// Stub functions that no longer generate alerts
export const getAIAlerts = async () => {
  const { data, error } = await supabase
    .from('ai_alerts')
    .select('*');

  if (error) {
    console.error('Error fetching AI alerts:', error);
    return [];
  }

  return data || [];
};

export const analyzeTripAndGenerateAlerts = (
  _trip: Trip,
  _analysis: RouteAnalysis | undefined,
  _allTrips: Trip[]
): [] => {
  return [];
};

export const processAlertAction = async (
  alertId: string, 
  action: 'accept' | 'deny' | 'ignore', 
  reason?: string, 
  duration?: 'week' | 'permanent'
) => {
  const status = action === 'accept' ? 'accepted' : action === 'deny' ? 'denied' : 'ignored';
  
  const { error } = await supabase
    .from('ai_alerts')
    .update({
      status,
      metadata: {
        action_reason: reason,
        ignore_duration: duration
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error processing alert action:', error);
  }
};

export default {
  analyzeTripAndGenerateAlerts,
  processAlertAction,
  getAIAlerts
};