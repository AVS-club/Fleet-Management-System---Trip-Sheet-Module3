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

// Material types data to seed
const materialTypes = [
  { name: "Electronics", active: true },
  { name: "Textiles", active: true },
  { name: "Groceries", active: true },
  { name: "Construction", active: true },
  { name: "Machinery", active: true },
  { name: "Furniture", active: true },
  { name: "Appliances", active: true },
  { name: "Pharmaceuticals", active: true },
  { name: "Food Products", active: true },
  { name: "Agricultural Supplies", active: true },
  { name: "Stationery", active: true },
  { name: "Automotive Parts", active: true }
];

async function seedMaterialTypes() {
  console.log('Starting material types seeding process...');
  
  try {
    // Check if material types already exist
    const { data: existingTypes, error: checkError } = await supabase
      .from('material_types')
      .select('name');
    
    if (checkError) {
      throw new Error(`Error checking existing material types: ${checkError.message}`);
    }
    
    const existingNames = new Set(existingTypes?.map(t => t.name.toLowerCase()) || []);
    
    // Filter out material types that already exist
    const typesToInsert = materialTypes.filter(
      type => !existingNames.has(type.name.toLowerCase())
    );
    
    if (typesToInsert.length === 0) {
      console.log('All material types already exist in the database. No new types to insert.');
      return;
    }
    
    console.log(`Found ${typesToInsert.length} new material types to insert.`);
    
    // Insert material types in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < typesToInsert.length; i += BATCH_SIZE) {
      const batch = typesToInsert.slice(i, i + BATCH_SIZE);
      
      console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(typesToInsert.length/BATCH_SIZE)}`);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('material_types')
        .insert(batch)
        .select();
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError);
      } else {
        console.log(`Successfully inserted ${insertedData?.length || 0} material types in batch ${Math.floor(i/BATCH_SIZE) + 1}`);
      }
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Material types seeding completed!');
    console.log(`Attempted to insert ${typesToInsert.length} material types.`);
    
  } catch (error) {
    console.error('Error seeding material types:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedMaterialTypes()
  .then(() => {
    console.log('Seed script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });