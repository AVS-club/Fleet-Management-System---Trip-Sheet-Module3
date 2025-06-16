import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { nanoid } from 'nanoid';

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

// Warehouse and destination IDs will be fetched from the database
let warehouseIds: string[] = [];
let destinationIds: string[] = [];
let driverId: string = '';
let vehicleId: string = '';
let materialTypeIds: string[] = [];

// Constants for trip generation
const startOdometer = 143500;
const totalTrips = 200;
const trips = [];
let currentKm = startOdometer;
const today = new Date();
const tripStartDate = new Date("2024-05-05");

async function fetchRequiredData() {
  console.log('Fetching required data from database...');
  
  // Fetch warehouses
  const { data: warehouses, error: warehouseError } = await supabase
    .from('warehouses')
    .select('id, name')
    .limit(5);
  
  if (warehouseError) {
    console.error('Error fetching warehouses:', warehouseError);
    process.exit(1);
  }
  
  if (!warehouses || warehouses.length === 0) {
    console.error('No warehouses found. Please add warehouses first.');
    process.exit(1);
  }
  
  warehouseIds = warehouses.map(w => w.id);
  console.log(`Found ${warehouseIds.length} warehouses`);
  
  // Fetch destinations
  const { data: destinations, error: destinationError } = await supabase
    .from('destinations')
    .select('id, name')
    .limit(10);
  
  if (destinationError) {
    console.error('Error fetching destinations:', destinationError);
    process.exit(1);
  }
  
  if (!destinations || destinations.length === 0) {
    console.error('No destinations found. Please add destinations first.');
    process.exit(1);
  }
  
  destinationIds = destinations.map(d => d.id);
  console.log(`Found ${destinationIds.length} destinations`);
  
  // Fetch vehicle ID for MH12AV1001
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('registration_number', 'MH12AV1001')
    .single();
  
  if (vehicleError) {
    console.error('Error fetching vehicle:', vehicleError);
    console.error('Make sure vehicle with registration number MH12AV1001 exists');
    process.exit(1);
  }
  
  vehicleId = vehicle.id;
  console.log(`Found vehicle ID: ${vehicleId}`);
  
  // Fetch a driver
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('id')
    .limit(1)
    .single();
  
  if (driverError) {
    console.error('Error fetching driver:', driverError);
    console.error('Make sure at least one driver exists in the database');
    process.exit(1);
  }
  
  driverId = driver.id;
  console.log(`Found driver ID: ${driverId}`);
  
  // Fetch material types
  const { data: materials, error: materialsError } = await supabase
    .from('material_types')
    .select('id')
    .limit(3);
  
  if (materialsError) {
    console.error('Error fetching material types:', materialsError);
  }
  
  if (materials && materials.length > 0) {
    materialTypeIds = materials.map(m => m.id);
    console.log(`Found ${materialTypeIds.length} material types`);
  } else {
    console.log('No material types found. Trips will be created without material types.');
  }
}

