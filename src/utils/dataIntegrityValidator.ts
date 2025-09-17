import { supabase } from './supabaseClient';
import { Trip, Vehicle, Driver } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 quality score
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation: string;
}

export interface TripValidationContext {
  previousTrip?: Trip;
  vehicle: Vehicle;
  driver: Driver;
  allTrips: Trip[];
}

export class DataIntegrityValidator {
  // Configuration constants
  private static readonly MAX_ODOMETER_GAP = 50; // km
  private static readonly MIN_TRIP_DISTANCE = 1; // km
  private static readonly MAX_TRIP_DISTANCE = 2000; // km
  private static readonly MIN_FUEL_QUANTITY = 0; // L
  private static readonly MAX_FUEL_QUANTITY = 500; // L
  private static readonly MIN_MILEAGE = 0.5; // km/L
  private static readonly MAX_MILEAGE = 20; // km/L
  private static readonly MAX_TRIP_DURATION_HOURS = 48; // hours

  /**
   * Validate a single trip for data integrity
   */
  static async validateTrip(
    trip: Trip,
    context: TripValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Odometer continuity validation
    this.validateOdometerContinuity(trip, context, errors, warnings);

    // 2. Trip distance validation
    this.validateTripDistance(trip, errors, warnings);

    // 3. Fuel data validation
    this.validateFuelData(trip, errors, warnings);

    // 4. Time validation
    this.validateTripTiming(trip, errors, warnings);

    // 5. Concurrent trip validation
    await this.validateConcurrentTrips(trip, context, errors, warnings);

    // 6. Value range validation
    this.validateValueRanges(trip, errors, warnings);

    // 7. Business logic validation
    this.validateBusinessLogic(trip, context, errors, warnings);

    // Calculate quality score
    const score = this.calculateQualityScore(errors, warnings);

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Validate odometer continuity between consecutive trips
   */
  private static validateOdometerContinuity(
    trip: Trip,
    context: TripValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!context.previousTrip) return;

    const gap = trip.start_km - context.previousTrip.end_km;
    
    if (gap < 0) {
      errors.push({
        field: 'start_km',
        message: `Start odometer reading (${trip.start_km}) is less than previous trip end reading (${context.previousTrip.end_km})`,
        severity: 'critical',
        suggestedFix: 'Verify odometer readings or mark as maintenance trip'
      });
    } else if (gap > this.MAX_ODOMETER_GAP) {
      warnings.push({
        field: 'start_km',
        message: `Large odometer gap detected: ${gap} km between trips`,
        recommendation: 'Consider if this is maintenance, personal use, or data entry error'
      });
    }
  }

  /**
   * Validate trip distance is within reasonable bounds
   */
  private static validateTripDistance(
    trip: Trip,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const distance = trip.end_km - trip.start_km;

    if (distance < this.MIN_TRIP_DISTANCE) {
      errors.push({
        field: 'distance',
        message: `Trip distance (${distance} km) is too short`,
        severity: 'medium',
        suggestedFix: 'Verify odometer readings or mark as maintenance trip'
      });
    } else if (distance > this.MAX_TRIP_DISTANCE) {
      warnings.push({
        field: 'distance',
        message: `Trip distance (${distance} km) is unusually long`,
        recommendation: 'Verify odometer readings and trip duration'
      });
    }
  }

  /**
   * Validate fuel data consistency
   */
  private static validateFuelData(
    trip: Trip,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!trip.fuel_quantity) return;

    // Fuel quantity validation
    if (trip.fuel_quantity < this.MIN_FUEL_QUANTITY) {
      errors.push({
        field: 'fuel_quantity',
        message: 'Fuel quantity cannot be negative',
        severity: 'high',
        suggestedFix: 'Enter correct fuel quantity or leave empty'
      });
    } else if (trip.fuel_quantity > this.MAX_FUEL_QUANTITY) {
      warnings.push({
        field: 'fuel_quantity',
        message: `Fuel quantity (${trip.fuel_quantity}L) seems unusually high`,
        recommendation: 'Verify fuel quantity and vehicle capacity'
      });
    }

