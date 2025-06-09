import { supabase } from './supabaseClient';

export interface AlertSettings {
  auto_popup: boolean;
  display_type: 'all' | 'critical';
  group_by: 'none' | 'vehicle' | 'type';
  enabled_types: string[];
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

const defaultSettings: AlertSettings = {
  auto_popup: true,
  display_type: 'all',
  group_by: 'none',
  enabled_types: ['route_deviation', 'maintenance', 'documentation', 'fuel_anomaly']
};

export const getAlertSettings = async (): Promise<AlertSettings> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return defaultSettings;
  }
  
  // Try to get user's settings
  const { data, error } = await supabase
    .from('alert_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error || !data) {
    // If no settings found, create default settings
    const { data: newSettings } = await supabase
      .from('alert_settings')
      .insert({
        ...defaultSettings,
        user_id: user.id
      })
      .select()
      .single();
    
    return newSettings || defaultSettings;
  }
  
  return data;
};

export const updateAlertSettings = async (settings: AlertSettings): Promise<void> => {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No user found, cannot update alert settings');
    return;
  }
  
  const { error } = await supabase
    .from('alert_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);
  
  if (error) {
    console.error('Error updating alert settings:', error);
  }
};