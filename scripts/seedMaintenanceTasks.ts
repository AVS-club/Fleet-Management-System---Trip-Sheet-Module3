import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the maintenance task type
interface MaintenanceTaskData {
  task_category: string;
  task_name: string;
  is_category: boolean;
}

async function seedMaintenanceTasks() {
  try {
    console.log('Starting maintenance tasks import...');
    
    // Read the JSON file
    const filePath = path.join(__dirname, '../src/data/maintenance_tasks.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const tasks: MaintenanceTaskData[] = JSON.parse(fileData);
    
    console.log(`Found ${tasks.length} tasks in the JSON file`);
    
    // Check if the maintenance_tasks table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .from('maintenance_tasks_catalog')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableCheckError) {
      // Table might not exist, try to create it
      console.log('Table maintenance_tasks_catalog might not exist, attempting to create it...');
      
      const { error: createTableError } = await supabase.rpc('create_maintenance_tasks_catalog_if_not_exists');
      
      if (createTableError) {
        console.error('Error creating maintenance_tasks_catalog table:', createTableError);
        console.log('Attempting to create table directly...');
        
        // Try direct SQL approach
        const { error: directCreateError } = await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS maintenance_tasks_catalog (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              task_category text NOT NULL,
              task_name text NOT NULL UNIQUE,
              is_category boolean NOT NULL DEFAULT false,
              active boolean NOT NULL DEFAULT true,
              created_at timestamptz DEFAULT now(),
              updated_at timestamptz DEFAULT now()
            );
            
            -- Enable RLS
            ALTER TABLE maintenance_tasks_catalog ENABLE ROW LEVEL SECURITY;
            
            -- Create policies
            CREATE POLICY "Enable read access for authenticated users" 
            ON maintenance_tasks_catalog
            FOR SELECT TO authenticated USING (true);
            
            CREATE POLICY "Enable insert for authenticated users" 
            ON maintenance_tasks_catalog
            FOR INSERT TO authenticated WITH CHECK (true);
          `
        });
        
        if (directCreateError) {
          console.error('Error creating table directly:', directCreateError);
          console.log('Please create the maintenance_tasks_catalog table manually before running this script');
          process.exit(1);
        }
      }
    }
    
    // Process tasks in batches to avoid rate limits
    const BATCH_SIZE = 20;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(tasks.length / BATCH_SIZE)}`);
      
      // Use upsert to handle duplicates
      const { data, error } = await supabase
        .from('maintenance_tasks_catalog')
        .upsert(
          batch.map(task => ({
            task_category: task.task_category,
            task_name: task.task_name,
            is_category: task.is_category,
            active: true
          })),
          { 
            onConflict: 'task_name',
            ignoreDuplicates: false // Update existing records
          }
        );
      
      if (error) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
        errorCount += batch.length;
      } else {
        console.log(`Successfully processed batch ${i / BATCH_SIZE + 1}`);
        successCount += batch.length;
      }
      
      // Add a small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\nImport summary:');
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ All maintenance tasks imported successfully!');
    } else {
      console.log('\n⚠️ Import completed with some errors.');
    }
    
  } catch (error) {
    console.error('Unexpected error during import:', error);
    process.exit(1);
  }
}

// Run the seed function
seedMaintenanceTasks()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });