import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid'; // Import nanoid for unique IDs

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the JSON data
import fs from 'fs';
import path from 'path';

const tripJsonPath = path.resolve(__dirname, '../data/finalTripSeedData.json');
const jsonRaw = fs.readFileSync(tripJsonPath, 'utf-8');
const tripData = JSON.parse(jsonRaw);
async function seedTripsFromJSON() {
  console.log('Starting trip seeding process...');

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

  const mappedTrips = tripData.map(trip => {
    const vehicle_id = vehicleMap.get(trip.vehicle_number);
    const driver_id = driverMap.get(trip.driver_name);
    const warehouse_id = warehouseMap.get(trip.warehouse_name);
    const destination_ids = trip.destination_names.map((name) => destinationMap.get(name)).filter(Boolean);
    const material_type_ids = trip.material_type_names?.map((name) => materialTypeMap.get(name.toLowerCase())).filter(Boolean);

    // Basic validation for required foreign keys
    if (!vehicle_id) console.warn(`Warning: Vehicle ID not found for ${trip.vehicle_number}`);
    if (!driver_id) console.warn(`Warning: Driver ID not found for ${trip.driver_name}`);
    if (!warehouse_id) console.warn(`Warning: Warehouse ID not found for ${trip.warehouse_name}`);
    if (destination_ids.length !== trip.destination_names.length) console.warn(`Warning: Some destination IDs not found for trip ${trip.vehicle_number}`);

    const start_km = parseInt(trip.start_km);
    const end_km = parseInt(trip.end_km);
    const distance = end_km - start_km;
    const calculated_kmpl = (trip.refueling_done && trip.fuel_quantity && trip.fuel_quantity > 0 && distance > 0)
      ? parseFloat((distance / trip.fuel_quantity).toFixed(2))
      : null;
    const total_fuel_cost = (trip.fuel_quantity && trip.fuel_cost) ? (trip.fuel_quantity * trip.fuel_cost) : 0;
    const total_road_expenses = (trip.unloading_expense || 0) + (trip.driver_expense || 0) + (trip.road_rto_expense || 0) + (trip.breakdown_expense || 0);

    return {
      trip_serial_number: `TRP-${nanoid(8).toUpperCase()}`, // Generate unique trip ID
      vehicle_id: vehicle_id,
      driver_id: driver_id,
      warehouse_id: warehouse_id,
      destinations: destination_ids, // Array of UUIDs
      trip_start_date: trip.trip_start_date,
      trip_end_date: trip.trip_end_date,
      trip_duration: Math.round((new Date(trip.trip_end_date).getTime() - new Date(trip.trip_start_date).getTime()) / (1000 * 60)), // Duration in minutes
      manual_trip_id: false,
      start_km: start_km,
      end_km: end_km,
      gross_weight: parseFloat(trip.gross_weight),
      station: trip.station || null,
      refueling_done: trip.refueling_done,
      fuel_quantity: trip.fuel_quantity ? parseFloat(trip.fuel_quantity) : null,
      fuel_cost: trip.fuel_cost ? parseFloat(trip.fuel_cost) : null,
      total_fuel_cost: total_fuel_cost,
      unloading_expense: parseFloat(trip.unloading_expense || 0),
      driver_expense: parseFloat(trip.driver_expense || 0),
      road_rto_expense: parseFloat(trip.road_rto_expense || 0),
      breakdown_expense: parseFloat(trip.breakdown_expense || 0),
      total_road_expenses: total_road_expenses,
      short_trip: trip.short_trip,
      remarks: trip.remarks || null,
      calculated_kmpl: calculated_kmpl,
      route_deviation: null, // Can be calculated later if needed
      fuel_bill_url: null, // Assuming no fuel bill URLs in JSON
      material_type_ids: material_type_ids,
      estimated_toll_cost: null, // Can be estimated later
      is_return_trip: trip.is_return_trip,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  const BATCH_SIZE = 25;
  for (let i = 0; i < mappedTrips.length; i += BATCH_SIZE) {
    const batch = mappedTrips.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('trips').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
    } else {
      console.log(`Inserted batch ${Math.floor(i/BATCH_SIZE) + 1}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Trip seeding complete.');
}

seedTripsFromJSON()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });