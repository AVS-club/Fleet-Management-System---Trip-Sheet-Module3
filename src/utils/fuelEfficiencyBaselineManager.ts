import { supabase } from './supabaseClient';

export interface FuelEfficiencyBaseline {
  vehicle_id: string;
  vehicle_registration: string;
  baseline_kmpl: number;
  baseline_calculated_date: string;
  sample_size: number;
  confidence_score: number; // 0-100
  tolerance_upper_percent: number;
  tolerance_lower_percent: number;
  last_updated: string;
  data_range: {
    start_date: string;
    end_date: string;
    total_distance: number;
    total_fuel: number;
    trip_count: number;
  };
}

export interface EfficiencyDeviation {
  trip_id: string;
  trip_serial_number: string;
  vehicle_id: string;
  vehicle_registration: string;
  trip_date: string;
  actual_kmpl: number;
  baseline_kmpl: number;
  deviation_percent: number;
  deviation_type: 'above_upper' | 'below_lower' | 'within_range';
  severity: 'low' | 'medium' | 'high';
  possible_causes: string[];
  recommendations: string[];
}

export interface BaselineAnalysis {
  vehicle_id: string;
  vehicle_registration: string;
  current_baseline: FuelEfficiencyBaseline | null;
  recent_deviations: EfficiencyDeviation[];
  trend_analysis: {
    last_30_days: {
      avg_kmpl: number;
      deviation_from_baseline: number;
      trend_direction: 'improving' | 'declining' | 'stable';
    };
    last_7_days: {
      avg_kmpl: number;
      deviation_from_baseline: number;
    };
  };
  needs_baseline_update: boolean;
  recommendations: string[];
}

export class FuelEfficiencyBaselineManager {
  // Configuration constants
  private static readonly MIN_TRIPS_FOR_BASELINE = 10;
  // private static readonly MIN_DAYS_FOR_BASELINE = 30; // Reserved for future use
  private static readonly BASELINE_UPDATE_THRESHOLD_DAYS = 90;
  private static readonly DEFAULT_TOLERANCE_PERCENT = 15;
  private static readonly HIGH_DEVIATION_THRESHOLD = 25;
  private static readonly MEDIUM_DEVIATION_THRESHOLD = 15;

