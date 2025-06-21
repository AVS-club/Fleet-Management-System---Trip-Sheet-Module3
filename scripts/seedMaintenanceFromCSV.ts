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
  vendor_name: string;
  city: string;
  contact_person: string;
  maintenance_location: string;
  odometer_reading: string;
  maintenance_date: string;
  invoice_number: string;
  invoice_amount: string;
  battery_brand: string;
  tire_brand: string;
  upload_url: string;
}

interface VehicleRecord {
  id: string;
  registration_number: string;
}

interface VendorRecord {
  id: string;
  name: string;
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
    case 'repair/replacement':
      return 'wear_and_tear_replacement_repairs';
    case 'accidental':
      return 'accidental';
    case 'battery replacement':
    case 'tyre replacement':
      return 'wear_and_tear_replacement_repairs';
    default:
      return 'others';
  }
};

const getTaskCategory = (maintenanceType: string) => {
  switch (maintenanceType.toLowerCase()) {
    case 'general':
      return 'General';
    case 'repair/replacement':
      return 'Repair/Replacement';
    case 'accidental':
      return 'Accidental';
    case 'battery replacement':
      return 'Battery Replacement';
    case 'tyre replacement':
      return 'Tyre Replacement';
    default:
      return 'Others';
  }
};

const getPriority = (maintenanceType: string) => {
  switch (maintenanceType.toLowerCase()) {
    case 'accidental':
      return 'high';
    case 'repair/replacement':
    case 'battery replacement':
    case 'tyre replacement':
      return 'medium';
    default:
      return 'low';
  }
};

// Get appropriate task ids from catalog based on maintenance type
const getTaskIdsFromCatalog = (maintenanceType: string, catalog: MaintenanceTaskCatalog[]): string[] => {
  let category = '';
  let taskName = '';

  switch (maintenanceType.toLowerCase()) {
    case 'general':
      category = 'Engine & Oil';
      taskName = 'Engine Oil Change';
      break;
    case 'repair/replacement':
      category = 'Engine & Oil';
      taskName = 'Fuel Injector Cleaning';
      break;
    case 'battery replacement':
      category = 'Electrical';
      taskName = 'Battery Replacement';
      break;
    case 'tyre replacement':
      category = 'Tyres & Wheels';
      taskName = 'Front Tyre Change';
      break;
    case 'accidental':
      category = 'Body & Exterior';
      taskName = 'Denting & Painting';
      break;
    default:
      category = 'Interior & Cabin';
      taskName = 'AC Gas Refill';
  }

  // Find the matching task in the catalog
  const task = catalog.find(
    t => !t.is_category && 
    t.task_name.toLowerCase() === taskName.toLowerCase()
  );

  return task ? [task.id] : [];
};

const seedMaintenanceFromCSV = async () => {
  try {
    console.log('Starting maintenance records seeding from CSV...');
    
    // Read the CSV file
    const csvFilePath = path.resolve('data/avs_maintenance_seed.csv');
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

    // Create a lookup for vendors and create any missing ones
    const vendors = new Map<string, string>();
    
    // Create a temporary mapping for vendor_id to use in tasks
    // In a real system, this would be fetched from the database
    for (const record of data) {
      if (!vendors.has(record.vendor_name)) {
        const vendorId = nanoid(10);
        vendors.set(record.vendor_name, vendorId);
      }
    }

    console.log(`Created ${vendors.size} vendor mappings`);

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

        // Get vendor ID from the map
        const vendorId = vendors.get(record.vendor_name);
        if (!vendorId) {
          console.warn(`Vendor not found: ${record.vendor_name}`);
          errorCount++;
          continue;
        }

        // Convert maintenance_type to task_type
        const taskType = getTaskType(record.maintenance_type);
        const category = getTaskCategory(record.maintenance_type);
        const priority = getPriority(record.maintenance_type);
        
        // Get task IDs from catalog
        const taskIds = getTaskIdsFromCatalog(record.maintenance_type, tasksCatalog);

        // Parse date
        const maintenanceDate = new Date(record.maintenance_date);
        
        // Create maintenance_task record
        const { data: maintenanceTask, error: taskError } = await supabase
          .from('maintenance_tasks')
          .insert({
            vehicle_id: vehicle.id,
            task_type: taskType,
            title: taskIds, // Using task IDs as title
            description: `${record.maintenance_type} - ${record.invoice_number}`,
            status: 'resolved', // Assuming all imported tasks are resolved
            priority: priority,
            garage_id: vendorId,
            vendor_id: vendorId,
            estimated_cost: parseFloat(record.invoice_amount),
            actual_cost: parseFloat(record.invoice_amount),
            bills: [{
              description: record.maintenance_type,
              amount: parseFloat(record.invoice_amount),
              vendor_name: record.vendor_name,
              bill_number: record.invoice_number,
              bill_date: record.maintenance_date
            }],
            start_date: maintenanceDate.toISOString(),
            end_date: maintenanceDate.toISOString(),
            downtime_days: 1, // Assuming 1 day downtime for imported records
            odometer_reading: parseInt(record.odometer_reading),
            category: category
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
          vendor_id: vendorId,
          tasks: taskIds,
          cost: parseFloat(record.invoice_amount)
        };

        // Add battery or tyre data if present
        if (record.battery_brand) {
          serviceTaskData.battery_tracking = true;
          serviceTaskData.battery_brand = record.battery_brand;
          serviceTaskData.battery_serial = `SEED-${nanoid(8)}`;
          serviceTaskData.battery_data = {
            serialNumber: `SEED-${nanoid(8)}`,
            brand: record.battery_brand
          };
        }

        if (record.tire_brand) {
          serviceTaskData.tyre_tracking = true;
          serviceTaskData.tyre_brand = record.tire_brand;
          serviceTaskData.tyre_positions = ['FL', 'FR'];
          serviceTaskData.tyre_data = {
            positions: ['FL', 'FR'],
            brand: record.tire_brand,
            serialNumbers: `SEED-${nanoid(8)}`
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
        console.log(`✓ Created maintenance record for ${record.vehicle_number}: ${record.maintenance_type} - ${record.invoice_number}`);
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