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

// Warehouse data to seed
const warehouses = [
  {
    name: "Main Warehouse",
    pincode: "492001",
    latitude: 21.2514,
    longitude: 81.6296,
    active: true
  },
  {
    name: "North Depot",
    pincode: "492007",
    latitude: 21.2778,
    longitude: 81.6198,
    active: true
  },
  {
    name: "South Warehouse",
    pincode: "492099",
    latitude: 21.2114,
    longitude: 81.6296,
    active: true
  },
  {
    name: "East Depot",
    pincode: "493111",
    latitude: 21.2514,
    longitude: 81.6896,
    active: true
  },
  {
    name: "West Warehouse",
    pincode: "492001",
    latitude: 21.2514,
    longitude: 81.5696,
    active: true
  }
];

async function seedWarehouses() {
  console.log('Starting warehouse seeding process...');
  
  try {
    // Check if warehouses already exist
    const { data: existingWarehouses, error: checkError } = await supabase
      .from('warehouses')
      .select('name');
    
    if (checkError) {
      throw new Error(`Error checking existing warehouses: ${checkError.message}`);
    }
    
    const existingNames = new Set(existingWarehouses?.map(w => w.name.toLowerCase()) || []);
    
    // Filter out warehouses that already exist
    const warehousesToInsert = warehouses.filter(
      warehouse => !existingNames.has(warehouse.name.toLowerCase())
    );
    
    if (warehousesToInsert.length === 0) {
      console.log('All warehouses already exist in the database. No new warehouses to insert.');
      return;
    }
    
    console.log(`Found ${warehousesToInsert.length} new warehouses to insert.`);
    
    // Insert warehouses in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < warehousesToInsert.length; i += BATCH_SIZE) {
      const batch = warehousesToInsert.slice(i, i + BATCH_SIZE);
      
      console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(warehousesToInsert.length/BATCH_SIZE)}`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('warehouses')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError);
      } else {
        console.log(`Successfully inserted ${insertedData?.length || 0} warehouses in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Warehouse seeding completed!');
    console.log(`Attempted to insert ${warehousesToInsert.length} warehouses.`);
    
  } catch (error) {
    console.error('Error seeding warehouses:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedWarehouses()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });