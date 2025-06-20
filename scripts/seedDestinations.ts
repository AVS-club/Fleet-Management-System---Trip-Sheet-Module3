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

// Destination data to seed
const destinations = [
  {
    name: "Jaipur",
    latitude: 26.9124,
    longitude: 75.7873,
    standard_distance: 350,
    estimated_time: "6h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh", // Using chhattisgarh as default state
    active: true
  },
  {
    name: "Surat",
    latitude: 21.1702,
    longitude: 72.8311,
    standard_distance: 400,
    estimated_time: "7h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Indore",
    latitude: 22.7196,
    longitude: 75.8577,
    standard_distance: 300,
    estimated_time: "5h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Nagpur",
    latitude: 21.1458,
    longitude: 79.0882,
    standard_distance: 250,
    estimated_time: "4h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Nashik",
    latitude: 19.9975,
    longitude: 73.7898,
    standard_distance: 380,
    estimated_time: "6h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Bhopal",
    latitude: 23.2599,
    longitude: 77.4126,
    standard_distance: 320,
    estimated_time: "5h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Pune",
    latitude: 18.5204,
    longitude: 73.8567,
    standard_distance: 420,
    estimated_time: "7h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Jodhpur",
    latitude: 26.2389,
    longitude: 73.0243,
    standard_distance: 450,
    estimated_time: "8h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Ahmedabad",
    latitude: 23.0225,
    longitude: 72.5714,
    standard_distance: 380,
    estimated_time: "6h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Kolhapur",
    latitude: 16.7050,
    longitude: 74.2433,
    standard_distance: 450,
    estimated_time: "8h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Udaipur",
    latitude: 24.5854,
    longitude: 73.7125,
    standard_distance: 400,
    estimated_time: "7h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Raipur",
    latitude: 21.2514,
    longitude: 81.6296,
    standard_distance: 50,
    estimated_time: "1h",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Bhilai",
    latitude: 21.1938,
    longitude: 81.3509,
    standard_distance: 30,
    estimated_time: "45m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Durg",
    latitude: 21.1809,
    longitude: 81.2849,
    standard_distance: 35,
    estimated_time: "50m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Bilaspur",
    latitude: 22.0797,
    longitude: 82.1409,
    standard_distance: 120,
    estimated_time: "2h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Korba",
    latitude: 22.3595,
    longitude: 82.7501,
    standard_distance: 180,
    estimated_time: "3h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Jagdalpur",
    latitude: 19.0723,
    longitude: 82.0346,
    standard_distance: 300,
    estimated_time: "5h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Ambikapur",
    latitude: 23.1200,
    longitude: 83.1973,
    standard_distance: 250,
    estimated_time: "4h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Dhamtari",
    latitude: 20.7071,
    longitude: 81.5497,
    standard_distance: 70,
    estimated_time: "1h 30m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Kanker",
    latitude: 20.2720,
    longitude: 81.4931,
    standard_distance: 140,
    estimated_time: "2h 45m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  },
  {
    name: "Rajnandgaon",
    latitude: 21.0972,
    longitude: 81.0332,
    standard_distance: 80,
    estimated_time: "1h 45m",
    historical_deviation: 5,
    type: "city",
    state: "chhattisgarh",
    active: true
  }
];

async function seedDestinations() {
  console.log('Starting destination seeding process...');
  
  try {
    // Check if destinations already exist
    const { data: existingDestinations, error: checkError } = await supabase
      .from('destinations')
      .select('name');
    
    if (checkError) {
      throw new Error(`Error checking existing destinations: ${checkError.message}`);
    }
    
    const existingNames = new Set(existingDestinations?.map(d => d.name.toLowerCase()) || []);
    
    // Filter out destinations that already exist
    const destinationsToInsert = destinations.filter(
      dest => !existingNames.has(dest.name.toLowerCase())
    );
    
    if (destinationsToInsert.length === 0) {
      console.log('All destinations already exist in the database. No new destinations to insert.');
      return;
    }
    
    console.log(`Found ${destinationsToInsert.length} new destinations to insert.`);
    
    // Insert destinations in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < destinationsToInsert.length; i += BATCH_SIZE) {
      const batch = destinationsToInsert.slice(i, i + BATCH_SIZE);
      
      console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(destinationsToInsert.length/BATCH_SIZE)}`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('destinations')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError);
      } else {
        console.log(`Successfully inserted ${insertedData?.length || 0} destinations in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Destination seeding completed!');
    console.log(`Attempted to insert ${destinationsToInsert.length} destinations.`);
    
  } catch (error) {
    console.error('Error seeding destinations:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDestinations()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });