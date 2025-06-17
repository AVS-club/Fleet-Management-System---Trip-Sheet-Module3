import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

console.log('▶️ Script started');
// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;


// ✅ DEBUG: Confirm if ENV is loaded properly
console.log('Supabase URL:', supabaseUrl);
console.log('Key present?: ', supabaseAnonKey);
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedDriver() {
  console.log('Starting driver seeding process...');
  
  // Map the provided driver data to match our database schema
  const driverData = {
    name: "Ravi Shankar",
    license_number: "MH20LS7823",
    contact_number: "9876543210",
    email: "ravi.shankar@example.com", 
    join_date: "2023-08-15",
    status: "active",
    experience_years: 5, 
    documents_verified: true,
    driver_photo_url: "https://example.com/photos/ravi_shankar.jpg",
    license_expiry_date: "2026-08-14"
  };

  try {
    // Insert the driver into the database
    const { data, error } = await supabase
      .from('drivers')
      .insert(driverData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting driver:', error);
      return;
    }

    console.log('✅ Driver seeded successfully!');
    console.log('Driver ID:', data.id);
    console.log('Driver Name:', data.name);
    console.log('License Number:', data.license_number);
    
    // Create a driver profile in storage
    await createDriverProfile(data.id, data);
    
    console.log('✅ Driver profile created in storage');
    
  } catch (error) {
    console.error('Unexpected error during driver seeding:', error);
  }
}

// Helper function to create a driver profile in storage
async function createDriverProfile(driverId: string, driverData: any): Promise<void> {
  const profileData = {
    id: driverData.id,
    name: driverData.name,
    license_number: driverData.license_number,
    contact_number: driverData.contact_number,
    email: driverData.email,
    join_date: driverData.join_date,
    status: driverData.status,
    experience_years: driverData.experience_years,
    documents_verified: driverData.documents_verified,
    driver_photo_url: driverData.driver_photo_url,
    created_at: driverData.created_at,
    updated_at: driverData.updated_at,
    generated_at: new Date().toISOString()
  };

  const { error } = await supabase.storage
    .from('driver-profiles')
    .upload(`${driverId}.json`, JSON.stringify(profileData, null, 2), {
      contentType: 'application/json',
      upsert: true
    });

  if (error) {
    console.error('Error uploading driver profile:', error);
    throw error;
  }
}

// Run the seed function
seedDriver()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });