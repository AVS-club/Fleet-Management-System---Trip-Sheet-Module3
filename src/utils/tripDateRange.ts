import { parseISO, isValid, isWithinInterval, isBefore } from 'date-fns';
import type { Trip } from '../types';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Filters trips that fall within the provided date range.
 * Returns an empty array if the range is invalid or trips is not an array.
 */
export const filterTripsByDateRange = (
  trips: Trip[],
  dateRange: DateRange
): Trip[] => {
  if (!Array.isArray(trips)) return [];

  if (
    !isValid(dateRange.start) ||
    !isValid(dateRange.end) ||
    !isBefore(dateRange.start, dateRange.end)
  ) {
    console.warn('Invalid date range:', dateRange);
    return [];
  }

  return trips.filter((trip) => {
    try {
      const tripDate = trip.trip_end_date ? parseISO(trip.trip_end_date) : null;
      if (!tripDate || !isValid(tripDate)) return false;
      return isWithinInterval(tripDate, dateRange);
    } catch (error) {
      console.warn('Error filtering trip by date:', error);
      return false;
    }
  });
};

export default filterTripsByDateRange;

