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

async function fetchDrivers() {
  console.log('Fetching drivers from database...');
  
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No drivers found in the database.');
      return;
    }
    
    console.log(`Found ${data.length} drivers:`);
    console.log('----------------------------');
    
    data.forEach((driver, index) => {
      console.log(`Driver #${index + 1}:`);
      console.log(`ID: ${driver.id}`);
      console.log(`Name: ${driver.name}`);
      console.log(`License: ${driver.license_number}`);
      console.log(`Contact: ${driver.contact_number}`);
      console.log(`Email: ${driver.email || 'Not provided'}`);
      console.log(`Status: ${driver.status}`);
      console.log(`Experience: ${driver.experience_years} years`);
      console.log(`Join Date: ${new Date(driver.join_date).toLocaleDateString()}`);
      
      if (driver.primary_vehicle_id) {
        console.log(`Primary Vehicle ID: ${driver.primary_vehicle_id}`);
      }
      
      if (driver.driver_photo_url) {
        console.log(`Photo URL: ${driver.driver_photo_url}`);
      }
      
      console.log('----------------------------');
    });
    
  } catch (error) {
    console.error('Error fetching drivers:', error);
  }
}

// Run the fetch function
fetchDrivers()
  .then(() => {
    console.log('Fetch completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });