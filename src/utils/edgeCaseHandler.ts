import { supabase } from './supabaseClient';

export interface EdgeCaseDetection {
  case_id: string;
  case_type: 'maintenance_trip' | 'emergency_trip' | 'data_anomaly' | 'breakdown_trip' | 'unusual_pattern' | 'recovery_scenario';
  trip_id?: string;
  vehicle_id: string;
  vehicle_registration: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number; // 0-100
  detected_at: string;
  description: string;
  patterns_detected: string[];
  context: {
    trip_details?: any;
    historical_data?: any;
    anomaly_metrics?: any;
  };
  recommendations: string[];
  auto_actions_taken: string[];
  requires_manual_review: boolean;
  resolution_status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
}

export interface EdgeCaseRule {
  rule_id: string;
  rule_name: string;
  case_type: EdgeCaseDetection['case_type'];
  enabled: boolean;
  conditions: {
    distance_anomaly?: {
      min_threshold?: number;
      max_threshold?: number;
      variance_threshold?: number;
    };
    time_anomaly?: {
      min_duration_hours?: number;
      max_duration_hours?: number;
      unusual_start_time?: boolean;
    };
    fuel_anomaly?: {
      efficiency_variance_threshold?: number;
      zero_fuel_consumption?: boolean;
      excessive_fuel_usage?: boolean;
    };
    pattern_anomaly?: {
      frequency_threshold?: number;
      route_deviation_threshold?: number;
      maintenance_indicators?: string[];
    };
    emergency_indicators?: string[];
  };
  severity_mapping: Record<string, 'low' | 'medium' | 'high' | 'critical'>;
  auto_actions: string[];
}

export interface DataRecoveryScenario {
  scenario_id: string;
  scenario_type: 'missing_trip_data' | 'corrupted_odometer' | 'fuel_data_loss' | 'incomplete_trip' | 'duplicate_detection';
  affected_trips: string[];
  vehicle_id: string;
  data_inconsistencies: Array<{
    field: string;
    expected_value?: any;
    actual_value?: any;
    confidence: number;
  }>;
  recovery_options: Array<{
    method: string;
    description: string;
    risk_level: 'low' | 'medium' | 'high';
    success_probability: number;
    estimated_accuracy: number;
  }>;
  recommended_action: string;
}

export class EdgeCaseHandler {
  // Default detection rules for edge cases
  private static readonly DEFAULT_RULES: EdgeCaseRule[] = [
    {
      rule_id: 'maintenance-trip-detection',
      rule_name: 'Maintenance Trip Detection',
      case_type: 'maintenance_trip',
      enabled: true,
      conditions: {
        distance_anomaly: {
          max_threshold: 50 // Very short trips under 50km
        },
        pattern_anomaly: {
          maintenance_indicators: ['service', 'repair', 'maintenance', 'workshop', 'garage']
        }
      },
      severity_mapping: {
        'short_distance_maintenance': 'low',
        'scheduled_maintenance': 'medium',
        'emergency_maintenance': 'high'
      },
      auto_actions: ['flag_as_maintenance', 'exclude_from_efficiency_baseline']
    },
    {
      rule_id: 'emergency-trip-detection',
      rule_name: 'Emergency Trip Detection',
      case_type: 'emergency_trip',
      enabled: true,
      conditions: {
        time_anomaly: {
          unusual_start_time: true // Very late night or early morning trips
        },
        fuel_anomaly: {
          efficiency_variance_threshold: 50, // Extreme inefficiency may indicate emergency driving
          excessive_fuel_usage: true
        },
        emergency_indicators: ['hospital', 'emergency', 'urgent', 'ambulance', 'police']
      },
      severity_mapping: {
        'late_night_emergency': 'high',
        'medical_emergency': 'critical',
        'breakdown_emergency': 'high'
      },
      auto_actions: ['flag_as_emergency', 'notify_fleet_manager', 'exclude_from_baseline']
    },
    {
      rule_id: 'data-anomaly-detection',
      rule_name: 'Data Anomaly Detection',
      case_type: 'data_anomaly',
      enabled: true,
      conditions: {
        distance_anomaly: {
          min_threshold: 1, // Trips under 1km
          max_threshold: 2000 // Trips over 2000km
        },
        fuel_anomaly: {
          zero_fuel_consumption: true,
          excessive_fuel_usage: true
        }
      },
      severity_mapping: {
        'impossible_distance': 'high',
        'zero_fuel_long_trip': 'high',
        'negative_fuel': 'critical'
      },
      auto_actions: ['flag_for_review', 'suggest_data_correction']
    },
    {
      rule_id: 'breakdown-trip-detection',
      rule_name: 'Vehicle Breakdown Detection',
      case_type: 'breakdown_trip',
      enabled: true,
      conditions: {
        distance_anomaly: {
          max_threshold: 10 // Very short incomplete trips
        },
        time_anomaly: {
          max_duration_hours: 0.5 // Trips under 30 minutes
        },
        pattern_anomaly: {
          maintenance_indicators: ['breakdown', 'tow', 'stuck', 'accident', 'mechanical']
        }
      },
      severity_mapping: {
        'minor_breakdown': 'medium',
        'major_breakdown': 'high',
        'accident_related': 'critical'
      },
      auto_actions: ['flag_as_breakdown', 'notify_maintenance_team', 'create_maintenance_alert']
    },
    {
      rule_id: 'unusual-pattern-detection',
      rule_name: 'Unusual Pattern Detection',
      case_type: 'unusual_pattern',
      enabled: true,
      conditions: {
        distance_anomaly: {
          variance_threshold: 200 // Very unusual distances compared to normal
        },
        pattern_anomaly: {
          frequency_threshold: 3 // Same route repeated unusually often
        }
      },
      severity_mapping: {
        'unusual_frequency': 'medium',
        'route_anomaly': 'low',
        'behavior_pattern': 'medium'
      },
      auto_actions: ['flag_unusual_pattern', 'monitor_for_trends']
    }
  ];

  /**
   * Analyze a trip for edge cases
   */
  static async analyzeTrip(tripId: string): Promise<EdgeCaseDetection[]> {
    try {
      // Get trip details with vehicle and destination info
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select(`
          id, trip_serial_number, trip_start_date, trip_end_date, 
          start_km, end_km, fuel_quantity, calculated_kmpl,
          destinations, driver_id, notes, vehicle_id,
          vehicles!inner(id, registration_number),
          drivers(name)
        `)
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        console.error('Trip not found:', tripError);
        return [];
      }

      const detections: EdgeCaseDetection[] = [];

      // Apply each detection rule
      for (const rule of this.DEFAULT_RULES) {
        if (!rule.enabled) continue;

        const detection = await this.applyRule(rule, trip);
        if (detection) {
          detections.push(detection);
        }
      }

      return detections;
    } catch (error) {
      console.error('Error analyzing trip for edge cases:', error);
      return [];
    }
  }

  /**
   * Apply a specific detection rule to a trip
   */
  private static async applyRule(rule: EdgeCaseRule, trip: any): Promise<EdgeCaseDetection | null> {
    const patternsDetected: string[] = [];
    const detectedCodes: string[] = []; // Machine-readable codes for severity mapping
    let confidenceScore = 0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    const distance = trip.end_km - trip.start_km;
    const startTime = new Date(trip.trip_start_date);
    const endTime = new Date(trip.trip_end_date);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    // Check distance anomalies
    if (rule.conditions.distance_anomaly) {
      const { min_threshold, max_threshold } = rule.conditions.distance_anomaly;
      
      if (min_threshold && distance < min_threshold) {
        patternsDetected.push(`Very short trip: ${distance}km`);
        detectedCodes.push('short_distance');
        if (distance < 1) detectedCodes.push('impossible_distance');
        confidenceScore += 30;
      }
      
      if (max_threshold && distance > max_threshold) {
        patternsDetected.push(`Unusually long trip: ${distance}km`);
        detectedCodes.push('long_distance');
        if (distance > 1000) detectedCodes.push('impossible_distance');
        confidenceScore += 25;
      }
    }

    // Check time anomalies
    if (rule.conditions.time_anomaly) {
      const { min_duration_hours, max_duration_hours, unusual_start_time } = rule.conditions.time_anomaly;
      
      if (min_duration_hours && durationHours < min_duration_hours) {
        patternsDetected.push(`Very short duration: ${durationHours.toFixed(1)}h`);
        detectedCodes.push('short_duration');
        confidenceScore += 20;
      }
      
      if (max_duration_hours && durationHours > max_duration_hours) {
        patternsDetected.push(`Unusually long duration: ${durationHours.toFixed(1)}h`);
        detectedCodes.push('long_duration');
        confidenceScore += 20;
      }
      
      if (unusual_start_time) {
        const hour = startTime.getHours();
        if (hour < 5 || hour > 22) {
          patternsDetected.push(`Unusual start time: ${hour}:00`);
          detectedCodes.push('late_night_emergency');
          confidenceScore += 15;
        }
      }
    }

    // Check fuel anomalies
    if (rule.conditions.fuel_anomaly) {
      const { zero_fuel_consumption, efficiency_variance_threshold } = rule.conditions.fuel_anomaly;
      
      if (zero_fuel_consumption && (!trip.fuel_quantity || trip.fuel_quantity <= 0) && distance > 10) {
        patternsDetected.push(`No fuel recorded for ${distance}km trip`);
        detectedCodes.push('zero_fuel_long_trip');
        if (trip.fuel_quantity < 0) detectedCodes.push('negative_fuel');
        confidenceScore += 40;
      }
      
      if (trip.calculated_kmpl && efficiency_variance_threshold) {
        // Get vehicle baseline for comparison
        const baseline = await this.getVehicleBaselineEfficiency(trip.vehicle_id);
        if (baseline && trip.calculated_kmpl > 0) {
          const variance = Math.abs((trip.calculated_kmpl - baseline) / baseline) * 100;
          if (variance > efficiency_variance_threshold) {
            patternsDetected.push(`Fuel efficiency variance: ${variance.toFixed(1)}%`);
            detectedCodes.push('efficiency_variance');
            if (variance > 100) detectedCodes.push('excessive_fuel_usage');
            confidenceScore += 25;
          }
        }
      }
    }

    // Check pattern anomalies and indicators
    if (rule.conditions.pattern_anomaly?.maintenance_indicators || rule.conditions.emergency_indicators) {
      const indicators = [
        ...(rule.conditions.pattern_anomaly?.maintenance_indicators || []),
        ...(rule.conditions.emergency_indicators || [])
      ];
      
      const tripText = `${trip.destinations?.join(' ') || ''} ${trip.notes || ''}`.toLowerCase();
      
      for (const indicator of indicators) {
        if (tripText.includes(indicator.toLowerCase())) {
          patternsDetected.push(`Indicator found: "${indicator}"`);
          
          // Generate specific codes based on indicators
          if (['service', 'repair', 'maintenance', 'workshop', 'garage'].includes(indicator.toLowerCase())) {
            if (distance < 50) {
              detectedCodes.push('short_distance_maintenance');
            } else {
              detectedCodes.push('scheduled_maintenance');
            }
          }
          
          if (['breakdown', 'tow', 'stuck', 'mechanical'].includes(indicator.toLowerCase())) {
            detectedCodes.push('minor_breakdown');
            if (['tow', 'stuck'].includes(indicator.toLowerCase())) {
              detectedCodes.push('major_breakdown');
            }
          }
          
          if (['accident'].includes(indicator.toLowerCase())) {
            detectedCodes.push('accident_related');
          }
          
          if (['hospital', 'emergency', 'urgent', 'ambulance', 'police'].includes(indicator.toLowerCase())) {
            if (['hospital', 'ambulance'].includes(indicator.toLowerCase())) {
              detectedCodes.push('medical_emergency');
            } else {
              detectedCodes.push('emergency_situation');
            }
          }
          
          confidenceScore += 35;
        }
      }
    }

    // If no patterns detected, no edge case
    if (patternsDetected.length === 0) {
      return null;
    }

    // Determine severity based on patterns and rule mapping
    if (confidenceScore >= 70) {
      severity = 'high';
    } else if (confidenceScore >= 40) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    // Override with rule-specific severity mapping using detected codes
    for (const [codePattern, ruleSeverity] of Object.entries(rule.severity_mapping)) {
      if (detectedCodes.includes(codePattern)) {
        severity = ruleSeverity;
        break;
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(rule.case_type, patternsDetected, severity);

    const detection: EdgeCaseDetection = {
      case_id: `${rule.rule_id}-${trip.id}-${Date.now()}`,
      case_type: rule.case_type,
      trip_id: trip.id,
      vehicle_id: trip.vehicle_id,
      vehicle_registration: trip.vehicles.registration_number,
      severity,
      confidence_score: Math.min(confidenceScore, 100),
      detected_at: new Date().toISOString(),
      description: this.generateDescription(rule.case_type, patternsDetected),
      patterns_detected: patternsDetected,
      context: {
        trip_details: {
          serial: trip.trip_serial_number,
          distance: distance,
          duration_hours: durationHours,
          efficiency: trip.calculated_kmpl,
          destinations: trip.destinations
        }
      },
      recommendations,
      auto_actions_taken: rule.auto_actions,
      requires_manual_review: severity === 'high' || severity === 'critical',
      resolution_status: 'pending'
    };

    return detection;
  }

  /**
   * Get vehicle baseline efficiency for comparison
   */
  private static async getVehicleBaselineEfficiency(vehicleId: string): Promise<number | null> {
    try {
      const { data: baseline } = await supabase
        .from('fuel_efficiency_baselines')
        .select('baseline_kmpl')
        .eq('vehicle_id', vehicleId)
        .single();

      return baseline?.baseline_kmpl || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate description for detected edge case
   */
  private static generateDescription(caseType: string, patterns: string[]): string {
    const descriptions: Record<string, string> = {
      'maintenance_trip': 'Potential maintenance or service trip detected',
      'emergency_trip': 'Emergency or urgent trip pattern identified',
      'data_anomaly': 'Data inconsistency or anomaly detected',
      'breakdown_trip': 'Possible vehicle breakdown or mechanical issue',
      'unusual_pattern': 'Unusual trip pattern that requires attention',
      'recovery_scenario': 'Data recovery scenario identified'
    };

    const baseDescription = descriptions[caseType] || 'Edge case detected';
    return `${baseDescription} - ${patterns.join(', ')}`;
  }

  /**
   * Generate recommendations based on case type and patterns
   */
  private static generateRecommendations(caseType: string, _patterns: string[], severity: string): string[] {
    const commonRecommendations: Record<string, string[]> = {
      'maintenance_trip': [
        'Verify if trip was for vehicle maintenance',
        'Update trip category to maintenance if confirmed',
        'Exclude from efficiency calculations',
        'Check maintenance records for correlation'
      ],
      'emergency_trip': [
        'Confirm if trip was emergency-related',
        'Document emergency circumstances',
        'Review driver and vehicle safety',
        'Consider excluding from performance metrics'
      ],
      'data_anomaly': [
        'Verify odometer and fuel readings',
        'Check for data entry errors',
        'Cross-reference with original documents',
        'Consider data correction if errors found'
      ],
      'breakdown_trip': [
        'Investigate vehicle mechanical condition',
        'Schedule immediate inspection if needed',
        'Document breakdown details',
        'Create maintenance work order'
      ]
    };

    const severityRecommendations: Record<string, string[]> = {
      'critical': [
        'Immediate attention required',
        'Escalate to fleet manager',
        'Suspend vehicle if safety concern'
      ],
      'high': [
        'Review within 24 hours',
        'Notify relevant personnel'
      ],
      'medium': [
        'Review within 3 days',
        'Add to monitoring list'
      ],
      'low': [
        'Review when convenient',
        'Monitor for patterns'
      ]
    };

    const recommendations = [
      ...(commonRecommendations[caseType] || []),
      ...(severityRecommendations[severity] || [])
    ];

    return recommendations;
  }

  /**
   * Analyze vehicle for data recovery scenarios
   */
  static async analyzeDataRecovery(vehicleId: string): Promise<DataRecoveryScenario[]> {
    try {
      const scenarios: DataRecoveryScenario[] = [];

      // Get recent trips for the vehicle
      const { data: trips, error } = await supabase
        .from('trips')
        .select('id, trip_serial_number, trip_start_date, start_km, end_km, fuel_quantity')
        .eq('vehicle_id', vehicleId)
        .order('trip_start_date')
        .limit(50);

      if (error || !trips) {
        return scenarios;
      }

      // Detect missing trip data (gaps in serial numbers or dates)
      const missingDataScenario = this.detectMissingTripData(trips, vehicleId);
      if (missingDataScenario) {
        scenarios.push(missingDataScenario);
      }

      // Detect corrupted odometer readings (impossible jumps or decreases)
      const odometerCorruption = this.detectOdometerCorruption(trips, vehicleId);
      if (odometerCorruption) {
        scenarios.push(odometerCorruption);
      }

      // Detect fuel data inconsistencies
      const fuelDataIssues = this.detectFuelDataIssues(trips, vehicleId);
      if (fuelDataIssues) {
        scenarios.push(fuelDataIssues);
      }

      return scenarios;
    } catch (error) {
      console.error('Error analyzing data recovery scenarios:', error);
      return [];
    }
  }

  /**
   * Detect missing trip data scenarios
   */
  private static detectMissingTripData(trips: any[], vehicleId: string): DataRecoveryScenario | null {
    const issues: Array<{ field: string; expected_value?: any; actual_value?: any; confidence: number }> = [];
    
    // Check for gaps in serial numbers
    const serials = trips.map(t => t.trip_serial_number).filter(Boolean);
    const uniqueSerials = new Set(serials);
    
    if (serials.length !== uniqueSerials.size) {
      issues.push({
        field: 'trip_serial_number',
        expected_value: 'unique_serials',
        actual_value: 'duplicate_serials_found',
        confidence: 90
      });
    }

    // Check for large time gaps between consecutive trips
    for (let i = 1; i < trips.length; i++) {
      const prevDate = new Date(trips[i-1].trip_start_date);
      const currDate = new Date(trips[i].trip_start_date);
      const gapDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (gapDays > 7) { // Gap longer than a week
        issues.push({
          field: 'trip_dates',
          expected_value: 'regular_trip_frequency',
          actual_value: `${gapDays.toFixed(1)}_day_gap`,
          confidence: 70
        });
      }
    }

    if (issues.length === 0) return null;

    return {
      scenario_id: `missing-data-${vehicleId}-${Date.now()}`,
      scenario_type: 'missing_trip_data',
      affected_trips: trips.map(t => t.id),
      vehicle_id: vehicleId,
      data_inconsistencies: issues,
      recovery_options: [
        {
          method: 'manual_data_entry',
          description: 'Manually enter missing trip data from physical records',
          risk_level: 'low',
          success_probability: 85,
          estimated_accuracy: 90
        },
        {
          method: 'interpolation',
          description: 'Estimate missing data using neighboring trip patterns',
          risk_level: 'medium',
          success_probability: 70,
          estimated_accuracy: 75
        }
      ],
      recommended_action: 'Review physical trip records and enter missing data'
    };
  }

  /**
   * Detect odometer corruption scenarios
   */
  private static detectOdometerCorruption(trips: any[], vehicleId: string): DataRecoveryScenario | null {
    const issues: Array<{ field: string; expected_value?: any; actual_value?: any; confidence: number }> = [];
    
    for (let i = 1; i < trips.length; i++) {
      const prevTrip = trips[i-1];
      const currTrip = trips[i];
      
      // Check for odometer going backwards
      if (currTrip.start_km < prevTrip.end_km) {
        issues.push({
          field: 'odometer_reading',
          expected_value: `>= ${prevTrip.end_km}`,
          actual_value: currTrip.start_km,
          confidence: 95
        });
      }
      
      // Check for impossible jumps (> 1000km in a day)
      const kmJump = currTrip.start_km - prevTrip.end_km;
      const timeDiff = (new Date(currTrip.trip_start_date).getTime() - new Date(prevTrip.trip_end_date).getTime()) / (1000 * 60 * 60);
      
      if (kmJump > 1000 && timeDiff < 24) {
        issues.push({
          field: 'odometer_jump',
          expected_value: 'gradual_increase',
          actual_value: `${kmJump}km_in_${timeDiff.toFixed(1)}h`,
          confidence: 85
        });
      }
    }

    if (issues.length === 0) return null;

    return {
      scenario_id: `odometer-corruption-${vehicleId}-${Date.now()}`,
      scenario_type: 'corrupted_odometer',
      affected_trips: trips.filter((_, i) => i > 0).map(t => t.id),
      vehicle_id: vehicleId,
      data_inconsistencies: issues,
      recovery_options: [
        {
          method: 'odometer_verification',
          description: 'Verify actual odometer reading and correct records',
          risk_level: 'low',
          success_probability: 90,
          estimated_accuracy: 95
        },
        {
          method: 'progressive_correction',
          description: 'Correct readings progressively based on distance patterns',
          risk_level: 'medium',
          success_probability: 75,
          estimated_accuracy: 80
        }
      ],
      recommended_action: 'Verify current odometer reading and correct historical data'
    };
  }

  /**
   * Detect fuel data issues
   */
  private static detectFuelDataIssues(trips: any[], vehicleId: string): DataRecoveryScenario | null {
    const issues: Array<{ field: string; expected_value?: any; actual_value?: any; confidence: number }> = [];
    
    for (const trip of trips) {
      const distance = trip.end_km - trip.start_km;
      
      // Check for zero fuel on long trips
      if ((!trip.fuel_quantity || trip.fuel_quantity <= 0) && distance > 50) {
        issues.push({
          field: 'fuel_quantity',
          expected_value: '> 0',
          actual_value: trip.fuel_quantity || 0,
          confidence: 80
        });
      }
      
      // Check for negative fuel
      if (trip.fuel_quantity < 0) {
        issues.push({
          field: 'fuel_quantity',
          expected_value: '>= 0',
          actual_value: trip.fuel_quantity,
          confidence: 95
        });
      }
    }

    if (issues.length === 0) return null;

    return {
      scenario_id: `fuel-data-issues-${vehicleId}-${Date.now()}`,
      scenario_type: 'fuel_data_loss',
      affected_trips: trips.map(t => t.id),
      vehicle_id: vehicleId,
      data_inconsistencies: issues,
      recovery_options: [
        {
          method: 'fuel_receipt_verification',
          description: 'Cross-reference with fuel receipts and payment records',
          risk_level: 'low',
          success_probability: 85,
          estimated_accuracy: 90
        },
        {
          method: 'average_consumption_estimation',
          description: 'Estimate fuel consumption based on vehicle average efficiency',
          risk_level: 'medium',
          success_probability: 70,
          estimated_accuracy: 75
        }
      ],
      recommended_action: 'Review fuel receipts and update missing fuel data'
    };
  }

  /**
   * Get system-wide edge case analysis
   */
  static async getSystemWideEdgeCases(): Promise<{
    total_cases_detected: number;
    cases_by_type: Record<string, number>;
    cases_by_severity: Record<string, number>;
    pending_reviews: number;
    recent_detections: EdgeCaseDetection[];
  }> {
    try {
      // For this implementation, we'll analyze recent trips
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentTrips } = await supabase
        .from('trips')
        .select('id')
        .gte('trip_start_date', thirtyDaysAgo.toISOString())
        .limit(100);

      const allDetections: EdgeCaseDetection[] = [];
      
      if (recentTrips) {
        for (const trip of recentTrips) {
          const detections = await this.analyzeTrip(trip.id);
          allDetections.push(...detections);
        }
      }

      const casesByType: Record<string, number> = {};
      const casesBySeverity: Record<string, number> = {};

      allDetections.forEach(detection => {
        casesByType[detection.case_type] = (casesByType[detection.case_type] || 0) + 1;
        casesBySeverity[detection.severity] = (casesBySeverity[detection.severity] || 0) + 1;
      });

      const pendingReviews = allDetections.filter(d => d.requires_manual_review && d.resolution_status === 'pending').length;

      return {
        total_cases_detected: allDetections.length,
        cases_by_type: casesByType,
        cases_by_severity: casesBySeverity,
        pending_reviews: pendingReviews,
        recent_detections: allDetections.slice(0, 20) // Most recent 20
      };
    } catch (error) {
      console.error('Error getting system-wide edge cases:', error);
      throw error;
    }
  }
}