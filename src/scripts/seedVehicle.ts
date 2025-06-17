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

async function seedVehicle() {
  console.log('Starting vehicle seeding process...');
  
  // Map the provided dummy data to match our database schema
  const vehicleData = {
    registration_number: "MH12AV1001", // from vehicle_number
    chassis_number: "MAT1234567AV4020X",
    engine_number: "ENGMH4020123XYZ",
    make: "Tata Motors",
    model: "1109",
    year: 2022,
    type: "truck", // Lowercase to match enum
    fuel_type: "diesel", // Lowercase to match enum
    tyre_size: "215/75 R15",
    number_of_tyres: 6,
    registration_date: "2022-05-15",
    rc_expiry_date: "2027-05-15",
    current_odometer: 143500,
    status: "active", // Lowercase to match enum
    
    // Insurance details
    policy_number: "POL123456789",
    insurer_name: "ICICI Lombard",
    insurance_start_date: "2024-05-01",
    insurance_expiry_date: "2025-05-01", // Maps to insurance_end_date in the schema
    insurance_premium_amount: 24500, // from premium_amount
    insurance_idv: 450000, // from idv_amount
    
    // Fitness certificate details
    fitness_certificate_number: "FC1109TATA098",
    fitness_issue_date: "2022-05-15",
    fitness_expiry_date: "2026-05-15",
    fitness_cost: 1200,
    
    // Tax details
    tax_receipt_number: "TRMH20240515",
    tax_amount: 5000,
    tax_period: "monthly", // Lowercase to match expected format
    tax_scope: "State",
    
    // Permit details
    permit_number: "PERMH1109001",
    permit_issuing_state: "Maharashtra",
    permit_type: "national", // Lowercase to match expected format
    permit_issue_date: "2022-05-15",
    permit_expiry_date: "2026-05-15",
    permit_cost: 8500,
    
    // PUC details
    puc_certificate_number: "PUCMH20240515",
    puc_issue_date: "2024-05-01",
    puc_expiry_date: "2025-05-01",
    puc_cost: 350,
    
    // Service reminder settings
    remind_service: true, // from service_reminder_enabled
    service_reminder_days_before: 14,
    service_reminder_km: 5000, // from service_reminder_km_before
    
    // Document URLs
    rc_document_url: "https://example.com/docs/rc_MH12AV1001.pdf", // from rc_file_url
    insurance_document_url: "https://example.com/docs/insurance_MH12AV1001.pdf", // from insurance_file_url
    fitness_document_url: "https://example.com/docs/fitness_MH12AV1001.pdf", // from fitness_file_url
    tax_document_url: "https://example.com/docs/tax_MH12AV1001.pdf", // from tax_file_url
    permit_document_url: "https://example.com/docs/permit_MH12AV1001.pdf", // from permit_file_url
    puc_document_url: "https://example.com/docs/puc_MH12AV1001.pdf", // from puc_file_url
    
    // Document flags (set based on document URLs)
    rc_copy: true,
    insurance_document: true,
    fitness_document: true,
    tax_receipt_document: true,
    permit_document: true,
    puc_document: true
  };

  try {
    // Insert the vehicle into the database
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting vehicle:', error);
      return;
    }

    console.log('✅ Vehicle seeded successfully!');
    console.log('Vehicle ID:', data.id);
    console.log('Registration Number:', data.registration_number);
    
    // Create a vehicle profile in storage
    await createVehicleProfile(data.id, data);
    
    console.log('✅ Vehicle profile created in storage');
    
  } catch (error) {
    console.error('Unexpected error during vehicle seeding:', error);
  }
}

// Helper function to create a vehicle profile in storage
async function createVehicleProfile(vehicleId: string, vehicleData: any): Promise<void> {
  const profileData = {
    id: vehicleData.id,
    registration_number: vehicleData.registration_number,
    make: vehicleData.make,
    model: vehicleData.model,
    year: vehicleData.year,
    type: vehicleData.type,
    fuel_type: vehicleData.fuel_type,
    current_odometer: vehicleData.current_odometer,
    status: vehicleData.status,
    chassis_number: vehicleData.chassis_number,
    engine_number: vehicleData.engine_number,
    owner_name: vehicleData.owner_name,
    insurance_end_date: vehicleData.insurance_expiry_date,
    fitness_expiry_date: vehicleData.fitness_expiry_date,
    permit_expiry_date: vehicleData.permit_expiry_date,
    puc_expiry_date: vehicleData.puc_expiry_date,
    created_at: vehicleData.created_at,
    updated_at: vehicleData.updated_at,
    generated_at: new Date().toISOString()
  };

  const { error } = await supabase.storage
    .from('vehicle-profiles')
    .upload(`${vehicleId}.json`, JSON.stringify(profileData, null, 2), {
      contentType: 'application/json',
      upsert: true
    });

  if (error) {
    console.error('Error uploading vehicle profile:', error);
    throw error;
  }
}

// Run the seed function
seedVehicle()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });