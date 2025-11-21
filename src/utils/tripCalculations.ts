import { Trip } from '../types';

/**
 * Calculate the total expense for a trip including all cost categories
 * @param trip - The trip object
 * @returns The total expense amount
 */
export const calculateTripTotalExpense = (trip: Trip): number => {
  return (
    (trip.total_fuel_cost || 0) +
    (trip.driver_expense || 0) +
    (trip.unloading_expense || 0) +
    (trip.road_rto_expense || 0) +
    (trip.toll_expense || 0) +
    (trip.breakdown_expense || 0) +
    (trip.miscellaneous_expense || 0)
  );
};

/**
 * Get the display value for total expense
 * Uses the saved total_expense if available, otherwise calculates it
 * @param trip - The trip object
 * @returns The total expense amount to display
 */
export const getTripTotalExpenseDisplay = (trip: Trip): number => {
  // If total_expense is already calculated and saved, use it
  if (trip.total_expense !== null && trip.total_expense !== undefined && trip.total_expense > 0) {
    return trip.total_expense;
  }
  
  // Otherwise, calculate it from individual expense fields
  return calculateTripTotalExpense(trip);
};

/**
 * Get formatted expense breakdown string
 * Shows fuel cost first, then unloading, then sum of other expenses
 * Format: "1000+500+300" where first is fuel, second is unloading, third is others
 * @param trip - The trip object
 * @returns Formatted expense breakdown string
 */
export const getExpenseBreakdownDisplay = (trip: Trip): string => {
  const fuel = trip.total_fuel_cost || 0;
  const unloading = trip.unloading_expense || 0;
  
  // Sum of all other expenses
  const others = (trip.driver_expense || 0) +
    (trip.road_rto_expense || 0) +
    (trip.toll_expense || 0) +
    (trip.breakdown_expense || 0) +
    (trip.miscellaneous_expense || 0);
  
  // Build the display string
  const parts: string[] = [];
  
  // Always show fuel first if it exists
  if (fuel > 0) {
    parts.push(`₹${fuel.toLocaleString('en-IN')}`);
  }
  
  // Show unloading second if it exists
  if (unloading > 0) {
    parts.push(`${unloading.toLocaleString('en-IN')}`);
  }
  
  // Show others third if they exist
  if (others > 0) {
    parts.push(`${others.toLocaleString('en-IN')}`);
  }
  
  // If no expenses, show 0
  if (parts.length === 0) {
    return '₹0';
  }
  
  // Join with + for breakdown display
  return parts.join('+');
};
