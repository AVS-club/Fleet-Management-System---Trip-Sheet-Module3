import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Driver data to seed
const drivers = [
  {
    full_name: "Rajesh Yadav",
    license_number: "MH202567893412",
    contact_number: "9876543210",
    email: "rajesh.yadav@example.com",
    join_date: "2023-08-12",
    experience_years: 5,
    status: "active",
    license_expiry_date: "2026-08-12",
    assigned_vehicle: "MH04KL5678"
  },
  {
    full_name: "Sunita Chauhan",
    license_number: "MP194567882341",
    contact_number: "9876500011",
    email: "sunita.chauhan@example.com",
    join_date: "2024-02-10",
    experience_years: 3,
    status: "active",
    license_expiry_date: "2027-02-10",
    assigned_vehicle: "MP09KV1123"
  },
  {
    full_name: "Imran Shaikh",
    license_number: "GJ205889776543",
    contact_number: "9123456780",
    email: "imran.shaikh@example.com",
    join_date: "2022-11-05",
    experience_years: 4,
    status: "active",
    license_expiry_date: "2025-11-05",
    assigned_vehicle: "GJ03BW8184"
  },
  {
    full_name: "Meena Verma",
    license_number: "MH192345679012",
    contact_number: "9990088001",
    email: "meena.verma@example.com",
    join_date: "2021-06-20",
    experience_years: 6,
    status: "active",
    license_expiry_date: "2026-06-20",
    assigned_vehicle: "MH04KL5678"
  },
  {
    full_name: "Amit Rane",
    license_number: "MP102345671234",
    contact_number: "9812312312",
    email: "amit.rane@example.com",
    join_date: "2023-01-15",
    experience_years: 2,
    status: "active",
    license_expiry_date: "2026-01-15",
    assigned_vehicle: "MP09KV1123"
  }
];

async function seedDrivers() {
  console.log('Starting driver seeding process...');
  
  try {
    // First, fetch all vehicles to get their IDs
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number');
    
    if (vehiclesError) {
      throw new Error(`Error fetching vehicles: ${vehiclesError.message}`);
    }
    
    if (!vehicles || vehicles.length === 0) {
      throw new Error('No vehicles found in the database. Please seed vehicles first.');
    }
    
    console.log(`Found ${vehicles.length} vehicles in the database.`);
    
    // Create a mapping from registration number to vehicle ID
    const vehicleMap = new Map();
    vehicles.forEach(vehicle => {
      vehicleMap.set(vehicle.registration_number, vehicle.id);
    });
    
    // Map driver data to the database schema
    const driversToInsert = drivers.map(driver => {
      const vehicleId = vehicleMap.get(driver.assigned_vehicle);
      
      if (!vehicleId) {
        console.warn(`Warning: Vehicle with registration number ${driver.assigned_vehicle} not found for driver ${driver.full_name}.`);
      }
      
      return {
        name: driver.full_name,
        license_number: driver.license_number,
        contact_number: driver.contact_number,
        email: driver.email,
        join_date: driver.join_date,
        status: driver.status,
        experience_years: driver.experience_years,
        primary_vehicle_id: vehicleId || null,
        license_expiry_date: driver.license_expiry_date,
        documents_verified: false,
        driver_photo_url: null,
        license_doc_url: null,
        aadhar_doc_url: null,
        police_doc_url: null,
        bank_doc_url: null
      };
    });
    
    // Insert drivers in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < driversToInsert.length; i += BATCH_SIZE) {
      const batch = driversToInsert.slice(i, i + BATCH_SIZE);
      
      console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(driversToInsert.length/BATCH_SIZE)}`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('drivers')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.error(`Error inserting batch ${i/BATCH_SIZE + 1}:`, insertError);
      } else {
        console.log(`Successfully inserted ${insertedData?.length || 0} drivers in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Driver seeding completed!');
    console.log(`Attempted to insert ${driversToInsert.length} drivers.`);
    
  } catch (error) {
    console.error('Error seeding drivers:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDrivers()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });