import { Trip, RouteAnalysis } from '../types';
import { supabase } from './supabaseClient';

// Get all AI alerts
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

// Generate license expiry alert
export const generateLicenseExpiryAlert = async (
  driverId: string,
  driverName: string,
  daysUntilExpiry: number
) => {
  try {
    // Check if we already have an active alert for this driver's license
    const { data: existingAlerts } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('alert_type', 'license_expiry')
      .eq('affected_entity->>id', driverId)
      .eq('affected_entity->>type', 'driver')
      .in('status', ['pending', 'accepted']);

    // If alert already exists, don't create a new one
    if (existingAlerts && existingAlerts.length > 0) {
      return;
    }

    // Determine severity based on days until expiry
    let severity = 'medium';
    if (daysUntilExpiry <= 0) {
      severity = 'high';
    } else if (daysUntilExpiry <= 7) {
      severity = 'high';
    } else if (daysUntilExpiry <= 15) {
      severity = 'medium';
    }

    // Create alert message based on expiry status
    let title = '';
    let description = '';
    
    if (daysUntilExpiry <= 0) {
      title = `${driverName}'s license has expired`;
      description = `Driver ${driverName}'s license has expired. Please renew the license immediately.`;
    } else {
      title = `${driverName}'s license expiring soon`;
      description = `Driver ${driverName}'s license will expire in ${daysUntilExpiry} days. Please arrange for renewal.`;
    }

    // Create the alert
    const { error } = await supabase.from('ai_alerts').insert({
      alert_type: 'license_expiry',
      severity: severity,
      status: 'pending',
      title: title,
      description: description,
      affected_entity: {
        type: 'driver',
        id: driverId
      },
      metadata: {
        days_until_expiry: daysUntilExpiry,
        recommendations: [
          'Contact the driver immediately',
          'Request them to submit renewal application',
          'Schedule license renewal appointment',
          'Update license document after renewal'
        ]
      }
    });

    if (error) {
      console.error('Error creating license expiry alert:', error);
    }
  } catch (error) {
    console.error('Error in generateLicenseExpiryAlert:', error);
  }
};

// Analyze trip and generate alerts
export const analyzeTripAndGenerateAlerts = (
  trip: Trip,
  analysis: RouteAnalysis | undefined,
  allTrips: Trip[]
): Alert[] => {
  const alerts: Alert[] = [];

  // Route deviation alert
  if (analysis && Math.abs(analysis.deviation) > 15) {
    alerts.push({
      type: 'route_deviation',
      message: 'Significant route deviation detected',
      severity: Math.abs(analysis.deviation) > 25 ? 'high' : 'medium',
      details: `Route shows ${Math.abs(analysis.deviation).toFixed(1)}% deviation from standard distance`
    });
  }

  // Fuel consumption anomaly alert
  if (trip.refueling_done && trip.calculated_kmpl && !trip.short_trip) {
    // Get the average mileage for this vehicle
    const vehicleTrips = allTrips.filter(t => 
      t.vehicle_id === trip.vehicle_id && 
      t.calculated_kmpl && 
      !t.short_trip
    );
    
    const avgMileage = vehicleTrips.length > 0 
      ? vehicleTrips.reduce((sum, t) => sum + (t.calculated_kmpl || 0), 0) / vehicleTrips.length
      : 0;
    
    // If mileage is 20% below average, generate an alert
    if (avgMileage > 0 && trip.calculated_kmpl < avgMileage * 0.8) {
      alerts.push({
        type: 'fuel_anomaly',
        message: 'Low fuel efficiency detected',
        severity: 'medium',
        details: `Fuel efficiency (${trip.calculated_kmpl.toFixed(2)} km/L) is significantly below vehicle average (${avgMileage.toFixed(2)} km/L)`
      });
    }
  }

  return alerts;
};

// Process alert action (accept, deny, ignore)
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
  generateLicenseExpiryAlert
};