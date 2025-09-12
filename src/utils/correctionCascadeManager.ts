import { supabase } from './supabaseClient';

interface CascadeCorrection {
  tripId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

interface CascadeResult {
  success: boolean;
  affectedTrips: Array<{
    trip_id: string;
    old_value: any;
    new_value: any;
  }>;
  error?: string;
}

export class CorrectionCascadeManager {
  static async cascadeOdometerCorrection(
    tripId: string,
    newEndKm: number,
    reason: string
  ): Promise<CascadeResult> {
    try {
      // Use atomic RPC function for proper transaction handling
      const { data: affectedTrips, error } = await supabase
        .rpc('cascade_odometer_correction_atomic', {
          p_trip_id: tripId,
          p_new_end_km: newEndKm,
          p_correction_reason: reason
        });
      
      if (error) throw error;
      
      return {
        success: true,
        affectedTrips: (affectedTrips || []).map((trip: any) => ({
          trip_id: trip.affected_trip_id,
          old_value: `${trip.old_start_km}-${trip.old_end_km}`,
          new_value: `${trip.new_start_km}-${trip.new_end_km}`
        }))
      };
    } catch (error) {
      console.error('Cascade correction failed:', error);
      return {
        success: false,
        affectedTrips: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async recalculateAffectedMileage(
    vehicleId: string,
    fromTripId: string
  ): Promise<void> {
    try {
      // Get the trip date
      const { data: trip } = await supabase
        .from('trips')
        .select('trip_end_date')
        .eq('id', fromTripId)
        .single();
      
      if (!trip) return;
      
      // Get all refueling trips after this date
      const { data: refuelingTrips } = await supabase
        .from('trips')
        .select('id, start_km, end_km, fuel_quantity')
        .eq('vehicle_id', vehicleId)
        .eq('refueling_done', true)
        .gte('trip_end_date', trip.trip_end_date)
        .order('trip_end_date');
      
      // Recalculate mileage for each refueling trip
      for (const refuelTrip of refuelingTrips || []) {
        const distance = refuelTrip.end_km - refuelTrip.start_km;
        const calculatedKmpl = refuelTrip.fuel_quantity > 0 ? distance / refuelTrip.fuel_quantity : 0;
        
        await supabase
          .from('trips')
          .update({ calculated_kmpl: calculatedKmpl })
          .eq('id', refuelTrip.id);
      }
    } catch (error) {
      console.error('Error recalculating affected mileage:', error);
    }
  }
  
  static async logCorrection(
    tripId: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    reason: string,
    affectsSubsequent: boolean = false
  ): Promise<void> {
    try {
      await supabase
        .from('trip_corrections')
        .insert({
          trip_id: tripId,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          correction_reason: reason,
          affects_subsequent_trips: affectsSubsequent
        });
    } catch (error) {
      console.error('Error logging correction:', error);
    }
  }
  
  static async getCorrectionHistory(tripId: string): Promise<CascadeCorrection[]> {
    try {
      const { data, error } = await supabase
        .from('trip_corrections')
        .select('*')
        .eq('trip_id', tripId)
        .order('corrected_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching correction history:', error);
        return [];
      }
      
      return data.map((correction: any) => ({
        tripId: correction.trip_id,
        fieldName: correction.field_name,
        oldValue: correction.old_value,
        newValue: correction.new_value,
        reason: correction.correction_reason
      }));
    } catch (error) {
      console.error('Error fetching correction history:', error);
      return [];
    }
  }
  
  static async previewCascadeImpact(
    tripId: string,
    newEndKm: number
  ): Promise<Array<{trip_serial_number: string, current_start_km: number, new_start_km: number}>> {
    try {
      // Use server-side preview function for correct query logic
      const { data: previewTrips, error } = await supabase
        .rpc('preview_cascade_impact', {
          p_trip_id: tripId,
          p_new_end_km: newEndKm
        });
      
      if (error) {
        console.error('Error previewing cascade impact:', error);
        return [];
      }
      
      return previewTrips || [];
    } catch (error) {
      console.error('Error previewing cascade impact:', error);
      return [];
    }
  }
}