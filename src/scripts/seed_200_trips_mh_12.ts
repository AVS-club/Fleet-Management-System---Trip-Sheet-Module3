import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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

// Get vehicle ID for MH12AV1001
async function getVehicleId() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id')
    .eq('registration_number', 'MH12AV1001')
    .single();
  
  if (error) {
    console.error('Error fetching vehicle:', error);
    throw error;
  }
  
  return data.id;
}

// Get driver ID for Ravi Yadav or any available driver
async function getDriverId() {
  const { data, error } = await supabase
    .from('drivers')
    .select('id')
    .eq('name', 'Ravi Yadav')
    .single();
  
  if (error) {
    // If Ravi Yadav not found, get any driver
    const { data: anyDriver, error: anyDriverError } = await supabase
      .from('drivers')
      .select('id')
      .limit(1)
      .single();
    
    if (anyDriverError) {
      console.error('Error fetching driver:', anyDriverError);
      throw anyDriverError;
    }
    
    return anyDriver.id;
  }
  
  return data.id;
}

// Get warehouse IDs
async function getWarehouses() {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, name');
  
  if (error) {
    console.error('Error fetching warehouses:', error);
    throw error;
  }
  
  return data;
}

// Get destination IDs
async function getDestinations() {
  const { data, error } = await supabase
    .from('destinations')
    .select('id, name');
  
  if (error) {
    console.error('Error fetching destinations:', error);
    throw error;
  }
  
  return data;
}

// Get material type IDs
async function getMaterialTypes() {
  const { data, error } = await supabase
    .from('material_types')
    .select('id, name');
  
  if (error) {
    console.error('Error fetching material types:', error);
    throw error;
  }
  
  return data;
}

// Generate trip serial number
function generateTripSerialNumber(index: number) {
  return `MH12AV${String(index + 1).padStart(4, '0')}`;
}

async function seedTrips() {
  try {
    console.log('Starting to seed 200 trips for MH12AV1001...');
    
    // Get necessary IDs
    const vehicleId = await getVehicleId();
    const driverId = await getDriverId();
    const warehouses = await getWarehouses();
    const destinations = await getDestinations();
    const materialTypes = await getMaterialTypes();
    
    console.log(`Vehicle ID: ${vehicleId}`);
    console.log(`Driver ID: ${driverId}`);
    console.log(`Found ${warehouses.length} warehouses`);
    console.log(`Found ${destinations.length} destinations`);
    console.log(`Found ${materialTypes.length} material types`);
    
    // Prepare data
    const startOdometer = 143500;
    const totalTrips = 200;
    const trips = [];
    let currentKm = startOdometer;
    const today = new Date();
    const tripStartDate = new Date("2024-05-05");
    
    // Generate trips
    for (let i = 0; i < totalTrips; i++) {
      // Skip 4-5 random blocks for maintenance
      if (i % 40 === 0) {
        tripStartDate.setDate(tripStartDate.getDate() + 3); // Maintenance window
      }
      
      // Skip if we've reached today
      if (tripStartDate > today) {
        break;
      }
      
      const tripDays = Math.floor(Math.random() * 2) + 1; // 1-2 day trips
      const startDate = new Date(tripStartDate);
      const endDate = new Date(tripStartDate);
      endDate.setDate(startDate.getDate() + tripDays);
      
      // Select random warehouse and destination
      const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      
      // Select random material types (1-2)
      const materialTypeCount = Math.floor(Math.random() * 2) + 1;
      const selectedMaterialTypes = [];
      for (let j = 0; j < materialTypeCount && j < materialTypes.length; j++) {
        const randomIndex = Math.floor(Math.random() * materialTypes.length);
        if (!selectedMaterialTypes.includes(materialTypes[randomIndex].id)) {
          selectedMaterialTypes.push(materialTypes[randomIndex].id);
        }
      }
      
      const loadWeight = Math.floor(Math.random() * 800) + 2000; // 2000–2800 kg
      const distance = Math.floor(Math.random() * 150) + 400; // 400–550 km
      const fuelUsed = distance / (7 + Math.random());
      const refuelingDone = i % Math.floor(Math.random() * 3 + 4) === 0;
      
      const trip = {
        trip_serial_number: generateTripSerialNumber(i),
        vehicle_id: vehicleId,
        driver_id: driverId,
        warehouse_id: warehouse.id,
        destinations: [destination.id],
        trip_start_date: startDate.toISOString(),
        trip_end_date: endDate.toISOString(),
        trip_duration: tripDays,
        start_km: currentKm,
        end_km: currentKm + distance,
        gross_weight: loadWeight,
        station: destination.name,
        refueling_done: refuelingDone,
        fuel_quantity: refuelingDone ? Number((fuelUsed + Math.random() * 5).toFixed(2)) : null,
        fuel_cost: refuelingDone ? Number((96 + Math.random() * 4).toFixed(2)) : null,
        total_fuel_cost: refuelingDone ? Number((fuelUsed * (96 + Math.random() * 4)).toFixed(2)) : null,
        unloading_expense: Math.floor(Math.random() * 300) + 300,
        driver_expense: Math.floor(Math.random() * 200) + 400,
        road_rto_expense: Math.random() > 0.85 ? 250 : 0,
        breakdown_expense: Math.random() > 0.95 ? 500 : 0,
        miscellaneous_expense: Math.random() > 0.9 ? Math.floor(Math.random() * 200) : 0,
        total_road_expenses: 0, // Will calculate below
        short_trip: Math.random() > 0.9, // 10% chance of being a short trip
        remarks: "Routine trip",
        material_type_ids: selectedMaterialTypes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Calculate total road expenses
      trip.total_road_expenses = 
        trip.unloading_expense + 
        trip.driver_expense + 
        trip.road_rto_expense + 
        trip.breakdown_expense +
        (trip.miscellaneous_expense || 0);
      
      // Calculate mileage if refueling
      if (refuelingDone && trip.fuel_quantity) {
        trip.calculated_kmpl = Number((distance / trip.fuel_quantity).toFixed(2));
      }
      
      currentKm += distance;
      tripStartDate.setDate(tripStartDate.getDate() + tripDays + 1);
      trips.push(trip);
      
      // Log progress
      if (i % 20 === 0) {
        console.log(`Generated ${i} trips...`);
      }
    }
    
    console.log(`Generated ${trips.length} trips. Inserting into database...`);
    
    // Insert trips in batches to avoid rate limits
    const BATCH_SIZE = 10;
    for (let i = 0; i < trips.length; i += BATCH_SIZE) {
      const batch = trips.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.from('trips').insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      } else {
        console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(trips.length / BATCH_SIZE)}`);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ ${trips.length} trips seeded for MH12AV1001`);
  } catch (error) {
    console.error('Error seeding trips:', error);
  }
}

// Run the seed function
seedTrips()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });