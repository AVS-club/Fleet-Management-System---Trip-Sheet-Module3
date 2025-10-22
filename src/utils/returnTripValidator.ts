import { supabase } from './supabaseClient';
import { AuditTrailLogger } from './auditTrailLogger';
import { createLogger } from './logger';

const logger = createLogger('returnTripValidator');

export interface ReturnTripIssue {
  type: 'distance_mismatch' | 'fuel_inconsistency' | 'time_gap' | 'missing_return' | 'orphaned_return';
  trip_id: string;
  trip_serial_number: string;
  related_trip_id?: string;
  related_trip_serial?: string;
  vehicle_registration: string;
  route_description: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  details: {
    expected_value?: number;
    actual_value?: number;
    difference?: number;
    tolerance?: number;
    time_gap_hours?: number;
    max_allowed_gap_hours?: number;
  };
  recommendations: string[];
}

export interface ReturnTripAnalysis {
  trip_id: string;
  vehicle_id: string;
  vehicle_registration: string;
  has_return_trip: boolean;
  is_round_trip: boolean;
  issues: ReturnTripIssue[];
  metrics: {
    outbound_distance?: number;
    return_distance?: number;
    distance_variance?: number;
    outbound_fuel?: number;
    return_fuel?: number;
    fuel_variance?: number;
    time_gap_hours?: number;
  };
}

export class ReturnTripValidator {
  // Tolerance thresholds for validation
  private static readonly DISTANCE_TOLERANCE_PERCENT = 15; // 15% variance allowed
  private static readonly FUEL_TOLERANCE_PERCENT = 20; // 20% variance allowed  
  private static readonly MAX_TIME_GAP_HOURS = 48; // Maximum 48 hours between outbound and return
  private static readonly MIN_RETURN_DISTANCE = 10; // Minimum 10km for a valid return trip

  /**
   * Validate return trip consistency for a specific trip
   */
  static async validateReturnTrip(tripId: string): Promise<ReturnTripAnalysis | null> {
    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select(`
          id, vehicle_id, trip_serial_number, trip_start_date, trip_end_date,
          start_km, end_km, is_return_trip, destinations,
          fuel_quantity, total_fuel_cost, calculated_kmpl,
          vehicles!inner(id, registration_number)
        `)
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        logger.error('Trip not found:', tripError);
        return null;
      }

      const issues: ReturnTripIssue[] = [];
      const analysis: ReturnTripAnalysis = {
        trip_id: tripId,
        vehicle_id: trip.vehicle_id,
        vehicle_registration: trip.vehicles.registration_number,
        has_return_trip: false,
        is_round_trip: trip.is_return_trip,
        issues: [],
        metrics: {}
      };

      if (trip.is_return_trip) {
        // This is marked as a return trip - validate internal consistency
        const returnTripIssues = await this.validateInternalReturnTripConsistency(trip);
        issues.push(...returnTripIssues);
        
        analysis.has_return_trip = true;
        analysis.metrics = {
          outbound_distance: (trip.end_km - trip.start_km) / 2, // Assuming round trip
          return_distance: (trip.end_km - trip.start_km) / 2,
          distance_variance: 0, // Internal trip, no variance to calculate
          outbound_fuel: trip.fuel_quantity / 2,
          return_fuel: trip.fuel_quantity / 2,
          fuel_variance: 0
        };
      } else {
        // Look for a corresponding return trip
        const relatedTrips = await this.findRelatedReturnTrips(trip);
        
        if (relatedTrips.length > 0) {
          analysis.has_return_trip = true;
          
          // Validate each potential return trip
          for (const returnTrip of relatedTrips) {
            const validationIssues = await this.validateTripPair(trip, returnTrip);
            issues.push(...validationIssues);
            
            // Calculate metrics for the first valid return trip
            if (analysis.metrics.outbound_distance === undefined) {
              analysis.metrics = this.calculatePairMetrics(trip, returnTrip);
            }
          }
        } else {
          // Check if this should have a return trip based on destinations
          const shouldHaveReturn = await this.shouldHaveReturnTrip(trip);
          if (shouldHaveReturn) {
            issues.push({
              type: 'missing_return',
              trip_id: trip.id,
              trip_serial_number: trip.trip_serial_number,
              vehicle_registration: trip.vehicles.registration_number,
              route_description: await this.getRouteDescription(trip.destinations),
              severity: 'medium',
              description: 'Expected return trip not found for this outbound journey',
              details: {},
              recommendations: [
                'Check if return trip exists with different serial number',
                'Verify if this was actually a one-way trip',
                'Create return trip entry if journey was completed'
              ]
            });
          }
        }
      }

