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

// Map vehicle type from JSON format (e.g., 'Truck') to database enum value
function mapVehicleType(jsonType: string): 'truck' | 'tempo' | 'trailer' | 'pickup' | 'van' {
  const type = jsonType.trim().toLowerCase();
  if (type === 'truck') return 'truck';
  if (type === 'tempo') return 'tempo';
  if (type === 'trailer') return 'trailer';
  // Add other types if necessary, or default
  return 'truck'; // Default
}

// Map fuel type from JSON to database enum value
function mapFuelType(jsonFuelType: string): 'diesel' | 'petrol' | 'cng' | 'ev' {
  const type = jsonFuelType.trim().toLowerCase();
  if (type === 'diesel') return 'diesel';
  if (type === 'petrol') return 'petrol';
  if (type === 'cng') return 'cng';
  if (type === 'ev') return 'ev';
  return 'diesel'; // Default
}

// Map status from JSON to database enum value
function mapStatus(jsonStatus: string): 'active' | 'maintenance' | 'inactive' | 'stood' | 'archived' {
  const status = jsonStatus.trim().toLowerCase();
  if (status === 'active') return 'active';
  if (status === 'maintenance') return 'maintenance';
  if (status === 'inactive') return 'inactive';
  if (status === 'stood') return 'stood';
  if (status === 'archived') return 'archived';
  return 'active'; // Default
}

// Map permit type from JSON to database enum value
function mapPermitType(jsonPermitType: string): 'national' | 'state' | 'contract' | 'tourist' {
  const type = jsonPermitType.trim().toLowerCase();
  if (type === 'national') return 'national';
  if (type === 'state') return 'state';
  if (type === 'contract') return 'contract';
  if (type === 'tourist') return 'tourist';
  return 'national'; // Default
}

async function seedVehiclesFromJSON() {
  console.log('Starting vehicle import from JSON data...');
  
  // The JSON data provided in the prompt
  const jsonData = [
    {
      "vehicle_number": "MH04KL5678",
      "chassis_number": "MBBZHMH3123003",
      "engine_number": "OM926MH3123003",
      "make": "BharatBenz",
      "model": "3123R",
      "year": 2025,
      "owner_name": "Auto Vital Solution",
      "vehicle_type": "Truck",
      "fuel_type": "Diesel",
      "tyre_size": "295/80 R22.5",
      "number_of_tyres": 10,
      "registration_date": "2025-06-20",
      "rc_expiry_date": null,
      "current_odometer": 18350,
      "status": "Active",
      "insurance_policy_number": "POLMH123456789",
      "insurer_name": "ICICI Lombard",
      "insurance_start_date": "2025-06-20",
      "insurance_expiry_date": "2026-06-20",
      "insurance_premium_amount": 48000,
      "insurance_idv_amount": 1750000,
      "fitness_certificate_number": "FCMH123456789",
      "fitness_issue_date": "2025-06-20",
      "fitness_expiry_date": "2027-06-20",
      "fitness_cost": 3000,
      "tax_receipt_number": "TRMH123456789",
      "tax_amount": 16000,
      "tax_scope": "National",
      "tax_paid_upto": "2026-06-20",
      "permit_number": "PERMH123456789",
      "permit_issuing_state": "Maharashtra",
      "permit_type": "National",
      "permit_issue_date": "2025-06-20",
      "permit_expiry_date": "2030-06-20",
      "permit_cost": 10000,
      "puc_certificate_number": "PUCMH123456789",
      "puc_issue_date": "2025-06-20",
      "puc_expiry_date": "2026-06-20",
      "puc_cost": 500,
      "financer": "HDFC Bank",
      "vehicle_class": "HMV",
      "color": "White",
      "cubic_capacity": 7200,
      "cylinders": 6,
      "unladen_weight": 10500,
      "seating_capacity": 2,
      "emission_norms": "BS6"
    },
    {
      "vehicle_number": "MP09KV1123",
      "chassis_number": "MBBZHMP3123002",
      "engine_number": "OM926MP3123002",
      "make": "BharatBenz",
      "model": "3123R",
      "year": 2022,
      "owner_name": "Auto Vital Solution",
      "vehicle_type": "Truck",
      "fuel_type": "Diesel",
      "tyre_size": "295/80 R22.5",
      "number_of_tyres": 10,
      "registration_date": "2022-01-14",
      "rc_expiry_date": null,
      "current_odometer": 72300,
      "status": "Active",
      "insurance_policy_number": "POLMP123456789",
      "insurer_name": "Bajaj Allianz",
      "insurance_start_date": "2025-01-14",
      "insurance_expiry_date": "2026-01-14",
      "insurance_premium_amount": 46000,
      "insurance_idv_amount": 1520000,
      "fitness_certificate_number": "FCMP123456789",
      "fitness_issue_date": "2022-01-14",
      "fitness_expiry_date": "2024-01-14",
      "fitness_cost": 3200,
      "tax_receipt_number": "TRMP123456789",
      "tax_amount": 14500,
      "tax_scope": "National",
      "tax_paid_upto": "2023-01-14",
      "permit_number": "PERMP123456789",
      "permit_issuing_state": "Madhya Pradesh",
      "permit_type": "National",
      "permit_issue_date": "2022-01-14",
      "permit_expiry_date": "2027-01-14",
      "permit_cost": 10000,
      "puc_certificate_number": "PUCMP123456789",
      "puc_issue_date": "2025-01-14",
      "puc_expiry_date": "2026-01-14",
      "puc_cost": 500,
      "financer": "Sundaram Finance",
      "vehicle_class": "HMV",
      "color": "White",
      "cubic_capacity": 7200,
      "cylinders": 6,
      "unladen_weight": 10200,
      "seating_capacity": 2,
      "emission_norms": "BS6"
    },
    {
      "vehicle_number": "GJ03BW8184",
      "chassis_number": "MBBZHGJ3123001",
      "engine_number": "OM926GJ3123001",
      "make": "BharatBenz",
      "model": "3123R",
      "year": 2021,
      "owner_name": "Auto Vital Solution",
      "vehicle_type": "Truck",
      "fuel_type": "Diesel",
      "tyre_size": "295/80 R22.5",
      "number_of_tyres": 10,
      "registration_date": "2021-04-10",
      "rc_expiry_date": null,
      "current_odometer": 98300,
      "status": "Active",
      "insurance_policy_number": "POLGJ123456789",
      "insurer_name": "Reliance General",
      "insurance_start_date": "2025-04-10",
      "insurance_expiry_date": "2026-04-10",
      "insurance_premium_amount": 45000,
      "insurance_idv_amount": 1380000,
      "fitness_certificate_number": "FCGJ123456789",
      "fitness_issue_date": "2021-04-10",
      "fitness_expiry_date": "2023-04-10",
      "fitness_cost": 2900,
      "tax_receipt_number": "TRGJ123456789",
      "tax_amount": 15500,
      "tax_scope": "National",
      "tax_paid_upto": "2022-04-10",
      "permit_number": "PERGJ123456789",
      "permit_issuing_state": "Gujarat",
      "permit_type": "National",
      "permit_issue_date": "2021-04-10",
      "permit_expiry_date": "2026-04-10",
      "permit_cost": 10000,
      "puc_certificate_number": "PUCGJ123456789",
      "puc_issue_date": "2025-04-10",
      "puc_expiry_date": "2026-04-10",
      "puc_cost": 500,
      "financer": "Tata Capital",
      "vehicle_class": "HMV",
      "color": "White",
      "cubic_capacity": 7200,
      "cylinders": 6,
      "unladen_weight": 10300,
      "seating_capacity": 2,
      "emission_norms": "BS6"
    }
  ];
  
  console.log(`Found ${jsonData.length} vehicles in JSON`);

  // Map JSON data to database schema
  const mappedVehicles = jsonData.map((row: any) => {
    const now = new Date().toISOString();
    return {
      registration_number: row.vehicle_number,
      chassis_number: row.chassis_number,
      engine_number: row.engine_number,
      make: row.make,
      model: row.model,
      year: row.year,
      owner_name: row.owner_name,
      type: mapVehicleType(row.vehicle_type),
      fuel_type: mapFuelType(row.fuel_type),
      tyre_size: row.tyre_size,
      number_of_tyres: row.number_of_tyres,
      registration_date: row.registration_date,
      rc_expiry_date: row.rc_expiry_date,
      current_odometer: row.current_odometer,
      status: mapStatus(row.status),
      
      // Document flags (assuming data presence means document exists)
      rc_copy: true,
      insurance_document: true,
      fitness_document: true,
      tax_receipt_document: true,
      permit_document: true,
      puc_document: true,

      // Insurance details
      policy_number: row.insurance_policy_number,
      insurer_name: row.insurer_name,
      insurance_start_date: row.insurance_start_date,
      insurance_expiry_date: row.insurance_expiry_date,
      insurance_premium_amount: row.insurance_premium_amount,
      insurance_idv: row.insurance_idv_amount,
      
      // Fitness certificate
      fitness_certificate_number: row.fitness_certificate_number,
      fitness_issue_date: row.fitness_issue_date,
      fitness_expiry_date: row.fitness_expiry_date,
      fitness_cost: row.fitness_cost,
      
      // Tax details
      tax_receipt_number: row.tax_receipt_number,
      tax_amount: row.tax_amount,
      tax_scope: row.tax_scope,
      tax_paid_upto: row.tax_paid_upto,
      
      // Permit details
      permit_number: row.permit_number,
      permit_issuing_state: row.permit_issuing_state,
      permit_type: mapPermitType(row.permit_type),
      permit_issue_date: row.permit_issue_date,
      permit_expiry_date: row.permit_expiry_date,
      permit_cost: row.permit_cost,
      
      // PUC details
      puc_certificate_number: row.puc_certificate_number,
      puc_issue_date: row.puc_issue_date,
      puc_expiry_date: row.puc_expiry_date,
      puc_cost: row.puc_cost,
      
      // Other VAHAN data
      financer: row.financer,
      vehicle_class: row.vehicle_class,
      color: row.color,
      cubic_capacity: row.cubic_capacity,
      cylinders: row.cylinders,
      unladen_weight: row.unladen_weight,
      seating_capacity: row.seating_capacity,
      emission_norms: row.emission_norms,
      
      // Reminder flags (default to false)
      remind_insurance: false,
      remind_fitness: false,
      remind_puc: false,
      remind_tax: false,
      remind_permit: false,
      remind_service: false,
      
      // Default values for other fields not in JSON
      photo_url: null,
      other_documents: [],
      primary_driver_id: null,
      vahan_last_fetched_at: now,
      
      created_at: now,
      updated_at: now,
    };
  });

  // Insert the mapped vehicles in batches
  const BATCH_SIZE = 5; // Adjust based on your needs
  
  for (let i = 0; i < mappedVehicles.length; i += BATCH_SIZE) {
    const batch = mappedVehicles.slice(i, i + BATCH_SIZE);
    
    console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(mappedVehicles.length/BATCH_SIZE)}`);
    
    const { data: insertedData, error } = await supabase
      .from('vehicles')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
    } else {
      console.log(`Successfully inserted ${insertedData?.length || 0} vehicles in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
    }
    
    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('Vehicle import completed!');
  console.log(`Attempted to insert ${mappedVehicles.length} vehicles.`);
}

// Run the seed function
seedVehiclesFromJSON()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });