/**
 * Utility functions for highlighting search matches in trip data
 */

export interface HighlightedText {
  text: string;
  isMatch: boolean;
}

/**
 * Highlights matching text in a string
 */
export function highlightMatch(text: string, searchTerm: string): HighlightedText[] {
  if (!searchTerm.trim() || !text) {
    return [{ text, isMatch: false }];
  }

  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => ({
    text: part,
    isMatch: index % 2 === 1 // Odd indices are matches
  }));
}

/**
 * Escapes special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights multiple search terms in a string
 */
export function highlightMultipleMatches(text: string, searchTerms: string[]): HighlightedText[] {
  if (!searchTerms.length || !text) {
    return [{ text, isMatch: false }];
  }

  // Create a combined regex for all search terms
  const escapedTerms = searchTerms.map(escapeRegExp);
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => ({
    text: part,
    isMatch: index % 2 === 1
  }));
}

/**
 * Checks if a trip matches the search criteria
 */
export function tripMatchesSearch(trip: any, searchTerm: string): boolean {
  if (!searchTerm.trim()) return true;

  const lowerSearchTerm = searchTerm.toLowerCase();
  const searchableFields = [
    trip.trip_serial_number,
    trip.manual_trip_id,
    trip.vehicle?.registration_number,
    trip.vehicle?.make,
    trip.vehicle?.model,
    trip.driver?.name,
    trip.warehouse?.name,
    trip.source_location,
    trip.destination_location,
    trip.material_description,
    trip.notes
  ];

  // Check text matches
  const textMatch = searchableFields.some(field => 
    field?.toLowerCase().includes(lowerSearchTerm)
  );

  if (textMatch) return true;

  // Check numeric patterns
  const numValue = parseFloat(searchTerm.replace(/[^\d.]/g, ''));
  if (!isNaN(numValue)) {
    // Distance search
    if (/^\d+(\.\d+)?\s*km?$/i.test(searchTerm) || /^\d+$/.test(searchTerm)) {
      const tolerance = numValue * 0.1; // 10% tolerance
      if (trip.total_distance && 
          Math.abs(trip.total_distance - numValue) <= tolerance) {
        return true;
      }
    }
    
    // Expense search
    if (/₹|rs|rupee|\d+k?/i.test(searchTerm)) {
      const multiplier = /k$/i.test(searchTerm) ? 1000 : 1;
      const actualValue = numValue * multiplier;
      const tolerance = actualValue * 0.1; // 10% tolerance
      if (trip.total_expenses && 
          Math.abs(trip.total_expenses - actualValue) <= tolerance) {
        return true;
      }
    }
    
    // Mileage search
    if (/^\d+(\.\d+)?\s*km\/l?$/i.test(searchTerm)) {
      const tolerance = numValue * 0.1; // 10% tolerance
      if (trip.fuel_efficiency && 
          Math.abs(trip.fuel_efficiency - numValue) <= tolerance) {
        return true;
      }
    }
    
    // Fuel consumption search
    if (/^\d+(\.\d+)?\s*l$/i.test(searchTerm)) {
      const tolerance = numValue * 0.1; // 10% tolerance
      if (trip.fuel_consumed && 
          Math.abs(trip.fuel_consumed - numValue) <= tolerance) {
        return true;
      }
    }
    
    // Deviation search
    if (/%|deviation/i.test(searchTerm)) {
      const tolerance = Math.abs(numValue) * 0.1; // 10% tolerance
      if (trip.route_deviation !== null && trip.route_deviation !== undefined && 
          Math.abs(trip.route_deviation - numValue) <= tolerance) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets search suggestions based on trip data
 */
export function getSearchSuggestions(trips: any[], searchTerm: string): any[] {
  if (!searchTerm.trim()) return [];

  const lowerSearchTerm = searchTerm.toLowerCase();
  const suggestions = [];
  const seen = new Set();

  trips.forEach(trip => {
    // Trip ID suggestions
    if (trip.trip_serial_number?.toLowerCase().includes(lowerSearchTerm) && 
        !seen.has(trip.trip_serial_number)) {
      suggestions.push({
        type: 'trip',
        text: trip.trip_serial_number,
        meta: `${trip.vehicle?.registration_number || ''} • ${trip.driver?.name || ''}`.trim()
      });
      seen.add(trip.trip_serial_number);
    }

    // Driver suggestions
    if (trip.driver?.name?.toLowerCase().includes(lowerSearchTerm) && 
        !seen.has(trip.driver.name)) {
      suggestions.push({
        type: 'driver',
        text: trip.driver.name,
        meta: `${trips.filter(t => t.driver?.name === trip.driver.name).length} trips`
      });
      seen.add(trip.driver.name);
    }

    // Vehicle suggestions
    if (trip.vehicle?.registration_number?.toLowerCase().includes(lowerSearchTerm) && 
        !seen.has(trip.vehicle.registration_number)) {
      suggestions.push({
        type: 'vehicle',
        text: trip.vehicle.registration_number,
        meta: `Last trip: ${new Date(trip.trip_start_date).toLocaleDateString()}`
      });
      seen.add(trip.vehicle.registration_number);
    }

    // Distance suggestions
    if (trip.total_distance && 
        trip.total_distance.toString().includes(searchTerm.replace(/[^\d]/g, '')) && 
        !seen.has(trip.total_distance)) {
      suggestions.push({
        type: 'distance',
        text: `${trip.total_distance} km`,
        meta: `${trip.vehicle?.registration_number || ''} • ${trip.driver?.name || ''}`.trim()
      });
      seen.add(trip.total_distance);
    }

    // Deviation suggestions
    if (trip.route_deviation !== null && trip.route_deviation !== undefined &&
        trip.route_deviation.toString().includes(searchTerm.replace(/[^\d.-]/g, '')) && 
        !seen.has(trip.route_deviation)) {
      suggestions.push({
        type: 'deviation',
        text: `${trip.route_deviation}%`,
        meta: `${trip.vehicle?.registration_number || ''} • ${trip.driver?.name || ''}`.trim()
      });
      seen.add(trip.route_deviation);
    }
  });

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

/**
 * Manages search history in localStorage
 */
export class SearchHistoryManager {
  private static readonly STORAGE_KEY = 'tripSearchHistory';
  private static readonly MAX_HISTORY = 10;

  static addSearch(searchTerm: string): void {
    if (!searchTerm.trim()) return;

    const history = this.getHistory();
    const newHistory = [searchTerm, ...history.filter(item => item !== searchTerm)]
      .slice(0, this.MAX_HISTORY);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newHistory));
  }

  static getHistory(): string[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static removeSearch(searchTerm: string): void {
    const history = this.getHistory();
    const newHistory = history.filter(item => item !== searchTerm);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newHistory));
  }
}
