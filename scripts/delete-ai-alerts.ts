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

async function deleteAllAIAlerts() {
  console.log('Starting to delete all AI alerts...');
  
  try {
    // First, get a count of alerts to delete
    const { count, error: countError } = await supabase
      .from('ai_alerts')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting AI alerts:', countError);
      return;
    }
    
    console.log(`Found ${count} AI alerts to delete`);
    
    // Delete all AI alerts
    const { error: deleteError } = await supabase
      .from('ai_alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This condition will match all records
    
    if (deleteError) {
      console.error('Error deleting AI alerts:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted all AI alerts`);
    
  } catch (error) {
    console.error('Unexpected error during AI alerts deletion:', error);
  }
}

// Run the deletion function
deleteAllAIAlerts()
  .then(() => {
    console.log('AI alerts deletion completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('AI alerts deletion failed:', error);
    process.exit(1);
  });