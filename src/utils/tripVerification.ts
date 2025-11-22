import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('TripVerification');

/**
 * Toggle expense verification status for a trip
 */
export const toggleExpenseVerification = async (
  tripId: string,
  currentStatus: boolean,
  userEmail?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const newStatus = !currentStatus;
    
    const updateData: any = {
      expense_verified: newStatus,
      expense_verified_at: newStatus ? new Date().toISOString() : null,
      expense_verified_by: newStatus ? userEmail : null,
    };

    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId);

    if (error) {
      logger.error('Error toggling expense verification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in toggleExpenseVerification:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Verify multiple trips at once
 */
export const bulkVerifyExpenses = async (
  tripIds: string[],
  userEmail?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData = {
      expense_verified: true,
      expense_verified_at: new Date().toISOString(),
      expense_verified_by: userEmail,
    };

    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .in('id', tripIds);

    if (error) {
      logger.error('Error bulk verifying expenses:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in bulkVerifyExpenses:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get verification statistics
 */
export const getVerificationStats = async (
  organizationId?: string
): Promise<{
  total: number;
  verified: number;
  unverified: number;
  verificationRate: number;
}> => {
  try {
    let query = supabase
      .from('trips')
      .select('expense_verified', { count: 'exact' });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, count, error } = await query;

    if (error) {
      logger.error('Error fetching verification stats:', error);
      return { total: 0, verified: 0, unverified: 0, verificationRate: 0 };
    }

    const total = count || 0;
    const verified = data?.filter(t => t.expense_verified).length || 0;
    const unverified = total - verified;
    const verificationRate = total > 0 ? (verified / total) * 100 : 0;

    return { total, verified, unverified, verificationRate };
  } catch (error) {
    logger.error('Unexpected error in getVerificationStats:', error);
    return { total: 0, verified: 0, unverified: 0, verificationRate: 0 };
  }
};

