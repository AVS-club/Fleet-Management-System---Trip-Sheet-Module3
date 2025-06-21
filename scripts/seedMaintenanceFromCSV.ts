// Load environment variables first, before any imports that might use them
import dotenv from 'dotenv';
dotenv.config();

// Now import other dependencies
import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';
import { nanoid } from 'nanoid';
// Import supabase client after environment variables are loaded
import { supabase } from '../src/utils/supabaseClient';

// Define interfaces for data models
interface MaintenanceCSVRecord {
  vehicle_number: string;
  maintenance_type: string;
  service_vendor: string;
  priority: string;
  maintenance_tasks: string;
  service_start_date: string;
  service_end_date: string;
  odometer_reading: string;
  battery_serial_number: string;
  battery_brand: string;
  tyre_positions: string;
  tyre_brand: string;
  tyre_serial_numbers: string;
  complaint_description: string;
  resolution_summary: string;
  total_cost: string;
  status: string;
  next_service_reminder: string;
  is_battery_replaced: string;
  is_tyre_replaced: string;
}

interface VehicleRecord {
  id: string;
  registration_number: string;
}

interface MaintenanceTaskCatalog {
  id: string;
  task_category: string;
  task_name: string;
  is_category: boolean;
}

// Helper functions
const getTaskType = (maintenanceType: string) => {
  switch (maintenanceType.toLowerCase()) {
    case 'general':
      return 'general_scheduled_service';
    case 'repair':
      return 'wear_and_tear_replacement_repairs';
    case 'accidental':
      return 'accidental';
    default:
      return 'others';
  }
};

const getTaskCategory = (maintenanceType: string) => {
  switch (maintenanceType.toLowerCase()) {
    case 'general':
      return 'General';
    case 'repair':
      return 'Repair/Replacement';
    case 'accidental':
      return 'Accidental';
    default:
      return 'Others';
  }
};

const getPriority = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
};

// Parse tasks string into an array of task names
const parseMaintenanceTasks = (tasksString: string): string[] => {
  if (!tasksString) return [];
  return tasksString.split(',').map(task => task.trim());
};

// Get appropriate task ids from catalog based on task names
const getTaskIdsFromCatalog = (taskNames: string[], catalog: MaintenanceTaskCatalog[]): string[] => {
  const taskIds: string[] = [];

  taskNames.forEach(taskName => {
    const task = catalog.find(t => !t.is_category && t.task_name.toLowerCase() === taskName.toLowerCase());
    if (task) {
      taskIds.push(task.id);
    }
  });

  // If no matching tasks found, use a fallback approach
  if (taskIds.length === 0 && taskNames.length > 0) {
    // Look for partial matches
    taskNames.forEach(taskName => {
      const task = catalog.find(t => !t.is_category && t.task_name.toLowerCase().includes(taskName.toLowerCase()));
      if (task) {
        taskIds.push(task.id);
      }
    });
  }

  // If still no matches, return at least one task ID (first non-category in the catalog)
  if (taskIds.length === 0) {
    const fallbackTask = catalog.find(t => !t.is_category);
    if (fallbackTask) {
      taskIds.push(fallbackTask.id);
    }
  }

  return taskIds;
};

const getStatusFromCSV = (status: string): 'open' | 'in_progress' | 'resolved' | 'escalated' | 'rework' => {
  if (status.toLowerCase() === 'closed') {
    return 'resolved';
  }
  return 'open'; // Default to 'open' for any other status
};

const seedMaintenanceFromCSV = async () => {
  try {
    console.log('Starting maintenance records seeding from CSV...');
    
    // Read the CSV file
    const csvFilePath = path.resolve('data/AVS_Maintenance_Seed_Data (1).csv');
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse the CSV data
    const { data, errors } = Papa.parse<MaintenanceCSVRecord>(csvData, {
      header: true,
      skipEmptyLines: true
    });

    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
      return;
    }

    console.log(`Read ${data.length} records from CSV file`);

    // Fetch vehicles from Supabase
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, registration_number');

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      return;
    }

    console.log(`Found ${vehicles.length} vehicles in database`);

    // Fetch maintenance task catalog
    const { data: tasksCatalog, error: catalogError } = await supabase
      .from('maintenance_tasks_catalog')
      .select('id, task_category, task_name, is_category');

    if (catalogError) {
      console.error('Error fetching maintenance tasks catalog:', catalogError);
      return;
    }

    console.log(`Found ${tasksCatalog.length} maintenance tasks in catalog`);

    // Track the total number of records successfully processed
    let successCount = 0;
    let errorCount = 0;

    // Process each record from the CSV
    for (const record of data) {
      try {
        // Find the matching vehicle
        const vehicle = vehicles.find(v => 
          v.registration_number.toLowerCase() === record.vehicle_number.toLowerCase()
        );

        if (!vehicle) {
          console.warn(`Vehicle not found: ${record.vehicle_number}`);
          errorCount++;
          continue;
        }

        // Convert maintenance_type to task_type
        const taskType = getTaskType(record.maintenance_type);
        const category = getTaskCategory(record.maintenance_type);
        const priority = getPriority(record.priority);
        
        // Parse maintenance tasks string into an array of task names
        const taskNames = parseMaintenanceTasks(record.maintenance_tasks);
        
        // Get task IDs from catalog
        const taskIds = getTaskIdsFromCatalog(taskNames, tasksCatalog);

        // Parse dates
        const startDate = new Date(record.service_start_date);
        const endDate = new Date(record.service_end_date);

        // Map status from CSV (Closed/Open) to database status
        const status = getStatusFromCSV(record.status);
        
        // Create maintenance_task record
        const { data: maintenanceTask, error: taskError } = await supabase
          .from('maintenance_tasks')
          .insert({
            vehicle_id: vehicle.id,
            task_type: taskType,
            title: taskIds, // Using task IDs as title
            description: `${record.maintenance_tasks} - ${record.complaint_description}`,
            status: status,
            priority: priority,
            garage_id: record.service_vendor, // Use service_vendor for garage_id (text type)
            vendor_id: record.service_vendor, // Use service_vendor for vendor_id (text type)
            estimated_cost: parseFloat(record.total_cost),
            actual_cost: parseFloat(record.total_cost),
            bills: [{
              description: record.maintenance_type,
              amount: parseFloat(record.total_cost),
              vendor_name: record.service_vendor,
              bill_number: nanoid(8),
              bill_date: record.service_start_date
            }],
            complaint_description: record.complaint_description,
            resolution_summary: record.resolution_summary,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            downtime_days: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
            odometer_reading: parseInt(record.odometer_reading),
            category: category,
            next_service_due: record.next_service_reminder ? {
              date: new Date(record.next_service_reminder).toISOString(),
              reminder_set: true
            } : null
          })
          .select()
          .single();

        if (taskError) {
          console.error(`Error creating maintenance task for ${record.vehicle_number}:`, taskError);
          errorCount++;
          continue;
        }

        // Prepare service task data
        const serviceTaskData: any = {
          maintenance_task_id: maintenanceTask.id,
          vendor_id: record.service_vendor,
          tasks: taskIds,
          cost: parseFloat(record.total_cost)
        };

        // Add battery or tyre data if present
        if (record.is_battery_replaced === 'true' && record.battery_brand) {
          serviceTaskData.battery_tracking = true;
          serviceTaskData.battery_data = {
            serialNumber: record.battery_serial_number || `SEED-${nanoid(8)}`,
            brand: record.battery_brand
          };
        }

        if (record.is_tyre_replaced === 'true' && record.tyre_brand) {
          serviceTaskData.tyre_tracking = true;
          serviceTaskData.tyre_data = {
            positions: record.tyre_positions.split(',').map(pos => pos.trim()),
            brand: record.tyre_brand,
            serialNumbers: record.tyre_serial_numbers || `SEED-${nanoid(8)}`
          };
        }

        // Create maintenance_service_tasks record
        const { error: serviceError } = await supabase
          .from('maintenance_service_tasks')
          .insert(serviceTaskData);

        if (serviceError) {
          console.error(`Error creating service task for ${record.vehicle_number}:`, serviceError);
          errorCount++;
          continue;
        }

        successCount++;
        console.log(`✓ Created maintenance record for ${record.vehicle_number}: ${record.maintenance_type} - ${record.maintenance_tasks}`);
      } catch (error) {
        console.error(`Error processing record for ${record.vehicle_number}:`, error);
        errorCount++;
      }
    }

    console.log(`\nSeeding completed:`);
    console.log(`- Total records processed: ${data.length}`);
    console.log(`- Successfully created: ${successCount}`);
    console.log(`- Failed: ${errorCount}`);
    
  } catch (error) {
    console.error('Error seeding maintenance records:', error);
  }
};

// Run the seed function
seedMaintenanceFromCSV()
  .catch(error => console.error('Unhandled error in seeding process:', error))
  .finally(() => process.exit());