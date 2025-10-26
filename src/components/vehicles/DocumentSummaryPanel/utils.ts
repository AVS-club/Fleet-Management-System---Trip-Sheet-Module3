/**
 * DocumentSummaryPanel Utilities
 *
 * Helper functions extracted from the monolithic component
 */

import { Vehicle } from '@/types';
import { parseISO, isValid, isWithinInterval } from 'date-fns';

// Document type colors
export const DOC_TYPE_COLORS = {
  rc: '#3b82f6',        // blue
  insurance: '#10b981', // green
  fitness: '#f59e0b',   // amber
  permit: '#8b5cf6',    // purple
  puc: '#06b6d4',       // cyan
  tax: '#ef4444',       // red
};

/**
 * Get expiry status for a document
 */
export const getExpiryStatus = (expiryDate: string | null): 'expired' | 'expiring' | 'valid' | 'missing' => {
  if (!expiryDate) return 'missing';

  const now = new Date();
  const expiry = new Date(expiryDate);

  if (expiry < now) return 'expired';

  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 30) return 'expiring';

  return 'valid';
};

/**
 * Calculate RC expiry (15 years from registration)
 */
export const calculateRCExpiry = (registrationDate: string | null): string | null => {
  if (!registrationDate) return null;

  const regDate = new Date(registrationDate);
  regDate.setFullYear(regDate.getFullYear() + 15);

  return regDate.toISOString().split('T')[0];
};

/**
 * Format date to short format
 */
export const formatShortDate = (dateString: string | null): string => {
  if (!dateString) return '—';

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '—';

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

/**
 * Get cost field name for document type
 */
export const getCostFieldName = (docType: string): string => {
  switch (docType) {
    case 'insurance': return 'insurance_premium_amount';
    case 'fitness': return 'fitness_cost';
    case 'permit': return 'permit_cost';
    case 'puc': return 'puc_cost';
    case 'tax': return 'tax_amount';
    default: return '';
  }
};

/**
 * Get last renewal cost for a document
 */
export const getLastRenewalCost = (vehicle: Vehicle, docType: string): number => {
  const costFieldName = getCostFieldName(docType);

  if (!costFieldName) {
    // Default costs for types without specific fields
    const defaults: Record<string, number> = { rc: 2000 };
    return defaults[docType] || 3000;
  }

  const cost = vehicle[costFieldName as keyof Vehicle];

  if (!cost || typeof cost !== 'number' || cost <= 0) {
    const defaults: Record<string, number> = {
      insurance: 15000,
      fitness: 5000,
      permit: 8000,
      puc: 1000,
      tax: 10000,
      rc: 2000
    };
    return defaults[docType] || 3000;
  }

  return cost;
};

/**
 * Get fleet average cost for a document type
 */
export const getFleetAverageCost = (docType: string, vehicles: Vehicle[]): number => {
  const costFieldName = getCostFieldName(docType);

  const defaultCosts: Record<string, number> = {
    rc: 2000,
    insurance: 15000,
    fitness: 5000,
    permit: 8000,
    puc: 1000,
    tax: 10000,
    other: 3000
  };

  if (!vehicles || vehicles.length === 0 || !costFieldName) {
    return defaultCosts[docType] || 3000;
  }

  let sum = 0;
  let count = 0;

  for (const vehicle of vehicles) {
    const cost = vehicle[costFieldName as keyof Vehicle];
    if (typeof cost === 'number' && !isNaN(cost) && cost > 0) {
      sum += cost;
      count++;
    }
  }

  return count > 0 ? sum / count : defaultCosts[docType] || 3000;
};

/**
 * Get inflation rate for document type
 */
export const getInflationRateForDocType = (docType: string): number => {
  switch (docType) {
    case 'insurance': return -0.075;  // -7.5%
    case 'fitness': return 0.05;      // +5%
    case 'permit': return 0;          // 0%
    case 'puc': return 0.05;          // +5%
    case 'tax': return 0.075;         // +7.5%
    case 'rc': return 0.05;           // +5%
    default: return 0.08;             // +8%
  }
};

/**
 * Check if date is within this month
 */
export const isWithinThisMonth = (dateString: string | null): boolean => {
  if (!dateString) return false;

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return false;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return isWithinInterval(date, { start: startOfMonth, end: endOfMonth });
  } catch {
    return false;
  }
};

/**
 * Check if date is within a date range
 */
export const isWithinDateRange = (
  dateString: string | null,
  dateRange: { start: Date; end: Date }
): boolean => {
  if (!dateString) return false;

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return false;

    return isWithinInterval(date, dateRange);
  } catch {
    return false;
  }
};

/**
 * Get status color class
 */
export const getStatusColorClass = (status: string): string => {
  switch (status) {
    case 'expired': return 'text-red-600 bg-red-50';
    case 'expiring': return 'text-amber-600 bg-amber-50';
    case 'valid': return 'text-green-600 bg-green-50';
    case 'missing': return 'text-gray-500 bg-gray-100';
    default: return 'text-gray-600 bg-gray-50';
  }
};
