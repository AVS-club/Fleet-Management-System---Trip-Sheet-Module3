import { supabase } from '../src/utils/supabaseClient';

// Script to add test trips with anomalies for demonstration
async function addTestAnomalies() {
  try {
    console.log('Adding test trips with anomalies...');

    // Get a sample vehicle ID
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, registration_number')
      .limit(1);

    if (vehicleError || !vehicles || vehicles.length === 0) {
      console.error('No vehicles found:', vehicleError);
      return;
    }

    const vehicleId = vehicles[0].id;
    const vehicleReg = vehicles[0].registration_number;

    console.log(`Using vehicle: ${vehicleReg} (${vehicleId})`);

    // Test trips with various anomalies
    const testTrips = [
      {
        vehicle_id: vehicleId,
        driver_id: '00000000-0000-0000-0000-000000000000', // Default driver
        warehouse_id: '00000000-0000-0000-0000-000000000000', // Default warehouse
        trip_serial_number: 'TEST-ANOMALY-001',
        destinations: ['Test Destination'],
        trip_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        trip_end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        start_km: 1000,
        end_km: 1200, // 200 km distance
        fuel_quantity: 5, // Very high efficiency: 40 km/L
        calculated_kmpl: 40,
        refueling_done: true,
        total_road_expenses: 1000
      },
      {
        vehicle_id: vehicleId,
        driver_id: '00000000-0000-0000-0000-000000000000',
        warehouse_id: '00000000-0000-0000-0000-000000000000',
        trip_serial_number: 'TEST-ANOMALY-002',
        destinations: ['Test Destination 2'],
        trip_start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        trip_end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
        start_km: 1200,
        end_km: 1400, // 200 km distance
        fuel_quantity: 100, // Very poor efficiency: 2 km/L
        calculated_kmpl: 2,
        refueling_done: true,
        total_road_expenses: 2000
      },
      {
        vehicle_id: vehicleId,
        driver_id: '00000000-0000-0000-0000-000000000000',
        warehouse_id: '00000000-0000-0000-0000-000000000000',
        trip_serial_number: 'TEST-ANOMALY-003',
        destinations: ['Test Destination 3'],
        trip_start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        trip_end_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(), // 1 hour later
        start_km: 1400,
        end_km: 2500, // 1100 km distance - excessive
        fuel_quantity: 50,
        calculated_kmpl: 22,
        refueling_done: true,
        total_road_expenses: 3000
      },
      {
        vehicle_id: vehicleId,
        driver_id: '00000000-0000-0000-0000-000000000000',
        warehouse_id: '00000000-0000-0000-0000-000000000000',
        trip_serial_number: 'TEST-ANOMALY-004',
        destinations: ['Test Destination 4'],
        trip_start_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        trip_end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 minutes later
        start_km: 2500,
        end_km: 2700, // 200 km distance
        fuel_quantity: 250, // Excessive fuel
        calculated_kmpl: 0.8,
        refueling_done: true,
        total_road_expenses: 4000
      }
    ];

    // Insert test trips
    const { data: insertedTrips, error: insertError } = await supabase
      .from('trips')
      .insert(testTrips)
      .select();

    if (insertError) {
      console.error('Error inserting test trips:', insertError);
      return;
    }

    console.log(`Successfully added ${insertedTrips?.length || 0} test trips with anomalies:`);
    insertedTrips?.forEach(trip => {
      console.log(`- ${trip.trip_serial_number}: ${trip.calculated_kmpl} km/L, ${trip.end_km - trip.start_km} km, ${trip.fuel_quantity}L fuel`);
    });

    console.log('\nAnomalies to look for:');
    console.log('- TEST-ANOMALY-001: Suspicious efficiency (40 km/L)');
    console.log('- TEST-ANOMALY-002: Poor efficiency (2 km/L)');
    console.log('- TEST-ANOMALY-003: Excessive distance (1100 km)');
    console.log('- TEST-ANOMALY-004: Excessive fuel (250L) and poor efficiency (0.8 km/L)');

  } catch (error) {
    console.error('Error adding test anomalies:', error);
  }
}

// Run the script
addTestAnomalies().then(() => {
  console.log('Test anomaly script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
