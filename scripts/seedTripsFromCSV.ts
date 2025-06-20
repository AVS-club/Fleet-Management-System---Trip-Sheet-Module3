import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Papa from 'papaparse';

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTripsFromCSV() {
  console.log('Starting trip import from CSV data...');
  
  // Read the CSV file
  const csvPath = path.resolve(__dirname, '../data/AVS_Trip_Seed_Data.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse the CSV data
  const { data, errors } = Papa.parse(csvData, { 
    header: true, 
    skipEmptyLines: true,
    dynamicTyping: true // Automatically convert numeric values
  });
  
  if (errors.length > 0) {
    console.error('Errors parsing CSV:', errors);
    process.exit(1);
  }
  
  console.log(`Found ${data.length} trips in CSV`);

  // Fetch necessary maps from the database
  const { data: vehicles, error: vehiclesError } = await supabase.from('vehicles').select('id, registration_number');
  const { data: drivers, error: driversError } = await supabase.from('drivers').select('id, name');
  const { data: warehouses, error: warehousesError } = await supabase.from('warehouses').select('id, name');
  const { data: destinations, error: destinationsError } = await supabase.from('destinations').select('id, name');
  const { data: materialTypes, error: materialTypesError } = await supabase.from('material_types').select('id, name');

  if (vehiclesError || driversError || warehousesError || destinationsError || materialTypesError) {
    console.error('Error fetching lookup data:', vehiclesError || driversError || warehousesError || destinationsError || materialTypesError);
    process.exit(1);
  }

  if (!vehicles || !drivers || !warehouses || !destinations || !materialTypes) {
    console.error('Lookup data not found. Ensure vehicles, drivers, warehouses, destinations, and material_types tables are populated.');
    process.exit(1);
  }

  const vehicleMap = new Map(vehicles.map(v => [v.registration_number, v.id]));
  const driverMap = new Map(drivers.map(d => [d.name, d.id]));
  const warehouseMap = new Map(warehouses.map(w => [w.name, w.id]));
  const destinationMap = new Map(destinations.map(d => [d.name, d.id]));
  const materialTypeMap = new Map(materialTypes.map(mt => [mt.name.toLowerCase(), mt.id]));

  // Map CSV data to database schema
  const mappedTrips = data.map(trip => {
    const vehicle_id = vehicleMap.get(trip.vehicle_number);
    const driver_id = driverMap.get(trip.driver_name);
    
    // Map origin to warehouse
    const warehouse_id = warehouseMap.get(trip.origin);
    
    // Map destinations
    const destinationNames = trip.destinations.split(',').map(d => d.trim());
    const destination_ids = destinationNames.map(name => destinationMap.get(name)).filter(Boolean);
    
    // Map material types
    const materialNames = trip.material_carried ? trip.material_carried.split(',').map(m => m.trim()) : [];
    const material_type_ids = materialNames.map(name => {
      // Try to find a matching material type
      for (const [key, value] of materialTypeMap.entries()) {
        if (name.toLowerCase().includes(key)) {
          return value;
        }
      }
      return null;
    }).filter(Boolean);

    // Basic validation for required foreign keys
    if (!vehicle_id) console.warn(`Warning: Vehicle ID not found for ${trip.vehicle_number}`);
    if (!driver_id) console.warn(`Warning: Driver ID not found for ${trip.driver_name}`);
    if (!warehouse_id) console.warn(`Warning: Warehouse ID not found for ${trip.origin}`);
    if (destination_ids.length === 0) console.warn(`Warning: No destination IDs found for trip ${trip.trip_id}`);

    // Calculate values
    const distance = trip.distance_km || (trip.end_km - trip.start_km);
    const calculated_kmpl = (trip.refueling_trip && trip.fuel_liters && trip.fuel_liters > 0 && distance > 0)
      ? parseFloat((distance / trip.fuel_liters).toFixed(2))
      : null;
    
    const total_fuel_cost = trip.fuel_amount || (trip.fuel_liters && trip.fuel_cost ? trip.fuel_liters * trip.fuel_cost : 0);
    
    const total_road_expenses = (
      (trip.unloading_expense || 0) + 
      (trip.driver_bata || 0) + 
      (trip.rto_expense || 0) + 
      (trip.breakdown_expense || 0)
    );

    return {
      id: trip.trip_id, // Use existing ID from CSV
      trip_serial_number: `TRP-${trip.trip_id.substring(0, 8).toUpperCase()}`, // Generate trip ID from UUID
      vehicle_id: vehicle_id,
      driver_id: driver_id,
      warehouse_id: warehouse_id,
      destinations: destination_ids, // Array of UUIDs
      trip_start_date: trip.start_date,
      trip_end_date: trip.end_date,
      trip_duration: Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60)), // Duration in hours
      manual_trip_id: false,
      start_km: trip.start_km,
      end_km: trip.end_km,
      gross_weight: 5000, // Default value as it's not in CSV
      station: null, // Not in CSV
      refueling_done: trip.refueling_trip,
      fuel_quantity: trip.fuel_liters,
      fuel_cost: trip.fuel_amount ? (trip.fuel_amount / trip.fuel_liters) : null,
      total_fuel_cost: total_fuel_cost,
      unloading_expense: trip.unloading_expense || 0,
      driver_expense: trip.driver_bata || 0,
      road_rto_expense: trip.rto_expense || 0,
      breakdown_expense: trip.breakdown_expense || 0,
      total_road_expenses: total_road_expenses,
      short_trip: distance < 100, // Assume short trip if distance < 100km
      remarks: null, // Not in CSV
      calculated_kmpl: calculated_kmpl,
      route_deviation: null, // Not in CSV
      material_type_ids: material_type_ids.length > 0 ? material_type_ids : null,
      estimated_toll_cost: null, // Not in CSV
      is_return_trip: trip.return_trip,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  // Insert trips in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < mappedTrips.length; i += BATCH_SIZE) {
    const batch = mappedTrips.slice(i, i + BATCH_SIZE);
    
    console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(mappedTrips.length/BATCH_SIZE)}`);
    
    const { data: insertedData, error } = await supabase
      .from('trips')
      .upsert(batch, { onConflict: 'id' })
      .select();
    
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
    } else {
      console.log(`Successfully inserted/updated ${insertedData?.length || 0} trips in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
    }
    
    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Trip import completed!');
  console.log(`Attempted to insert/update ${mappedTrips.length} trips.`);
}

// Run the seed function
seedTripsFromCSV()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });