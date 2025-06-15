import { Trip, RouteAnalysis, Alert, AIAlert } from '../types';
import { supabase } from './supabaseClient';

// Mileage anomaly detection thresholds
const MAX_ALLOWED_MILEAGE = 30; // km/L - suspiciously high mileage
const MIN_ALLOWED_MILEAGE = 4;  // km/L - suspiciously low mileage

/**
 * Check for mileage anomalies in a trip
 * @param trip The trip to analyze
 * @returns An alert object if an anomaly is detected, or null if no anomaly
 */
export const checkMileageAnomaly = async (trip: Trip): Promise<AIAlert | null> => {
  // Skip trips without refueling or fuel quantity
  if (!trip.refueling_done || !trip.fuel_quantity || trip.fuel_quantity <= 0) {
    return null;
  }

  // Skip short/local trips as they often have unusual mileage patterns
  if (trip.short_trip) {
    return null;
  }

  const distance = trip.end_km - trip.start_km;
  
  // Skip if distance is invalid
  if (distance <= 0) {
    return null;
  }

  const mileage = distance / trip.fuel_quantity;

  // Check if mileage is outside acceptable range
  if (mileage > MAX_ALLOWED_MILEAGE || mileage < MIN_ALLOWED_MILEAGE) {
    const alertData: Omit<AIAlert, 'id' | 'updated_at'> = {
      alert_type: 'fuel_anomaly',
      severity: mileage > MAX_ALLOWED_MILEAGE ? 'medium' : 'high',
      status: 'pending',
      title: `Unusual mileage detected: ${mileage.toFixed(2)} km/L`,
      description: `Trip ${trip.trip_serial_number} recorded ${mileage.toFixed(2)} km/L, which is ${
        mileage > MAX_ALLOWED_MILEAGE ? 'higher than expected' : 'lower than expected'
      }. This might indicate ${
        mileage > MAX_ALLOWED_MILEAGE ? 
          'fuel leakage, data entry error, or gauge malfunction.' : 
          'vehicle issues, driving style concerns, or fuel theft.'
      }`,
      affected_entity: {
        type: 'vehicle',
        id: trip.vehicle_id
      },
      metadata: {
        trip_id: trip.id,
        driver_id: trip.driver_id,
        expected_range: `${MIN_ALLOWED_MILEAGE}-${MAX_ALLOWED_MILEAGE} km/L`,
        actual_value: mileage,
        distance: distance,
        fuel_quantity: trip.fuel_quantity,
        recommendations: [
          mileage > MAX_ALLOWED_MILEAGE ?
            'Verify odometer readings and fuel quantity data' :
            'Check for vehicle mechanical issues',
          'Compare with previous trips for this vehicle',
          'Investigate driver behavior if pattern continues'
        ]
      },
      created_at: new Date().toISOString()
    };

    try {
      // Insert the alert into Supabase
      const { data, error } = await supabase
        .from('ai_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating mileage anomaly alert:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating mileage anomaly alert:', error);
      return null;
    }
  }

  return null;
};

// Stub functions that no longer generate alerts
export const getAIAlerts = async () => {
  const { data, error } = await supabase
    .from('ai_alerts')
    .select('*');

  if (error) {
    console.error('Error fetching AI alerts:', error);
    return [];
  }

  return data || [];
};

export const analyzeTripAndGenerateAlerts = async (
  trip: Trip,
  analysis: RouteAnalysis | undefined,
  allTrips: Trip[]
): Promise<Alert[]> => {
  const alerts: Alert[] = [];
  
  // Check for route deviation alerts
  if (analysis && Math.abs(analysis.deviation) > 15) {
    alerts.push({
      type: 'route_deviation',
      message: `Route deviation of ${analysis.deviation.toFixed(1)}%`,
      severity: Math.abs(analysis.deviation) > 25 ? 'high' : 'medium',
      details: `Trip took ${Math.abs(analysis.deviation).toFixed(1)}% ${analysis.deviation > 0 ? 'more' : 'less'} distance than expected.`
    });
  }

  // Check for mileage anomalies
  await checkMileageAnomaly(trip);
  
  return alerts;
};

export const processAlertAction = async (
  alertId: string, 
  action: 'accept' | 'deny' | 'ignore', 
  reason?: string, 
  duration?: 'week' | 'permanent'
) => {
  const status = action === 'accept' ? 'accepted' : action === 'deny' ? 'denied' : 'ignored';
  
  const { error } = await supabase
    .from('ai_alerts')
    .update({
      status,
      metadata: {
        action_reason: reason,
        ignore_duration: duration
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error processing alert action:', error);
  }
};

export default {
  analyzeTripAndGenerateAlerts,
  processAlertAction,
  getAIAlerts,
  checkMileageAnomaly
};