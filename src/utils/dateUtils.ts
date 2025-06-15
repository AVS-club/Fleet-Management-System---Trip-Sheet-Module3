import { formatDistanceToNow, isValid, format } from 'date-fns';

/**
 * Format a date string to a human-readable format
 * - Recent dates (< 24 hours): "X hours ago"
 * - Older dates: "DD MMM YYYY"
 * - Invalid dates: "-"
 */
export function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // Return dash if date is invalid
    if (!isValid(date)) {
      return '-';
    }
    
    // Get current time
    const now = new Date();
    
    // Check if the date is within the last 24 hours
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // For recent dates, show relative time
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      // For older dates, show formatted date
      return format(date, 'dd MMM yyyy');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Safely format a date string using date-fns format
 * Returns a fallback string if the date is invalid
 */
export function safeFormatDate(dateString: string, formatString: string = 'dd MMM yyyy HH:mm', fallback: string = '-'): string {
  try {
    const date = new Date(dateString);
    return isValid(date) ? format(date, formatString) : fallback;
  } catch (error) {
    return fallback;
  }
}