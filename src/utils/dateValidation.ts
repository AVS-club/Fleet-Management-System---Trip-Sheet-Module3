/**
 * Date validation and standardization utilities
 * Prevents crashes from invalid dates like "00" in day section
 */

/**
 * Standardizes a date string to ensure it's valid
 * @param dateString - The date string to standardize
 * @returns A valid date string or null if invalid
 */
export const standardizeDate = (dateString: string): string | null => {
  if (!dateString) return null;
  
  try {
    // Handle common invalid date patterns
    if (dateString.includes('00/') || dateString.includes('/00')) {
      return null;
    }
    
    // Parse the date
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Check for invalid day (00)
    const day = date.getDate();
    if (day === 0) {
      return null;
    }
    
    // Return standardized date string (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch (error) {
    logger.error('Error standardizing date:', error);
    return null;
  }
};

/**
 * Validates if a date string is valid and not in the future beyond reasonable limits
 * @param dateString - The date string to validate
 * @param maxFutureDays - Maximum days in the future allowed (default: 365)
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateDate = (
  dateString: string, 
  maxFutureDays: number = 365
): { isValid: boolean; error?: string } => {
  if (!dateString) {
    return { isValid: true }; // Allow empty dates
  }
  
  const standardizedDate = standardizeDate(dateString);
  if (!standardizedDate) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  const date = new Date(standardizedDate);
  const today = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setDate(today.getDate() + maxFutureDays);
  
  // Check if date is too far in the future
  if (date > maxFutureDate) {
    return { 
      isValid: false, 
      error: `Date cannot be more than ${maxFutureDays} days in the future` 
    };
  }
  
  // Check if date is too far in the past (more than 10 years)
  const minPastDate = new Date();
  minPastDate.setFullYear(today.getFullYear() - 10);
  
  if (date < minPastDate) {
    return { 
      isValid: false, 
      error: 'Date cannot be more than 10 years in the past' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validates date range (start and end dates)
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateDateRange = (
  startDate: string, 
  endDate: string
): { isValid: boolean; error?: string } => {
  if (!startDate && !endDate) {
    return { isValid: true };
  }
  
  if (!startDate) {
    return { isValid: true }; // End date can be empty
  }
  
  if (!endDate) {
    return { isValid: true }; // End date can be empty
  }
  
  const startStandardized = standardizeDate(startDate);
  const endStandardized = standardizeDate(endDate);
  
  if (!startStandardized) {
    return { isValid: false, error: 'Invalid start date format' };
  }
  
  if (!endStandardized) {
    return { isValid: false, error: 'Invalid end date format' };
  }
  
  const start = new Date(startStandardized);
  const end = new Date(endStandardized);
  
  if (end < start) {
    return { isValid: false, error: 'End date should be after start date' };
  }
  
  return { isValid: true };
};

/**
 * Formats a date for display in input fields
 * @param date - Date object or date string
 * @returns Formatted date string (YYYY-MM-DD) or empty string
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    logger.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Gets today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Gets a date N days from today
 * @param days - Number of days to add (negative for past dates)
 */
export const getDateFromToday = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};