      analysis.issues = issues;

      // Log return trip validation operation
      await AuditTrailLogger.logReturnTripValidation(tripId, analysis, issues);

      return analysis;
    } catch (error) {
      logger.error('Error validating return trip:', error);
      return null;
    }
  }

  /**
   * Validate internal consistency of a trip marked as return trip
   */
  private static async validateInternalReturnTripConsistency(trip: any): Promise<ReturnTripIssue[]> {
    const issues: ReturnTripIssue[] = [];
    const totalDistance = trip.end_km - trip.start_km;
    
    // Check if distance is reasonable for a return trip
    if (totalDistance < this.MIN_RETURN_DISTANCE * 2) {
      issues.push({
        type: 'distance_mismatch',
        trip_id: trip.id,
        trip_serial_number: trip.trip_serial_number,
        vehicle_registration: trip.vehicles.registration_number,
        route_description: await this.getRouteDescription(trip.destinations),
        severity: 'high',
        description: 'Return trip distance too short for round journey',
        details: {
          actual_value: totalDistance,
          expected_value: this.MIN_RETURN_DISTANCE * 2,
          difference: totalDistance - (this.MIN_RETURN_DISTANCE * 2)
        },
        recommendations: [
          'Verify odometer readings',
          'Check if this should be marked as one-way trip',
          'Review destination accuracy'
        ]
      });
    }

    // Check fuel efficiency consistency
    if (trip.fuel_quantity > 0 && trip.calculated_kmpl) {
      const expectedKmpl = totalDistance / trip.fuel_quantity;
      const variance = Math.abs((expectedKmpl - trip.calculated_kmpl) / trip.calculated_kmpl) * 100;
      
      if (variance > this.FUEL_TOLERANCE_PERCENT) {
        issues.push({
          type: 'fuel_inconsistency',
          trip_id: trip.id,
          trip_serial_number: trip.trip_serial_number,
          vehicle_registration: trip.vehicles.registration_number,
          route_description: await this.getRouteDescription(trip.destinations),
          severity: variance > 30 ? 'high' : 'medium',
          description: 'Fuel efficiency calculation inconsistent with return trip expectations',
          details: {
            expected_value: expectedKmpl,
            actual_value: trip.calculated_kmpl,
            difference: expectedKmpl - trip.calculated_kmpl,
            tolerance: this.FUEL_TOLERANCE_PERCENT
          },
          recommendations: [
            'Verify fuel quantity entries',
            'Check for fuel refills during journey',
            'Review mileage calculation'
          ]
        });
      }
    }

    return issues;
  }

  /**
   * Find related return trips for an outbound trip
   */
  private static async findRelatedReturnTrips(outboundTrip: any): Promise<any[]> {
    try {
      // Look for trips on the same vehicle within reasonable time frame
      const endDate = new Date(outboundTrip.trip_end_date);
      const searchStartDate = new Date(endDate.getTime() + (1000 * 60 * 60)); // 1 hour after
      const searchEndDate = new Date(endDate.getTime() + (this.MAX_TIME_GAP_HOURS * 60 * 60 * 1000));

      const { data: potentialReturns, error } = await supabase
        .from('trips')
        .select(`
          id, trip_serial_number, trip_start_date, trip_end_date,
          start_km, end_km, destinations, fuel_quantity, calculated_kmpl,
          vehicles!inner(registration_number)
        `)
        .eq('vehicle_id', outboundTrip.vehicle_id)
        .gte('trip_start_date', searchStartDate.toISOString())
        .lte('trip_start_date', searchEndDate.toISOString())
        .neq('id', outboundTrip.id)
        .order('trip_start_date');

      if (error) {
        logger.error('Error finding return trips:', error);
        return [];
      }

      // Filter trips that could be return journeys based on destinations
      const relatedTrips = [];
      for (const trip of potentialReturns || []) {
        if (await this.areDestinationsRelated(outboundTrip.destinations, trip.destinations)) {
          relatedTrips.push(trip);
        }
      }

      return relatedTrips;
    } catch (error) {
      logger.error('Error finding related return trips:', error);
      return [];
    }
  }

  /**
   * Validate a pair of outbound and return trips
   */
  private static async validateTripPair(outboundTrip: any, returnTrip: any): Promise<ReturnTripIssue[]> {
    const issues: ReturnTripIssue[] = [];
    
    // Calculate metrics
    const outboundDistance = outboundTrip.end_km - outboundTrip.start_km;
    const returnDistance = returnTrip.end_km - returnTrip.start_km;
    const distanceVariance = Math.abs((outboundDistance - returnDistance) / outboundDistance) * 100;
    
    // Validate distance consistency
    if (distanceVariance > this.DISTANCE_TOLERANCE_PERCENT) {
      issues.push({
        type: 'distance_mismatch',
        trip_id: outboundTrip.id,
        trip_serial_number: outboundTrip.trip_serial_number,
        related_trip_id: returnTrip.id,
        related_trip_serial: returnTrip.trip_serial_number,
        vehicle_registration: outboundTrip.vehicles.registration_number,
        route_description: await this.getRouteDescription(outboundTrip.destinations),
        severity: distanceVariance > 30 ? 'high' : 'medium',
        description: 'Significant distance variance between outbound and return trips',
        details: {
          expected_value: outboundDistance,
          actual_value: returnDistance,
          difference: Math.abs(outboundDistance - returnDistance),
          tolerance: this.DISTANCE_TOLERANCE_PERCENT
        },
        recommendations: [
          'Verify odometer readings for both trips',
          'Check for route variations or detours',
          'Review destination accuracy'
        ]
      });
    }

    // Validate fuel consumption consistency
    if (outboundTrip.fuel_quantity > 0 && returnTrip.fuel_quantity > 0) {
      const outboundEfficiency = outboundDistance / outboundTrip.fuel_quantity;
      const returnEfficiency = returnDistance / returnTrip.fuel_quantity;
      const fuelVariance = Math.abs((outboundEfficiency - returnEfficiency) / outboundEfficiency) * 100;
      
      if (fuelVariance > this.FUEL_TOLERANCE_PERCENT) {
        issues.push({
          type: 'fuel_inconsistency',
          trip_id: outboundTrip.id,
          trip_serial_number: outboundTrip.trip_serial_number,
          related_trip_id: returnTrip.id,
          related_trip_serial: returnTrip.trip_serial_number,
          vehicle_registration: outboundTrip.vehicles.registration_number,
          route_description: await this.getRouteDescription(outboundTrip.destinations),
          severity: fuelVariance > 35 ? 'high' : 'medium',
          description: 'Fuel efficiency varies significantly between outbound and return trips',
          details: {
            expected_value: outboundEfficiency,
            actual_value: returnEfficiency,
            difference: Math.abs(outboundEfficiency - returnEfficiency),
            tolerance: this.FUEL_TOLERANCE_PERCENT
          },
          recommendations: [
            'Check for additional fuel purchases',
            'Verify fuel quantity entries',
            'Consider traffic or route differences'
          ]
        });
      }
    }

    // Validate time gap
    const outboundEnd = new Date(outboundTrip.trip_end_date);
    const returnStart = new Date(returnTrip.trip_start_date);
    const timeGapHours = (returnStart.getTime() - outboundEnd.getTime()) / (1000 * 60 * 60);
    
    if (timeGapHours > this.MAX_TIME_GAP_HOURS) {
      issues.push({
        type: 'time_gap',
        trip_id: outboundTrip.id,
        trip_serial_number: outboundTrip.trip_serial_number,
        related_trip_id: returnTrip.id,
        related_trip_serial: returnTrip.trip_serial_number,
        vehicle_registration: outboundTrip.vehicles.registration_number,
        route_description: await this.getRouteDescription(outboundTrip.destinations),
        severity: timeGapHours > 72 ? 'high' : 'medium',
        description: 'Excessive time gap between outbound and return trips',
        details: {
          time_gap_hours: timeGapHours,
          max_allowed_gap_hours: this.MAX_TIME_GAP_HOURS
        },
        recommendations: [
          'Verify trip dates and times',
          'Check for intermediate trips or activities',
          'Consider if this was multiple separate journeys'
        ]
      });
    }

    return issues;
  }

  /**
   * Calculate metrics for trip pair
   */
  private static calculatePairMetrics(outboundTrip: any, returnTrip: any): any {
    const outboundDistance = outboundTrip.end_km - outboundTrip.start_km;
    const returnDistance = returnTrip.end_km - returnTrip.start_km;
    const distanceVariance = Math.abs((outboundDistance - returnDistance) / outboundDistance) * 100;
    
    const outboundEnd = new Date(outboundTrip.trip_end_date);
    const returnStart = new Date(returnTrip.trip_start_date);
    const timeGapHours = (returnStart.getTime() - outboundEnd.getTime()) / (1000 * 60 * 60);
    
    let fuelVariance = 0;
    if (outboundTrip.fuel_quantity > 0 && returnTrip.fuel_quantity > 0) {
      const outboundEfficiency = outboundDistance / outboundTrip.fuel_quantity;
      const returnEfficiency = returnDistance / returnTrip.fuel_quantity;
      fuelVariance = Math.abs((outboundEfficiency - returnEfficiency) / outboundEfficiency) * 100;
    }

    return {
      outbound_distance: outboundDistance,
      return_distance: returnDistance,
      distance_variance: distanceVariance,
      outbound_fuel: outboundTrip.fuel_quantity,
      return_fuel: returnTrip.fuel_quantity,
      fuel_variance: fuelVariance,
      time_gap_hours: timeGapHours
    };
  }

  /**
   * Check if destinations are related (return journey)
   */
  private static async areDestinationsRelated(outboundDestinations: string[], returnDestinations: string[]): Promise<boolean> {
    if (!outboundDestinations || !returnDestinations) return false;
    
    // Simple heuristic: return trip should have reverse or similar destinations
    // This could be enhanced with actual geographical analysis
    const outboundSet = new Set(outboundDestinations);
    const returnSet = new Set(returnDestinations);
    
    // Check for overlapping destinations (indicating same route)
    const overlap = [...outboundSet].filter(dest => returnSet.has(dest));
    return overlap.length > 0;
  }

  /**
   * Determine if a trip should have a return journey
   */
  private static async shouldHaveReturnTrip(trip: any): Promise<boolean> {
    // Heuristic: trips longer than certain distance typically have returns
    const distance = trip.end_km - trip.start_km;
    const MIN_DISTANCE_FOR_RETURN = 50; // 50km+
    
    // Also check trip duration - longer trips more likely to have returns
    const startTime = new Date(trip.trip_start_date);
    const endTime = new Date(trip.trip_end_date);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    return distance > MIN_DISTANCE_FOR_RETURN || durationHours > 6;
  }

  /**
   * Get route description from destinations
   */
  private static async getRouteDescription(destinationIds: string[]): Promise<string> {
    if (!destinationIds || destinationIds.length === 0) {
      return 'Unknown route';
    }

    try {
      const { data: destinations, error } = await supabase
        .from('destinations')
        .select('name')
        .in('id', destinationIds);

      if (error || !destinations) {
        return 'Unknown route';
      }

      return destinations.map((d: any) => d.name).join(' → ');
    } catch (error) {
      return 'Unknown route';
    }
  }

  /**
   * Get system-wide return trip validation issues
   */
  static async getSystemWideReturnTripIssues(): Promise<{
    total_trips_analyzed: number;
    trips_with_issues: number;
    issues_by_type: Record<string, number>;
    issues_by_severity: Record<string, number>;
    analyses: ReturnTripAnalysis[];
  }> {
    try {
      // Get recent trips (last 30 days) for analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentTrips, error } = await supabase
        .from('trips')
        .select('id')
        .gte('trip_start_date', thirtyDaysAgo.toISOString())
        .order('trip_start_date', { ascending: false })
        .limit(100); // Analyze last 100 trips

      if (error) {
        throw error;
      }

      const analyses: ReturnTripAnalysis[] = [];
      const issuesByType: Record<string, number> = {};
      const issuesBySeverity: Record<string, number> = {};

      for (const trip of recentTrips || []) {
        const analysis = await this.validateReturnTrip(trip.id);
        if (analysis) {
          analyses.push(analysis);
          
          // Count issues
          analysis.issues.forEach(issue => {
            issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
            issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
          });
        }
      }

      const tripsWithIssues = analyses.filter(a => a.issues.length > 0).length;

      return {
        total_trips_analyzed: analyses.length,
        trips_with_issues: tripsWithIssues,
        issues_by_type: issuesByType,
        issues_by_severity: issuesBySeverity,
        analyses
      };
    } catch (error) {
      logger.error('Error getting system-wide return trip issues:', error);
      throw error;
    }
  }
}