  /**
   * Calculate and establish baseline for a vehicle
   */
  static async calculateBaseline(vehicleId: string): Promise<FuelEfficiencyBaseline | null> {
    try {
      // Get vehicle info
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .eq('id', vehicleId)
        .single();

      if (vehicleError || !vehicle) {
        console.error('Vehicle not found:', vehicleError);
        return null;
      }

      // Get historical trip data for baseline calculation
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, trip_start_date, start_km, end_km, fuel_quantity, calculated_kmpl')
        .eq('vehicle_id', vehicleId)
        .gte('trip_start_date', ninetyDaysAgo.toISOString())
        .gt('fuel_quantity', 0)
        .gt('calculated_kmpl', 0)
        .is('deleted_at', null)
        .order('trip_start_date');

      if (tripsError || !trips || trips.length < this.MIN_TRIPS_FOR_BASELINE) {
        console.log(`Insufficient trip data for baseline calculation. Need ${this.MIN_TRIPS_FOR_BASELINE} trips, got ${trips?.length || 0}`);
        return null;
      }

      // Calculate baseline metrics
      const validTrips = trips.filter((trip: any) => 
        trip.calculated_kmpl > 0 && 
        trip.fuel_quantity > 0 &&
        (trip.end_km - trip.start_km) > 0
      );

      if (validTrips.length < this.MIN_TRIPS_FOR_BASELINE) {
        return null;
      }

      // Remove outliers using IQR method
      const kmplValues = validTrips.map((trip: any) => trip.calculated_kmpl).sort((a: number, b: number) => a - b);
      const q1Index = Math.floor(kmplValues.length * 0.25);
      const q3Index = Math.floor(kmplValues.length * 0.75);
      const q1 = kmplValues[q1Index];
      const q3 = kmplValues[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - (1.5 * iqr);
      const upperBound = q3 + (1.5 * iqr);

      const filteredTrips = validTrips.filter((trip: any) => 
        trip.calculated_kmpl >= lowerBound && trip.calculated_kmpl <= upperBound
      );

      if (filteredTrips.length < this.MIN_TRIPS_FOR_BASELINE) {
        return null;
      }

      // Calculate weighted baseline (recent trips have slightly higher weight)
      const totalWeight = filteredTrips.reduce((sum: number, _trip: any, index: number) => {
        const recencyWeight = 1 + (index / filteredTrips.length) * 0.2; // 0-20% bonus for recency
        return sum + recencyWeight;
      }, 0);

      const weightedSum = filteredTrips.reduce((sum: number, trip: any, index: number) => {
        const recencyWeight = 1 + (index / filteredTrips.length) * 0.2;
        return sum + (trip.calculated_kmpl * recencyWeight);
      }, 0);

      const baselineKmpl = weightedSum / totalWeight;

      // Calculate confidence score based on sample size and variance
      const variance = filteredTrips.reduce((sum: number, trip: any) => 
        sum + Math.pow(trip.calculated_kmpl - baselineKmpl, 2), 0) / filteredTrips.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / baselineKmpl;
      
      // Confidence score: higher sample size and lower variance = higher confidence
      const sampleScore = Math.min(filteredTrips.length / 30, 1) * 50; // Max 50 points for sample size
      const consistencyScore = Math.max(0, (0.3 - coefficientOfVariation) / 0.3) * 50; // Max 50 points for consistency
      const confidenceScore = Math.round(sampleScore + consistencyScore);

      // Calculate data range
      const totalDistance = filteredTrips.reduce((sum: number, trip: any) => sum + (trip.end_km - trip.start_km), 0);
      const totalFuel = filteredTrips.reduce((sum: number, trip: any) => sum + trip.fuel_quantity, 0);
      const startDate = filteredTrips[0].trip_start_date;
      const endDate = filteredTrips[filteredTrips.length - 1].trip_start_date;

      const baseline: FuelEfficiencyBaseline = {
        vehicle_id: vehicleId,
        vehicle_registration: vehicle.registration_number,
        baseline_kmpl: Math.round(baselineKmpl * 100) / 100,
        baseline_calculated_date: new Date().toISOString(),
        sample_size: filteredTrips.length,
        confidence_score: confidenceScore,
        tolerance_upper_percent: this.DEFAULT_TOLERANCE_PERCENT,
        tolerance_lower_percent: this.DEFAULT_TOLERANCE_PERCENT,
        last_updated: new Date().toISOString(),
        data_range: {
          start_date: startDate,
          end_date: endDate,
          total_distance: Math.round(totalDistance),
          total_fuel: Math.round(totalFuel * 100) / 100,
          trip_count: filteredTrips.length
        }
      };

      return baseline;
    } catch (error) {
      console.error('Error calculating baseline:', error);
      return null;
    }
  }

  /**
   * Store baseline in database
   */
  static async storeBaseline(baseline: FuelEfficiencyBaseline): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate input
      if (!baseline || !baseline.vehicle_id) {
        return { success: false, error: 'Invalid baseline data - vehicle_id is required' };
      }

      // Get current user for RLS
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Authentication error:', authError);
        return { success: false, error: 'Authentication failed - please log in again' };
      }
      
      if (!user) {
        return { success: false, error: 'User not authenticated - please log in to create baselines' };
      }

      // Check if baseline already exists
      const { data: existing, error: existingError } = await supabase
        .from('fuel_efficiency_baselines')
        .select('vehicle_id')
        .eq('vehicle_id', baseline.vehicle_id)
        .single();

