/**
 * Centralized number formatting utility for the Auto Vital Solution app
 * Ensures consistent decimal formatting throughout the application
 */

/**
 * Rounds a number up to specified decimal places
 * @param value - The number to format
 * @param decimals - Maximum number of decimal places (default: 2)
 * @returns Formatted number with max decimal places, rounded up
 */
export function formatNumberWithRoundUp(value: number | string | null | undefined, decimals: number = 2): number {
  if (value === null || value === undefined || value === '') return 0;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return 0;
  
  // For rounding up to specific decimal places
  const multiplier = Math.pow(10, decimals);
  return Math.ceil(num * multiplier) / multiplier;
}

/**
 * Formats a number for display with rounded up value and fixed decimals
 * @param value - The number to format
 * @param decimals - Maximum number of decimal places (default: 2)
 * @returns Formatted string with max decimal places
 */
export function formatDisplayNumber(value: number | string | null | undefined, decimals: number = 2): string {
  const rounded = formatNumberWithRoundUp(value, decimals);
  return rounded.toFixed(decimals);
}

/**
 * Formats currency values with Indian formatting
 * @param amount - The amount to format
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined, showDecimals: boolean = true): string {
  const rounded = formatNumberWithRoundUp(amount, 2);
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  });
  
  return formatter.format(rounded);
}

/**
 * Formats mileage (km/L) values
 * @param value - The mileage value
 * @returns Formatted mileage string
 */
export function formatMileage(value: number | string | null | undefined): string {
  const rounded = formatNumberWithRoundUp(value, 2);
  return `${rounded.toFixed(2)} km/L`;
}

/**
 * Formats distance values
 * @param value - The distance value
 * @returns Formatted distance string
 */
export function formatDistance(value: number | string | null | undefined): string {
  const rounded = formatNumberWithRoundUp(value, 2);
  return `${rounded.toFixed(2)} km`;
}

/**
 * Formats fuel quantity values
 * @param value - The fuel quantity
 * @returns Formatted fuel quantity string
 */
export function formatFuelQuantity(value: number | string | null | undefined): string {
  const rounded = formatNumberWithRoundUp(value, 2);
  return `${rounded.toFixed(2)} L`;
}

/**
 * Formats percentage values
 * @param value - The percentage value
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | string | null | undefined): string {
  const rounded = formatNumberWithRoundUp(value, 2);
  return `${rounded.toFixed(2)}%`;
}

/**
 * Formats large numbers with Indian number system
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatLargeNumber(value: number | string | null | undefined): string {
  const rounded = formatNumberWithRoundUp(value, 2);
  
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return formatter.format(rounded);
}

/**
 * Safely parses and rounds up a number from any input
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails
 * @param decimals - Decimal places for rounding
 * @returns Parsed and rounded number
 */
export function safeParseNumber(
  value: any,
  defaultValue: number = 0,
  decimals: number = 2
): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (isNaN(parsed)) {
    return defaultValue;
  }
  
  return formatNumberWithRoundUp(parsed, decimals);
}

/**
 * Formats a number for database storage (ensures precision)
 * @param value - The value to format
 * @param decimals - Maximum decimal places
 * @returns Number ready for database storage
 */
export function formatForDatabase(value: number | string | null | undefined, decimals: number = 2): number {
  return formatNumberWithRoundUp(value, decimals);
}

/**
 * Batch format multiple values
 * @param values - Object with key-value pairs to format
 * @param decimals - Decimal places for all values
 * @returns Object with formatted values
 */
export function batchFormatNumbers<T extends Record<string, any>>(
  values: T,
  decimals: number = 2
): Record<keyof T, number> {
  const formatted: any = {};
  
  for (const key in values) {
    if (values.hasOwnProperty(key)) {
      formatted[key] = formatNumberWithRoundUp(values[key], decimals);
    }
  }
  
  return formatted;
}

// Export all functions as a namespace for easy import
export const NumberFormatter = {
  roundUp: formatNumberWithRoundUp,
  display: formatDisplayNumber,
  currency: formatCurrency,
  mileage: formatMileage,
  distance: formatDistance,
  fuel: formatFuelQuantity,
  percentage: formatPercentage,
  large: formatLargeNumber,
  parse: safeParseNumber,
  database: formatForDatabase,
  batch: batchFormatNumbers
};

export default NumberFormatter;