    // Mileage validation
    if (trip.calculated_kmpl) {
      if (trip.calculated_kmpl < this.MIN_MILEAGE) {
        warnings.push({
          field: 'calculated_kmpl',
          message: `Mileage (${trip.calculated_kmpl} km/L) is very low`,
          recommendation: 'Check fuel quantity and distance calculations'
        });
      } else if (trip.calculated_kmpl > this.MAX_MILEAGE) {
        warnings.push({
          field: 'calculated_kmpl',
          message: `Mileage (${trip.calculated_kmpl} km/L) is unusually high`,
          recommendation: 'Verify fuel quantity and distance data'
        });
      }
    }
  }

  /**
   * Validate trip timing
   */
  private static validateTripTiming(
    trip: Trip,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!trip.trip_start_date || !trip.trip_end_date) return;

    const startDate = new Date(trip.trip_start_date);
    const endDate = new Date(trip.trip_end_date);
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (durationHours < 0) {
      errors.push({
        field: 'trip_end_date',
        message: 'Trip end date is before start date',
        severity: 'critical',
        suggestedFix: 'Correct the trip end date'
      });
    } else if (durationHours > this.MAX_TRIP_DURATION_HOURS) {
      warnings.push({
        field: 'trip_end_date',
        message: `Trip duration (${durationHours.toFixed(1)} hours) is unusually long`,
        recommendation: 'Verify trip start and end times'
      });
    }
  }

  /**
   * Validate for concurrent trips
   */
  private static async validateConcurrentTrips(
    trip: Trip,
    context: TripValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const startDate = new Date(trip.trip_start_date);
    const endDate = new Date(trip.trip_end_date);

    const concurrentTrips = context.allTrips.filter(t => 
      t.id !== trip.id &&
      t.vehicle_id === trip.vehicle_id &&
      ((new Date(t.trip_start_date) <= endDate && new Date(t.trip_end_date) >= startDate))
    );

    if (concurrentTrips.length > 0) {
      errors.push({
        field: 'trip_timing',
        message: `Vehicle has ${concurrentTrips.length} concurrent trip(s)`,
        severity: 'high',
        suggestedFix: 'Check trip dates or mark one as maintenance/emergency'
      });
    }
  }

  /**
   * Validate value ranges
   */
  private static validateValueRanges(
    trip: Trip,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Odometer readings
    if (trip.start_km < 0 || trip.end_km < 0) {
      errors.push({
        field: 'odometer',
        message: 'Odometer readings cannot be negative',
        severity: 'high',
        suggestedFix: 'Enter correct odometer readings'
      });
    }

    // Expenses validation
    const expenseFields = ['trip_expenses', 'driver_allowance', 'toll_expenses', 'other_expenses'];
    expenseFields.forEach(field => {
      const value = trip[field as keyof Trip] as number;
      if (value && value < 0) {
        errors.push({
          field,
          message: `${field} cannot be negative`,
          severity: 'medium',
          suggestedFix: 'Enter correct expense amount'
        });
      }
    });

    // Material quantity validation
    if (trip.material_quantity && trip.material_quantity < 0) {
      errors.push({
        field: 'material_quantity',
        message: 'Material quantity cannot be negative',
        severity: 'medium',
        suggestedFix: 'Enter correct material quantity'
      });
    }
  }

  /**
   * Validate business logic
   */
  private static validateBusinessLogic(
    trip: Trip,
    context: TripValidationContext,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check if driver is active
    if (context.driver.status !== 'active') {
      warnings.push({
        field: 'driver_id',
        message: `Driver ${context.driver.name} is not active`,
        recommendation: 'Verify driver status or assign active driver'
      });
    }

    // Check if vehicle is active
    if (context.vehicle.status !== 'active') {
      warnings.push({
        field: 'vehicle_id',
        message: `Vehicle ${context.vehicle.registration_number} is not active`,
        recommendation: 'Verify vehicle status or assign active vehicle'
      });
    }

    // Check for return trip logic
    if (trip.is_return_trip) {
      const originalTrip = context.allTrips.find(t => 
        t.vehicle_id === trip.vehicle_id &&
        t.destination === trip.destination &&
        !t.is_return_trip &&
        new Date(t.trip_end_date) < new Date(trip.trip_start_date)
      );

      if (!originalTrip) {
        warnings.push({
          field: 'is_return_trip',
          message: 'No corresponding outbound trip found for return trip',
          recommendation: 'Verify return trip marking or create outbound trip first'
        });
      }
    }
  }

  /**
   * Calculate data quality score
   */
  private static calculateQualityScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Deduct points for warnings
    warnings.forEach(() => {
      score -= 2;
    });

    return Math.max(0, score);
  }

  /**
   * Validate all trips for a vehicle
   */
  static async validateVehicleTrips(vehicleId: string): Promise<ValidationResult[]> {
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('trip_start_date', { ascending: true });

    if (error || !trips) {
      throw new Error('Failed to fetch trips for validation');
    }

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const results: ValidationResult[] = [];

    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      const previousTrip = i > 0 ? trips[i - 1] : undefined;

      // Get driver data
      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', trip.driver_id)
        .single();

      if (!driver) continue;

      const context: TripValidationContext = {
        previousTrip,
        vehicle,
        driver,
        allTrips: trips
      };

      const result = await this.validateTrip(trip, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Get data quality summary for all trips
   */
  static async getDataQualitySummary(): Promise<{
    totalTrips: number;
    averageScore: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    warnings: number;
  }> {
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*');

    if (error || !trips) {
      throw new Error('Failed to fetch trips for quality summary');
    }

    let totalScore = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;
    let warnings = 0;

    for (const trip of trips) {
      // Simplified validation for summary
      const result = await this.validateTrip(trip, {
        vehicle: {} as Vehicle,
        driver: {} as Driver,
        allTrips: trips
      });

      totalScore += result.score;
      result.errors.forEach(error => {
        switch (error.severity) {
          case 'critical':
            criticalIssues++;
            break;
          case 'high':
            highIssues++;
            break;
          case 'medium':
            mediumIssues++;
            break;
          case 'low':
            lowIssues++;
            break;
        }
      });
      warnings += result.warnings.length;
    }

    return {
      totalTrips: trips.length,
      averageScore: trips.length > 0 ? totalScore / trips.length : 100,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      warnings
    };
  }
}
