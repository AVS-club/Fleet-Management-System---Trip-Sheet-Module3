/**
 * Warranty Calculation Utilities
 * Handles warranty expiry date calculation and status determination
 *
 * Works with task-level warranty fields:
 * - warranty_expiry (DATE)
 * - warranty_status ("valid" | "expired" | "not_applicable")
 * - warranty_claimed (BOOLEAN)
 */

import { addMonths, parseISO, differenceInDays, format, max } from 'date-fns';

export interface WarrantyInfo {
  expiryDate: string | null;
  status: 'valid' | 'expired' | 'not_applicable';
  daysRemaining: number | null;
  statusColor: string;
  statusText: string;
  statusBadge: string;
}

/**
 * Calculate warranty expiry date from start date and duration
 * @param startDate - The date when warranty started (task completion date or part replacement date)
 * @param warrantyPeriod - Warranty period string (e.g., "12 months", "36 months", "48 months")
 * @returns ISO date string of expiry date or null if invalid
 */
export function calculateWarrantyExpiryDate(
  startDate: string | Date,
  warrantyPeriod: string | null | undefined
): string | null {
  if (!startDate || !warrantyPeriod) return null;

  try {
    // Parse the warranty period to extract months
    const monthsMatch = warrantyPeriod.match(/(\d+)\s*months?/i);
    if (!monthsMatch) return null;

    const months = parseInt(monthsMatch[1], 10);
    if (isNaN(months) || months <= 0) return null;

    // Parse start date
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;

    // Add months to get expiry date
    const expiryDate = addMonths(start, months);

    return expiryDate.toISOString();
  } catch (error) {
    console.error('Error calculating warranty expiry:', error);
    return null;
  }
}

/**
 * Get warranty status and information
 * @param expiryDate - Warranty expiry date
 * @returns Warranty information including status, days remaining, and display colors
 */
export function getWarrantyStatus(expiryDate: string | null | undefined): WarrantyInfo {
  if (!expiryDate) {
    return {
      expiryDate: null,
      status: 'not_applicable',
      daysRemaining: null,
      statusColor: 'bg-gray-100 text-gray-700',
      statusText: 'No Warranty',
      statusBadge: 'bg-gray-100 text-gray-700 border border-gray-300',
    };
  }

  try {
    const expiry = parseISO(expiryDate);
    const today = new Date();
    const daysRemaining = differenceInDays(expiry, today);

    if (daysRemaining < 0) {
      return {
        expiryDate,
        status: 'expired',
        daysRemaining,
        statusColor: 'bg-red-100 text-red-700',
        statusText: 'Expired',
        statusBadge: 'bg-red-100 text-red-700 border border-red-300',
      };
    } else {
      return {
        expiryDate,
        status: 'valid',
        daysRemaining,
        statusColor: 'bg-green-100 text-green-700',
        statusText: daysRemaining <= 30 ? 'Expiring Soon' : 'Active',
        statusBadge: daysRemaining <= 30
          ? 'bg-orange-100 text-orange-700 border border-orange-300'
          : 'bg-green-100 text-green-700 border border-green-300',
      };
    }
  } catch (error) {
    console.error('Error getting warranty status:', error);
    return {
      expiryDate: null,
      status: 'not_applicable',
      daysRemaining: null,
      statusColor: 'bg-gray-100 text-gray-700',
      statusText: 'Unknown',
      statusBadge: 'bg-gray-100 text-gray-700 border border-gray-300',
    };
  }
}

/**
 * Format warranty expiry date for display
 * @param expiryDate - Warranty expiry date
 * @returns Formatted date string
 */
export function formatWarrantyExpiryDate(expiryDate: string | null | undefined): string {
  if (!expiryDate) return '—';

  try {
    const date = parseISO(expiryDate);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return '—';
  }
}

/**
 * Calculate task-level warranty expiry based on parts
 * Finds the latest warranty expiry date from all parts with warranty periods
 * @param serviceGroups - Array of service groups with parts data
 * @param taskCompletionDate - Date when the task was completed (use end_date)
 * @returns Object with warranty_expiry and warranty_status for the task
 */
export function calculateTaskWarranty(
  serviceGroups: any[],
  taskCompletionDate: string | Date
): { warranty_expiry: string | null; warranty_status: 'valid' | 'expired' | 'not_applicable' } {
  if (!serviceGroups || !taskCompletionDate) {
    return {
      warranty_expiry: null,
      warranty_status: 'not_applicable',
    };
  }

  const expiryDates: Date[] = [];

  // Collect all warranty expiry dates from parts
  serviceGroups.forEach(group => {
    if (group.parts_data && Array.isArray(group.parts_data)) {
      group.parts_data.forEach((part: any) => {
        if (part.warrantyPeriod) {
          const expiryDate = calculateWarrantyExpiryDate(taskCompletionDate, part.warrantyPeriod);
          if (expiryDate) {
            try {
              expiryDates.push(parseISO(expiryDate));
            } catch (e) {
              console.error('Invalid expiry date:', e);
            }
          }
        }
      });
    }
  });

  // If no warranty periods found, return not_applicable
  if (expiryDates.length === 0) {
    return {
      warranty_expiry: null,
      warranty_status: 'not_applicable',
    };
  }

  // Use the LATEST expiry date (longest warranty)
  const latestExpiry = max(expiryDates);
  const warrantyInfo = getWarrantyStatus(latestExpiry.toISOString());

  return {
    warranty_expiry: format(latestExpiry, 'yyyy-MM-dd'),
    warranty_status: warrantyInfo.status,
  };
}
