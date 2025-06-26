// Load environment variables first, before any imports that might use them
import dotenv from 'dotenv';
dotenv.config();

// Now import other dependencies
import fs from 'fs';
import path from 'path';
// Import supabase client after environment variables are loaded
import { supabase } from '../src/utils/supabaseClient';

interface MaintenanceTask {
  task_category: string;
  task_name: string;
  is_category: boolean;
}

const seedMaintenanceTasks = async () => {
  try {
    console.log('Starting maintenance tasks seeding...');
    
    // Read the JSON file
    const filePath = path.resolve('src/data/maintenance_tasks.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    
    // Parse the JSON data
    const tasks: MaintenanceTask[] = JSON.parse(fileData);
    
    console.log(`Read ${tasks.length} tasks from JSON file`);
    
    // Insert tasks into Supabase
    let successCount = 0;
    let errorCount = 0;
    
    for (const task of tasks) {
      try {
        // Check if task already exists
        const { data: existingTask, error: checkError } = await supabase
          .from('maintenance_tasks_catalog')
          .select('id')
          .eq('task_name', task.task_name)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error(`Error checking for existing task "${task.task_name}":`, checkError);
          errorCount++;
          continue;
        }
        
        if (existingTask) {
          console.log(`Task "${task.task_name}" already exists, skipping`);
          continue;
        }
        
        // Insert the task
        const { error: insertError } = await supabase
          .from('maintenance_tasks_catalog')
          .insert({
            task_category: task.task_category,
            task_name: task.task_name,
            is_category: task.is_category,
            active: true
          });
        
        if (insertError) {
          console.error(`Error inserting task "${task.task_name}":`, insertError);
          errorCount++;
        } else {
          console.log(`✓ Inserted task "${task.task_name}"`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing task "${task.task_name}":`, error);
        errorCount++;
      }
    }
    
    console.log(`\nSeeding completed:`);
    console.log(`- Successfully inserted: ${successCount}`);
    console.log(`- Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error seeding maintenance tasks:', error);
  }
};

// Run the seed function
seedMaintenanceTasks()
  .catch(error => console.error('Unhandled error in seeding process:', error))
  .finally(() => process.exit());