async function generateTrips() {
  console.log('Generating trips...');
  
  for (let i = 0; i < totalTrips; i++) {
    // Skip 4-5 random blocks for maintenance
    if (i % 40 === 0) {
      tripStartDate.setDate(tripStartDate.getDate() + 3); // Maintenance window
    }

    const tripDays = Math.floor(Math.random() * 2) + 1; // 1-2 day trips
    const startDate = new Date(tripStartDate);
    const endDate = new Date(tripStartDate);
    endDate.setDate(startDate.getDate() + tripDays);

    // Skip if we've gone past today
    if (startDate > today) {
      console.log(`Stopping at trip ${i} as we've reached today's date`);
      break;
    }

    const warehouseId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
    
    // Select 1-2 random destinations
    const numDestinations = Math.random() > 0.7 ? 2 : 1;
    const tripDestinations = [];
    for (let j = 0; j < numDestinations; j++) {
      const destId = destinationIds[Math.floor(Math.random() * destinationIds.length)];
      if (!tripDestinations.includes(destId)) {
        tripDestinations.push(destId);
      }
    }

    const distance = Math.floor(Math.random() * 150) + 400; // 400–550 km
    const fuelUsed = distance / (7 + Math.random()); // ~7.5 kmpl with variation
    const refuelingDone = i % Math.floor(Math.random() * 3 + 4) === 0; // Every 4-6 trips
    const grossWeight = Math.floor(Math.random() * 800) + 2000; // 2000–2800 kg
    
    // Calculate expenses
    const unloadingExpense = Math.floor(Math.random() * 300) + 300;
    const driverExpense = Math.floor(Math.random() * 200) + 400;
    const roadRtoExpense = Math.random() > 0.85 ? 250 : 0;
    const breakdownExpense = Math.random() > 0.95 ? 500 : 0;
    const totalRoadExpenses = unloadingExpense + driverExpense + roadRtoExpense + breakdownExpense;
    
    // Generate trip serial number
    const tripSerialNumber = `T${String(i + 1).padStart(4, '0')}`;
    
    // Select random material types (0-2)
    const selectedMaterialTypes = [];
    if (materialTypeIds.length > 0) {
      const numMaterials = Math.floor(Math.random() * 3); // 0-2 materials
      for (let j = 0; j < numMaterials; j++) {
        const materialId = materialTypeIds[Math.floor(Math.random() * materialTypeIds.length)];
        if (!selectedMaterialTypes.includes(materialId)) {
          selectedMaterialTypes.push(materialId);
        }
      }
    }

    const trip = {
      id: nanoid(),
      trip_serial_number: tripSerialNumber,
      vehicle_id: vehicleId,
      driver_id: driverId,
      warehouse_id: warehouseId,
      destinations: tripDestinations,
      trip_start_date: startDate.toISOString(),
      trip_end_date: endDate.toISOString(),
      trip_duration: tripDays,
      manual_trip_id: false,
      start_km: currentKm,
      end_km: currentKm + distance,
      gross_weight: grossWeight,
      station: null,
      refueling_done: refuelingDone,
      fuel_quantity: refuelingDone ? Number(fuelUsed.toFixed(2)) : null,
      fuel_cost: refuelingDone ? 96 + Math.random() * 4 : null, // 96-100 per liter
      total_fuel_cost: refuelingDone ? Number((fuelUsed * (96 + Math.random() * 4)).toFixed(2)) : null,
      unloading_expense: unloadingExpense,
      driver_expense: driverExpense,
      road_rto_expense: roadRtoExpense,
      breakdown_expense: breakdownExpense,
      total_road_expenses: totalRoadExpenses,
      short_trip: distance < 100, // Short trips are less than 100km
      remarks: "Routine trip",
      calculated_kmpl: refuelingDone ? Number((distance / fuelUsed).toFixed(2)) : null,
      route_deviation: Math.random() > 0.8 ? (Math.random() * 20 - 10) : null, // 20% chance of deviation
      material_type_ids: selectedMaterialTypes.length > 0 ? selectedMaterialTypes : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    trips.push(trip);
    currentKm += distance;
    tripStartDate.setDate(tripStartDate.getDate() + tripDays + 1);
  }
  
  console.log(`Generated ${trips.length} trips`);
}

async function seedTrips() {
  console.log('Seeding trips to database...');
  
  // Insert trips in batches of 20 to avoid rate limits
  const batchSize = 20;
  let successCount = 0;
  
  for (let i = 0; i < trips.length; i += batchSize) {
    const batch = trips.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(trips.length / batchSize)}`);
    
    const { data, error } = await supabase
      .from('trips')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      successCount += batch.length;
      console.log(`Successfully inserted batch ${i / batchSize + 1}`);
    }
    
    // Add a small delay between batches to avoid rate limits
    if (i + batchSize < trips.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ Successfully seeded ${successCount} trips for MH12AV1001`);
}

async function main() {
  try {
    await fetchRequiredData();
    await generateTrips();
    await seedTrips();
  } catch (error) {
    console.error('Error in seeding process:', error);
    process.exit(1);
  }
}

main();