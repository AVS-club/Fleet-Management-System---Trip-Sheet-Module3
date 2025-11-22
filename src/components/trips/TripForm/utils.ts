/**
 * TripForm Utils - Helper functions for trip form
 *
 * Extracted utility functions to reduce TripForm complexity
 */

import { TripFormData } from '@/types';

/**
 * Calculate distance between start and end odometer readings
 */
export const calculateDistance = (startKm: number | undefined, endKm: number | undefined): number => {
  if (startKm === undefined || endKm === undefined) return 0;
  return Math.max(0, endKm - startKm);
};

/**
 * Calculate route deviation percentage
 */
export const calculateRouteDeviation = (
  actualDistance: number,
  standardDistance: number,
  isReturnTrip: boolean
): number | null => {
  if (standardDistance <= 0 || actualDistance <= 0) return null;

  const effectiveStandardDistance = isReturnTrip ? standardDistance * 2 : standardDistance;
  const deviation = ((actualDistance - effectiveStandardDistance) / effectiveStandardDistance) * 100;

  return deviation;
};

/**
 * Calculate total fuel cost from refuelings
 */
export const calculateTotalFuelCost = (refuelings: any[]): number => {
  if (!refuelings || refuelings.length === 0) return 0;

  return refuelings.reduce((total, refueling) => {
    return total + (refueling.total_fuel_cost || 0);
  }, 0);
};

/**
 * Calculate total fuel quantity from refuelings
 */
export const calculateTotalFuelQuantity = (refuelings: any[]): number => {
  if (!refuelings || refuelings.length === 0) return 0;

  return refuelings.reduce((total, refueling) => {
    return total + (refueling.fuel_quantity || 0);
  }, 0);
};

/**
 * Calculate average fuel rate from refuelings
 */
export const calculateAverageFuelRate = (refuelings: any[]): number => {
  if (!refuelings || refuelings.length === 0) return 0;

  const totalCost = calculateTotalFuelCost(refuelings);
  const totalQuantity = calculateTotalFuelQuantity(refuelings);

  if (totalQuantity === 0) return 0;

  return totalCost / totalQuantity;
};

/**
 * Check if trip has fuel data
 */
export const hasFuelData = (formData: Partial<TripFormData>): boolean => {
  return (
    (formData.total_fuel_cost !== undefined && formData.total_fuel_cost > 0) ||
    (formData.fuel_quantity !== undefined && formData.fuel_quantity > 0) ||
    (formData.refuelings !== undefined &&
     formData.refuelings.length > 0 &&
     formData.refuelings.some(r => r.fuel_quantity > 0 || r.total_fuel_cost > 0))
  );
};

/**
 * Calculate total road expenses
 */
export const calculateTotalRoadExpenses = (formData: Partial<TripFormData>): number => {
  return (
    (formData.unloading_expense || 0) +
    (formData.driver_expense || 0) +
    (formData.road_rto_expense || 0) +
    (formData.toll_expense || 0) +
    (formData.miscellaneous_expense || 0) +
    (formData.breakdown_expense || 0)
  );
};

/**
 * Validate odometer readings
 */
export const validateOdometer = (
  startKm: number | undefined,
  endKm: number | undefined,
  lastTripEndKm: number | null
): {
  isValid: boolean;
  warning: string | null;
  error: string | null;
} => {
  // Check if values are present
  if (startKm === undefined) {
    return {
      isValid: false,
      warning: null,
      error: 'Start KM is required'
    };
  }

  if (endKm === undefined) {
    return {
      isValid: false,
      warning: null,
      error: 'End KM is required'
    };
  }

  // Check if end > start
  if (endKm <= startKm) {
    return {
      isValid: false,
      warning: null,
      error: 'End KM must be greater than Start KM'
    };
  }

  // Warning if start doesn't match last trip's end
  if (lastTripEndKm !== null && startKm !== lastTripEndKm) {
    const diff = Math.abs(startKm - lastTripEndKm);
    return {
      isValid: true,
      warning: `Start KM differs from last trip's end (${lastTripEndKm} km) by ${diff} km`,
      error: null
    };
  }

  return {
    isValid: true,
    warning: null,
    error: null
  };
};

/**
 * Format km value for display
 */
export const formatKm = (km: number | undefined): string => {
  if (km === undefined || km === null) return '—';
  return km.toLocaleString('en-IN');
};

/**
 * Filter vehicles by search term
 */
export const filterVehicles = (vehicles: any[], searchTerm: string): any[] => {
  if (!searchTerm) return vehicles;

  const search = searchTerm.toLowerCase();
  return vehicles.filter(vehicle =>
    vehicle.registration_number?.toLowerCase().includes(search) ||
    vehicle.make?.toLowerCase().includes(search) ||
    vehicle.model?.toLowerCase().includes(search)
  );
};

/**
 * Filter drivers by search term
 */
export const filterDrivers = (drivers: any[], searchTerm: string): any[] => {
  if (!searchTerm) return drivers;

  const search = searchTerm.toLowerCase();
  return drivers.filter(driver =>
    driver.name?.toLowerCase().includes(search) ||
    driver.contact_number?.includes(search) ||
    driver.license_number?.toLowerCase().includes(search)
  );
};

/**
 * Validate form data before submission
 */
export const validateTripForm = (formData: TripFormData): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Required fields
  if (!formData.vehicle_id) errors.push('Vehicle is required');
  if (!formData.driver_id) errors.push('Driver is required');
  if (!formData.warehouse_id) errors.push('Warehouse is required');
  if (!formData.trip_start_date) errors.push('Start date is required');
  if (!formData.trip_end_date) errors.push('End date is required');
  if (formData.start_km === undefined) errors.push('Start KM is required');
  if (formData.end_km === undefined) errors.push('End KM is required');
  if (formData.gross_weight === undefined) errors.push('Gross weight is required');

  // Odometer validation
  if (formData.start_km !== undefined && formData.end_km !== undefined) {
    if (formData.end_km <= formData.start_km) {
      errors.push('End KM must be greater than Start KM');
    }
  }

  // Date validation
  if (formData.trip_start_date && formData.trip_end_date) {
    const startDate = new Date(formData.trip_start_date);
    const endDate = new Date(formData.trip_end_date);
    if (endDate < startDate) {
      errors.push('End date cannot be before start date');
    }
  }

  // Refueling validation
  if (formData.refueling_done && formData.refuelings) {
    formData.refuelings.forEach((refueling, index) => {
      if (!refueling.location) {
        errors.push(`Refueling #${index + 1}: Location is required`);
      }
      if (!refueling.fuel_quantity || refueling.fuel_quantity <= 0) {
        errors.push(`Refueling #${index + 1}: Fuel quantity must be greater than 0`);
      }
      if (!refueling.fuel_rate_per_liter || refueling.fuel_rate_per_liter <= 0) {
        errors.push(`Refueling #${index + 1}: Fuel rate must be greater than 0`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get yesterday's date formatted for input
 */
export const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

/**
 * Safe number parsing
 */
export const safeParseNumber = (value: any, defaultValue: number = 0): number => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};
