import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('BillingSettings');

export type BillingType = 'per_km' | 'per_ton' | 'per_trip' | 'per_unit' | 'manual';

export interface BillingSettings {
  default_billing_type: BillingType;
  organization_id?: string;
  user_id?: string;
}

const DEFAULT_BILLING_TYPE: BillingType = 'per_km';

/**
 * Get the default billing type for the current user
 */
export const getDefaultBillingType = async (): Promise<BillingType> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('No user found, returning default billing type');
      return DEFAULT_BILLING_TYPE;
    }

    // Get billing setting for user
    const { data, error } = await supabase
      .from('global_settings')
      .select('setting_value')
      .eq('setting_name', 'default_billing_type')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      logger.info('No billing type setting found, returning default');
      return DEFAULT_BILLING_TYPE;
    }

    return (data.setting_value as BillingType) || DEFAULT_BILLING_TYPE;
  } catch (error) {
    logger.error('Error getting default billing type:', error);
    return DEFAULT_BILLING_TYPE;
  }
};

/**
 * Set the default billing type for the current user
 */
export const setDefaultBillingType = async (billingType: BillingType): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error('No user found');
      return false;
    }

    // Upsert the setting
    const { error } = await supabase
      .from('global_settings')
      .upsert({
        setting_name: 'default_billing_type',
        setting_value: billingType,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_name,user_id'
      });

    if (error) {
      logger.error('Error setting default billing type:', error);
      return false;
    }

    logger.info(`Default billing type set to ${billingType}`);
    return true;
  } catch (error) {
    logger.error('Error setting default billing type:', error);
    return false;
  }
};

/**
 * Get billing type label for display
 */
export const getBillingTypeLabel = (type: BillingType): string => {
  switch (type) {
    case 'per_km':
      return 'Per Kilometer';
    case 'per_ton':
      return 'Per Ton';
    case 'per_trip':
      return 'Per Trip (Flat Rate)';
    case 'per_unit':
      return 'Per Unit/Pack';
    case 'manual':
      return 'Manual Entry';
    default:
      return 'Unknown';
  }
};

/**
 * Calculate income based on billing type
 */
export const calculateIncome = (
  billingType: BillingType,
  freightRate: number,
  distance: number,
  weight: number,
  manualAmount?: number
): number => {
  switch (billingType) {
    case 'per_km':
      return distance * freightRate;
    case 'per_ton':
      return weight * freightRate;
    case 'per_trip':
      return freightRate; // Flat rate
    case 'per_unit':
      // Using weight as unit count (can be customized)
      return weight * freightRate;
    case 'manual':
      return manualAmount || 0;
    default:
      return 0;
  }
};

/**
 * Get rate label based on billing type
 */
export const getRateLabel = (type: BillingType): string => {
  switch (type) {
    case 'per_km':
      return 'Rate per KM (₹)';
    case 'per_ton':
      return 'Rate per Ton (₹)';
    case 'per_trip':
      return 'Flat Rate per Trip (₹)';
    case 'per_unit':
      return 'Rate per Unit/Pack (₹)';
    case 'manual':
      return 'Total Amount (₹)';
    default:
      return 'Rate (₹)';
  }
};

/**
 * Get all available billing types
 */
export const getAllBillingTypes = (): Array<{ value: BillingType; label: string }> => {
  return [
    { value: 'per_km', label: 'Per Kilometer' },
    { value: 'per_ton', label: 'Per Ton' },
    { value: 'per_trip', label: 'Per Trip (Flat Rate)' },
    { value: 'per_unit', label: 'Per Unit/Pack' },
    { value: 'manual', label: 'Manual Entry' }
  ];
};
