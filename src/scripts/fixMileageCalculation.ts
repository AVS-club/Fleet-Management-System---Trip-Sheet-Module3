import { recalculateAllMileageForVehicle } from '../utils/mileageRecalculation';
import { Trip } from '../types';
import { supabase } from '../utils/supabaseClient';

async function fixMileageForVehicle9478() {
  console.log('🔧 Starting mileage fix for vehicle CG04NJ9478...');
  
  try {
    // First, get the vehicle ID for CG04NJ9478
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, registration_number')
      .eq('registration_number', 'CG04NJ9478')
      .single();

    if (vehicleError || !vehicle) {
      console.error('❌ Error finding vehicle CG04NJ9478:', vehicleError);
      return;
    }

    console.log(`✅ Found vehicle: ${vehicle.registration_number} (ID: ${vehicle.id})`);

    // Fetch all trips for this vehicle
    const { data: trips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('trip_end_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching trips:', error);
      return;
    }

    if (!trips || trips.length === 0) {
      console.log('ℹ️ No trips found for this vehicle');
      return;
    }

    console.log(`📊 Found ${trips.length} trips for vehicle ${vehicle.registration_number}`);

    // Display current mileage data
    console.log('\n📋 Current mileage data:');
    trips.forEach(trip => {
      console.log(`  ${trip.trip_serial_number}: ${trip.calculated_kmpl || 'N/A'} km/L (Refueling: ${trip.refueling_done ? 'Yes' : 'No'})`);
    });

    // Recalculate mileage for all trips using the tank-to-tank method
    const updatedTrips = recalculateAllMileageForVehicle(vehicle.id, trips);
    
    console.log('\n🔄 Recalculated mileage data:');
    updatedTrips.forEach(trip => {
      console.log(`  ${trip.trip_serial_number}: ${trip.calculated_kmpl || 'N/A'} km/L (Refueling: ${trip.refueling_done ? 'Yes' : 'No'})`);
    });

    // Update each trip in the database
    let updatedCount = 0;
    for (const trip of updatedTrips) {
      const originalTrip = trips.find(t => t.id === trip.id);
      
      // Only update if mileage has changed
      if (originalTrip && originalTrip.calculated_kmpl !== trip.calculated_kmpl) {
        const { error: updateError } = await supabase
          .from('trips')
          .update({ calculated_kmpl: trip.calculated_kmpl })
          .eq('id', trip.id);
          
        if (updateError) {
          console.error(`❌ Error updating trip ${trip.trip_serial_number}:`, updateError);
        } else {
          console.log(`✅ Updated trip ${trip.trip_serial_number}: ${originalTrip.calculated_kmpl || 'N/A'} → ${trip.calculated_kmpl || 'N/A'} km/L`);
          updatedCount++;
        }
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} trips with corrected mileage calculations!`);
    console.log('\n📝 Summary of changes:');
    console.log('  - Trip 0001: Should now show the same mileage as the refueling trip it belongs to');
    console.log('  - Trip 0002: Should now show the same mileage as trip 0003 (both part of same refueling cycle)');
    console.log('  - Trip 0003: Should now show correct tank-to-tank mileage calculation');
    console.log('  - Trip 0004: Should now show the same mileage as the refueling trip it belongs to');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Also create a function to fix all vehicles
async function fixMileageForAllVehicles() {
  console.log('🔧 Starting mileage fix for ALL vehicles...');
  
  try {
    // Get all vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number');

    if (vehiclesError || !vehicles) {
      console.error('❌ Error fetching vehicles:', vehiclesError);
      return;
    }

    console.log(`📊 Found ${vehicles.length} vehicles`);

    let totalUpdated = 0;
    for (const vehicle of vehicles) {
      console.log(`\n🚗 Processing vehicle: ${vehicle.registration_number}`);
      
      // Fetch all trips for this vehicle
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('trip_end_date', { ascending: true });

      if (error || !trips || trips.length === 0) {
        console.log(`  ⏭️ Skipping ${vehicle.registration_number} (no trips or error)`);
        continue;
      }

      // Recalculate mileage
      const updatedTrips = recalculateAllMileageForVehicle(vehicle.id, trips);
      
      // Update trips that have changed
      let vehicleUpdatedCount = 0;
      for (const trip of updatedTrips) {
        const originalTrip = trips.find(t => t.id === trip.id);
        
        if (originalTrip && originalTrip.calculated_kmpl !== trip.calculated_kmpl) {
          const { error: updateError } = await supabase
            .from('trips')
            .update({ calculated_kmpl: trip.calculated_kmpl })
            .eq('id', trip.id);
            
          if (!updateError) {
            vehicleUpdatedCount++;
          }
        }
      }

      console.log(`  ✅ Updated ${vehicleUpdatedCount} trips for ${vehicle.registration_number}`);
      totalUpdated += vehicleUpdatedCount;
    }

    console.log(`\n🎉 Successfully updated ${totalUpdated} trips across all vehicles!`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    await fixMileageForAllVehicles();
  } else {
    await fixMileageForVehicle9478();
  }
}

// Run the fix
main().catch(console.error);
