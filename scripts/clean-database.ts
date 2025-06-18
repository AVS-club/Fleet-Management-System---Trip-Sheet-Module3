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

async function cleanDatabase() {
  console.log('Starting database cleanup...');
  
  try {
    // Step 1: Delete maintenance_audit_logs
    console.log('Deleting maintenance_audit_logs...');
    const { error: auditLogsError } = await supabase
      .from('maintenance_audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (auditLogsError) {
      console.error('Error deleting maintenance_audit_logs:', auditLogsError);
    } else {
      console.log('✅ maintenance_audit_logs deleted');
    }
    
    // Step 2: Delete maintenance_service_tasks
    console.log('Deleting maintenance_service_tasks...');
    const { error: serviceTasksError } = await supabase
      .from('maintenance_service_tasks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (serviceTasksError) {
      console.error('Error deleting maintenance_service_tasks:', serviceTasksError);
    } else {
      console.log('✅ maintenance_service_tasks deleted');
    }
    
    // Step 3: Delete ai_alerts
    console.log('Deleting ai_alerts...');
    const { error: alertsError } = await supabase
      .from('ai_alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (alertsError) {
      console.error('Error deleting ai_alerts:', alertsError);
    } else {
      console.log('✅ ai_alerts deleted');
    }
    
    // Step 4: Delete vehicle_activity_log
    console.log('Deleting vehicle_activity_log...');
    const { error: activityLogError } = await supabase
      .from('vehicle_activity_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (activityLogError) {
      console.error('Error deleting vehicle_activity_log:', activityLogError);
    } else {
      console.log('✅ vehicle_activity_log deleted');
    }
    
    // Step 5: Delete trips
    console.log('Deleting trips...');
    const { error: tripsError } = await supabase
      .from('trips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (tripsError) {
      console.error('Error deleting trips:', tripsError);
    } else {
      console.log('✅ trips deleted');
    }
    
    // Step 6: Delete maintenance_tasks
    console.log('Deleting maintenance_tasks...');
    const { error: tasksError } = await supabase
      .from('maintenance_tasks')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (tasksError) {
      console.error('Error deleting maintenance_tasks:', tasksError);
    } else {
      console.log('✅ maintenance_tasks deleted');
    }
    
    // Step 7: Delete drivers
    console.log('Deleting drivers...');
    const { error: driversError } = await supabase
      .from('drivers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (driversError) {
      console.error('Error deleting drivers:', driversError);
    } else {
      console.log('✅ drivers deleted');
    }
    
    // Step 8: Delete vehicles
    console.log('Deleting vehicles...');
    const { error: vehiclesError } = await supabase
      .from('vehicles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (vehiclesError) {
      console.error('Error deleting vehicles:', vehiclesError);
    } else {
      console.log('✅ vehicles deleted');
    }
    
    // Step 9: Delete warehouses
    console.log('Deleting warehouses...');
    const { error: warehousesError } = await supabase
      .from('warehouses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (warehousesError) {
      console.error('Error deleting warehouses:', warehousesError);
    } else {
      console.log('✅ warehouses deleted');
    }
    
    // Step 10: Delete destinations
    console.log('Deleting destinations...');
    const { error: destinationsError } = await supabase
      .from('destinations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (destinationsError) {
      console.error('Error deleting destinations:', destinationsError);
    } else {
      console.log('✅ destinations deleted');
    }
    
    // Step 11: Delete fuel_stations
    console.log('Deleting fuel_stations...');
    const { error: fuelStationsError } = await supabase
      .from('fuel_stations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (fuelStationsError) {
      console.error('Error deleting fuel_stations:', fuelStationsError);
    } else {
      console.log('✅ fuel_stations deleted');
    }
    
    // Step 12: Delete material_types
    console.log('Deleting material_types...');
    const { error: materialTypesError } = await supabase
      .from('material_types')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (materialTypesError) {
      console.error('Error deleting material_types:', materialTypesError);
    } else {
      console.log('✅ material_types deleted');
    }
    
    // Step 13: Delete admin_insurers
    console.log('Deleting admin_insurers...');
    const { error: insurersError } = await supabase
      .from('admin_insurers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (insurersError) {
      console.error('Error deleting admin_insurers:', insurersError);
    } else {
      console.log('✅ admin_insurers deleted');
    }
    
    // Step 14: Delete maintenance_tasks_catalog
    console.log('Deleting maintenance_tasks_catalog...');
    const { error: catalogError } = await supabase
      .from('maintenance_tasks_catalog')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (catalogError) {
      console.error('Error deleting maintenance_tasks_catalog:', catalogError);
    } else {
      console.log('✅ maintenance_tasks_catalog deleted');
    }
    
    // Step 15: Delete reminder_templates
    console.log('Deleting reminder_templates...');
    const { error: templatesError } = await supabase
      .from('reminder_templates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (templatesError) {
      console.error('Error deleting reminder_templates:', templatesError);
    } else {
      console.log('✅ reminder_templates deleted');
    }
    
    // Step 16: Delete reminder_contacts
    console.log('Deleting reminder_contacts...');
    const { error: contactsError } = await supabase
      .from('reminder_contacts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (contactsError) {
      console.error('Error deleting reminder_contacts:', contactsError);
    } else {
      console.log('✅ reminder_contacts deleted');
    }
    
    console.log('\n✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error during database cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup function
cleanDatabase()
  .then(() => {
    console.log('Cleanup script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Cleanup script failed:', error);
    process.exit(1);
  });