      if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
        console.error('Error checking existing baseline:', existingError);
        return { success: false, error: 'Database query failed - please check your permissions' };
      }

      if (existing) {
        // Update existing baseline
        const { error } = await supabase
          .from('fuel_efficiency_baselines')
          .update({
            baseline_kmpl: baseline.baseline_kmpl,
            baseline_calculated_date: baseline.baseline_calculated_date,
            sample_size: baseline.sample_size,
            confidence_score: baseline.confidence_score,
            tolerance_upper_percent: baseline.tolerance_upper_percent,
            tolerance_lower_percent: baseline.tolerance_lower_percent,
            last_updated: baseline.last_updated,
            data_range: baseline.data_range
          })
          .eq('vehicle_id', baseline.vehicle_id);

        if (error) {
          console.error('RLS UPDATE ERROR - User permissions or authentication issue:', error);
          return { success: false, error: `Update failed: ${error.message}. Check user permissions.` };
        }
      } else {
        // Insert new baseline
        const { error } = await supabase
          .from('fuel_efficiency_baselines')
          .insert({
            vehicle_id: baseline.vehicle_id,
            vehicle_registration: baseline.vehicle_registration,
            baseline_kmpl: baseline.baseline_kmpl,
            baseline_calculated_date: baseline.baseline_calculated_date,
            sample_size: baseline.sample_size,
            confidence_score: baseline.confidence_score,
            tolerance_upper_percent: baseline.tolerance_upper_percent,
            tolerance_lower_percent: baseline.tolerance_lower_percent,
            last_updated: baseline.last_updated,
            data_range: baseline.data_range,
            created_by: user.id
          });

        if (error) {
          console.error('RLS INSERT ERROR - User permissions or authentication issue:', error);
          return { success: false, error: `Insert failed: ${error.message}. Check user permissions and authentication.` };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error storing baseline:', error);
      return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Get stored baseline for vehicle
   */
  static async getBaseline(vehicleId: string): Promise<FuelEfficiencyBaseline | null> {
    try {
      const { data: baseline, error } = await supabase
        .from('fuel_efficiency_baselines')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single();

      if (error || !baseline) {
        return null;
      }

      return baseline;
    } catch (error) {
      console.error('Error getting baseline:', error);
      return null;
    }
  }

  /**
   * Analyze trip against baseline and detect deviations
   */
  static async analyzeTrip(tripId: string): Promise<EfficiencyDeviation | null> {
    try {
      // Get trip data
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select(`
          id, trip_serial_number, trip_start_date, vehicle_id, calculated_kmpl,
          vehicles!inner(registration_number)
        `)
        .eq('id', tripId)
        .single();

      if (tripError || !trip || !trip.calculated_kmpl || trip.calculated_kmpl <= 0) {
        return null;
      }

      // Get baseline for vehicle
      const baseline = await this.getBaseline(trip.vehicle_id);
      if (!baseline) {
        return null;
      }

      // Calculate deviation
      const deviationPercent = ((trip.calculated_kmpl - baseline.baseline_kmpl) / baseline.baseline_kmpl) * 100;
      const absDeviationPercent = Math.abs(deviationPercent);

      // Determine deviation type
      let deviationType: 'above_upper' | 'below_lower' | 'within_range';
      if (deviationPercent > baseline.tolerance_upper_percent) {
        deviationType = 'above_upper';
      } else if (deviationPercent < -baseline.tolerance_lower_percent) {
        deviationType = 'below_lower';
      } else {
        deviationType = 'within_range';
      }

      // Determine severity
      let severity: 'low' | 'medium' | 'high';
      if (absDeviationPercent >= this.HIGH_DEVIATION_THRESHOLD) {
        severity = 'high';
      } else if (absDeviationPercent >= this.MEDIUM_DEVIATION_THRESHOLD) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      // Generate possible causes and recommendations
      const { possibleCauses, recommendations } = this.generateDeviationInsights(deviationType, absDeviationPercent);

      const deviation: EfficiencyDeviation = {
        trip_id: trip.id,
        trip_serial_number: trip.trip_serial_number,
        vehicle_id: trip.vehicle_id,
        vehicle_registration: trip.vehicles.registration_number,
        trip_date: trip.trip_start_date,
        actual_kmpl: trip.calculated_kmpl,
        baseline_kmpl: baseline.baseline_kmpl,
        deviation_percent: Math.round(deviationPercent * 100) / 100,
        deviation_type: deviationType,
        severity,
        possible_causes: possibleCauses,
        recommendations
      };

      return deviation;
    } catch (error) {
      console.error('Error analyzing trip:', error);
      return null;
    }
  }

  /**
   * Generate insights for deviations
   */
  private static generateDeviationInsights(deviationType: string, deviationPercent: number): {
    possibleCauses: string[];
    recommendations: string[];
  } {
    let possibleCauses: string[] = [];
    let recommendations: string[] = [];

    if (deviationType === 'below_lower') {
      possibleCauses = [
        'Aggressive driving or high-speed travel',
        'Air conditioning usage in heavy traffic',
        'Vehicle maintenance issues (dirty air filter, low tire pressure)',
        'Heavy cargo or passenger load',
        'Poor road conditions or traffic congestion',
        'Fuel quality issues',
        'Engine problems or aging components'
      ];

      recommendations = [
        'Check vehicle maintenance schedule',
        'Review driver behavior and driving patterns',
        'Inspect tire pressure and air filter',
        'Consider fuel system cleaning',
        'Monitor for recurring patterns in similar routes'
      ];
    } else if (deviationType === 'above_upper') {
      possibleCauses = [
        'Very efficient driving (optimal speed, smooth acceleration)',
        'Favorable road conditions (downhill, tailwind)',
        'Light vehicle load',
        'Recent vehicle maintenance improvements',
        'Fuel measurement or calculation errors',
        'Route with significant downhill segments'
      ];

      recommendations = [
        'Verify fuel quantity and odometer readings',
        'Document driving conditions and route characteristics',
        'Check if this efficiency can be replicated',
        'Review calculation accuracy',
        'Consider updating baseline if pattern continues'
      ];
    }

    // Add severity-based recommendations
    if (deviationPercent > 25) {
      recommendations.unshift('Immediate investigation required');
      recommendations.push('Consider temporary vehicle inspection');
    }

    return { possibleCauses, recommendations };
  }

  /**
   * Analyze vehicle baseline and recent performance
   */
  static async analyzeVehicle(vehicleId: string): Promise<BaselineAnalysis | null> {
    try {
      // Get vehicle info
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .eq('id', vehicleId)
        .single();

      if (vehicleError || !vehicle) {
        return null;
      }

      // Get current baseline
      const currentBaseline = await this.getBaseline(vehicleId);

      // Get recent trips for trend analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentTrips, error: tripsError } = await supabase
        .from('trips')
        .select('id, trip_start_date, calculated_kmpl')
        .eq('vehicle_id', vehicleId)
        .gte('trip_start_date', thirtyDaysAgo.toISOString())
        .gt('calculated_kmpl', 0)
        .is('deleted_at', null)
        .order('trip_start_date');

      if (tripsError) {
        console.error('Error fetching recent trips:', tripsError);
        return null;
      }

      // Analyze recent deviations
      const recentDeviations: EfficiencyDeviation[] = [];
      if (recentTrips && currentBaseline) {
        for (const trip of recentTrips) {
          const deviation = await this.analyzeTrip(trip.id);
          if (deviation && deviation.deviation_type !== 'within_range') {
            recentDeviations.push(deviation);
          }
        }
      }

      // Calculate trend analysis
      const last30DaysTrips = recentTrips || [];
      const last7DaysTrips = last30DaysTrips.filter((trip: any) => 
        new Date(trip.trip_start_date) >= sevenDaysAgo
      );

      const avg30Days = last30DaysTrips.length > 0 
        ? last30DaysTrips.reduce((sum: number, trip: any) => sum + trip.calculated_kmpl, 0) / last30DaysTrips.length
        : 0;

      const avg7Days = last7DaysTrips.length > 0 
        ? last7DaysTrips.reduce((sum: number, trip: any) => sum + trip.calculated_kmpl, 0) / last7DaysTrips.length
        : 0;

      // Determine trend direction
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      if (currentBaseline && avg30Days > 0) {
        const deviation30Days = ((avg30Days - currentBaseline.baseline_kmpl) / currentBaseline.baseline_kmpl) * 100;
        if (Math.abs(deviation30Days) > 5) {
          trendDirection = deviation30Days > 0 ? 'improving' : 'declining';
        }
      }

      // Check if baseline needs update
      const needsBaselineUpdate = currentBaseline 
        ? this.shouldUpdateBaseline(currentBaseline)
        : true;

      // Generate recommendations
      const recommendations = this.generateVehicleRecommendations(
        currentBaseline,
        recentDeviations,
        trendDirection,
        needsBaselineUpdate
      );

      const analysis: BaselineAnalysis = {
        vehicle_id: vehicleId,
        vehicle_registration: vehicle.registration_number,
        current_baseline: currentBaseline,
        recent_deviations: recentDeviations,
        trend_analysis: {
          last_30_days: {
            avg_kmpl: Math.round(avg30Days * 100) / 100,
            deviation_from_baseline: currentBaseline 
              ? Math.round(((avg30Days - currentBaseline.baseline_kmpl) / currentBaseline.baseline_kmpl) * 10000) / 100
              : 0,
            trend_direction: trendDirection
          },
          last_7_days: {
            avg_kmpl: Math.round(avg7Days * 100) / 100,
            deviation_from_baseline: currentBaseline 
              ? Math.round(((avg7Days - currentBaseline.baseline_kmpl) / currentBaseline.baseline_kmpl) * 10000) / 100
              : 0
          }
        },
        needs_baseline_update: needsBaselineUpdate,
        recommendations
      };

      return analysis;
    } catch (error) {
      console.error('Error analyzing vehicle:', error);
      return null;
    }
  }

  /**
   * Check if baseline should be updated
   */
  private static shouldUpdateBaseline(baseline: FuelEfficiencyBaseline): boolean {
    const lastUpdated = new Date(baseline.last_updated);
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceUpdate > this.BASELINE_UPDATE_THRESHOLD_DAYS || baseline.confidence_score < 60;
  }

  /**
   * Generate vehicle-specific recommendations
   */
  private static generateVehicleRecommendations(
    baseline: FuelEfficiencyBaseline | null,
    deviations: EfficiencyDeviation[],
    trend: 'improving' | 'declining' | 'stable',
    needsUpdate: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!baseline) {
      recommendations.push('Establish fuel efficiency baseline for this vehicle');
      recommendations.push('Collect at least 10 trips over 30 days for accurate baseline');
      return recommendations;
    }

    if (needsUpdate) {
      recommendations.push('Update baseline with recent performance data');
    }

    if (baseline.confidence_score < 70) {
      recommendations.push('Increase trip sample size to improve baseline accuracy');
    }

    const highSeverityDeviations = deviations.filter(d => d.severity === 'high');
    if (highSeverityDeviations.length > 0) {
      recommendations.push('Investigate high-severity efficiency deviations immediately');
    }

    const frequentDeviations = deviations.length > 5;
    if (frequentDeviations) {
      recommendations.push('Review driving patterns and vehicle maintenance schedule');
    }

    if (trend === 'declining') {
      recommendations.push('Monitor vehicle health - efficiency trending downward');
      recommendations.push('Schedule comprehensive vehicle inspection');
    } else if (trend === 'improving') {
      recommendations.push('Document recent changes that improved efficiency');
    }

    return recommendations;
  }

  /**
   * Get system-wide baseline status
   */
  static async getSystemWideBaselineStatus(): Promise<{
    total_vehicles: number;
    vehicles_with_baselines: number;
    vehicles_needing_updates: number;
    vehicles_with_recent_deviations: number;
    avg_confidence_score: number;
    baseline_coverage_percent: number;
    error?: string;
  }> {
    try {
      // Get total vehicle count
      const { count: totalVehicles, error: vehicleCountError } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact' })
        .is('deleted_at', null);

      if (vehicleCountError) {
        console.error('Error getting vehicle count:', vehicleCountError);
        return {
          total_vehicles: 0,
          vehicles_with_baselines: 0,
          vehicles_needing_updates: 0,
          vehicles_with_recent_deviations: 0,
          avg_confidence_score: 0,
          baseline_coverage_percent: 0,
          error: 'Failed to fetch vehicle count from database'
        };
      }

      // Get vehicles with baselines
      const { data: baselines, error: baselinesError } = await supabase
        .from('fuel_efficiency_baselines')
        .select('vehicle_id, confidence_score, last_updated');

      if (baselinesError) {
        console.error('Error getting baselines:', baselinesError);
        return {
          total_vehicles: totalVehicles || 0,
          vehicles_with_baselines: 0,
          vehicles_needing_updates: 0,
          vehicles_with_recent_deviations: 0,
          avg_confidence_score: 0,
          baseline_coverage_percent: 0,
          error: 'Failed to fetch baseline data from database'
        };
      }

      const vehiclesWithBaselines = baselines?.length || 0;
      const avgConfidenceScore = baselines && baselines.length > 0 
        ? baselines.reduce((sum: number, b: any) => sum + b.confidence_score, 0) / baselines.length
        : 0;

      // Check vehicles needing updates
      const vehiclesNeedingUpdates = baselines?.filter((baseline: any) => 
        this.shouldUpdateBaseline(baseline as any)
      ).length || 0;

      // Calculate baseline coverage
      const baselineCoveragePercent = totalVehicles && totalVehicles > 0 
        ? (vehiclesWithBaselines / totalVehicles) * 100
        : 0;

      return {
        total_vehicles: totalVehicles || 0,
        vehicles_with_baselines: vehiclesWithBaselines,
        vehicles_needing_updates: vehiclesNeedingUpdates,
        vehicles_with_recent_deviations: 0, // Will be calculated separately
        avg_confidence_score: Math.round(avgConfidenceScore),
        baseline_coverage_percent: Math.round(baselineCoveragePercent)
      };
    } catch (error) {
      console.error('Unexpected error getting system-wide baseline status:', error);
      return {
        total_vehicles: 0,
        vehicles_with_baselines: 0,
        vehicles_needing_updates: 0,
        vehicles_with_recent_deviations: 0,
        avg_confidence_score: 0,
        baseline_coverage_percent: 0,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Establish baselines for all vehicles that need them
   */
  static async establishBaselinesForAllVehicles(): Promise<{
    success: number;
    failed: number;
    skipped: number;
    results: Array<{
      vehicle_id: string;
      registration: string;
      status: 'success' | 'failed' | 'skipped';
      reason?: string;
    }>;
  }> {
    try {
      // Get all vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .is('deleted_at', null);

      if (vehiclesError || !vehicles) {
        throw vehiclesError;
      }

      const results: Array<{
        vehicle_id: string;
        registration: string;
        status: 'success' | 'failed' | 'skipped';
        reason?: string;
      }> = [];

      let success = 0;
      let failed = 0;
      let skipped = 0;

      for (const vehicle of vehicles) {
        // Check if baseline already exists and is recent
        const existingBaseline = await this.getBaseline(vehicle.id);
        if (existingBaseline && !this.shouldUpdateBaseline(existingBaseline)) {
          results.push({
            vehicle_id: vehicle.id,
            registration: vehicle.registration_number,
            status: 'skipped',
            reason: 'Recent baseline exists'
          });
          skipped++;
          continue;
        }

        // Calculate new baseline
        const newBaseline = await this.calculateBaseline(vehicle.id);
        if (!newBaseline) {
          results.push({
            vehicle_id: vehicle.id,
            registration: vehicle.registration_number,
            status: 'failed',
            reason: 'Insufficient trip data'
          });
          failed++;
          continue;
        }

        // Store baseline
        const storeResult = await this.storeBaseline(newBaseline);
        if (storeResult.success) {
          results.push({
            vehicle_id: vehicle.id,
            registration: vehicle.registration_number,
            status: 'success'
          });
          success++;
        } else {
          results.push({
            vehicle_id: vehicle.id,
            registration: vehicle.registration_number,
            status: 'failed',
            reason: storeResult.error || 'Database storage failed'
          });
          failed++;
        }
      }

      return {
        success,
        failed,
        skipped,
        results
      };
    } catch (error) {
      console.error('Error establishing baselines for all vehicles:', error);
      throw error;
    }
  }
}