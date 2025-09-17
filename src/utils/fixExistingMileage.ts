import { supabase } from './supabaseClient';
import { Trip } from '@/types';
import { recalculateAllMileageForVehicle } from './mileageRecalculation';

/**
 * Fixes mileage calculations for all existing trips in the database
 * This should be run once to correct existing data
 */
export async function fixAllExistingMileage(): Promise<{ success: boolean; message: string; updatedTrips: number }> {
  try {
    console.log('Starting mileage fix for all existing trips...');
    
    // Get all trips from the database
    const { data: allTrips, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .order('trip_start_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch trips: ${fetchError.message}`);
    }

    if (!allTrips || allTrips.length === 0) {
      return { success: true, message: 'No trips found to fix', updatedTrips: 0 };
    }

    console.log(`Found ${allTrips.length} trips to process`);

    // Group trips by vehicle
    const tripsByVehicle = allTrips.reduce((acc, trip) => {
      if (!acc[trip.vehicle_id]) {
        acc[trip.vehicle_id] = [];
      }
      acc[trip.vehicle_id].push(trip);
      return acc;
    }, {} as Record<string, Trip[]>);

    let totalUpdated = 0;
    const updatePromises: Promise<any>[] = [];

    // Process each vehicle's trips
    Object.entries(tripsByVehicle).forEach(([vehicleId, vehicleTrips]) => {
      console.log(`Processing vehicle ${vehicleId} with ${vehicleTrips.length} trips`);
      
      // Recalculate mileage for this vehicle's trips
      const fixedTrips = recalculateAllMileageForVehicle(vehicleId, allTrips);
      
      // Create update promises for trips that need mileage updates
      fixedTrips.forEach(fixedTrip => {
        const originalTrip = vehicleTrips.find(t => t.id === fixedTrip.id);
        if (originalTrip && originalTrip.calculated_kmpl !== fixedTrip.calculated_kmpl) {
          console.log(`Updating trip ${fixedTrip.trip_serial_number}: ${originalTrip.calculated_kmpl} -> ${fixedTrip.calculated_kmpl}`);
          
          updatePromises.push(
            supabase
              .from('trips')
              .update({ calculated_kmpl: fixedTrip.calculated_kmpl })
              .eq('id', fixedTrip.id)
          );
          totalUpdated++;
        }
      });
    });

    // Execute all updates
    if (updatePromises.length > 0) {
      console.log(`Executing ${updatePromises.length} updates...`);
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Some updates failed:', errors);
        throw new Error(`${errors.length} updates failed`);
      }
    }

    console.log(`Successfully updated ${totalUpdated} trips`);
    return { 
      success: true, 
      message: `Successfully updated mileage for ${totalUpdated} trips`, 
      updatedTrips: totalUpdated 
    };

  } catch (error) {
    console.error('Error fixing existing mileage:', error);
    return { 
      success: false, 
      message: `Error fixing mileage: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      updatedTrips: 0 
    };
  }
}

/**
 * Fixes mileage calculations for a specific vehicle
 */
export async function fixMileageForSpecificVehicle(vehicleId: string): Promise<{ success: boolean; message: string; updatedTrips: number }> {
  try {
    console.log(`Starting mileage fix for vehicle ${vehicleId}...`);
    
    // Get all trips for this vehicle
    const { data: vehicleTrips, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('trip_start_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch trips for vehicle: ${fetchError.message}`);
    }

    if (!vehicleTrips || vehicleTrips.length === 0) {
      return { success: true, message: 'No trips found for this vehicle', updatedTrips: 0 };
    }

    // Get all trips to pass to the recalculation function
    const { data: allTrips } = await supabase
      .from('trips')
      .select('*')
      .order('trip_start_date', { ascending: true });

    // Recalculate mileage for this vehicle's trips
    const fixedTrips = recalculateAllMileageForVehicle(vehicleId, allTrips || []);
    
    let totalUpdated = 0;
    const updatePromises: Promise<any>[] = [];

    // Create update promises for trips that need mileage updates
    fixedTrips.forEach(fixedTrip => {
      const originalTrip = vehicleTrips.find(t => t.id === fixedTrip.id);
      if (originalTrip && originalTrip.calculated_kmpl !== fixedTrip.calculated_kmpl) {
        console.log(`Updating trip ${fixedTrip.trip_serial_number}: ${originalTrip.calculated_kmpl} -> ${fixedTrip.calculated_kmpl}`);
        
        updatePromises.push(
          supabase
            .from('trips')
            .update({ calculated_kmpl: fixedTrip.calculated_kmpl })
            .eq('id', fixedTrip.id)
        );
        totalUpdated++;
      }
    });

    // Execute all updates
    if (updatePromises.length > 0) {
      console.log(`Executing ${updatePromises.length} updates for vehicle ${vehicleId}...`);
      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Some updates failed:', errors);
        throw new Error(`${errors.length} updates failed`);
      }
    }

    console.log(`Successfully updated ${totalUpdated} trips for vehicle ${vehicleId}`);
    return { 
      success: true, 
      message: `Successfully updated mileage for ${totalUpdated} trips in vehicle ${vehicleId}`, 
      updatedTrips: totalUpdated 
    };

  } catch (error) {
    console.error('Error fixing mileage for vehicle:', error);
    return { 
      success: false, 
      message: `Error fixing mileage for vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      updatedTrips: 0 
    };
  }
}
