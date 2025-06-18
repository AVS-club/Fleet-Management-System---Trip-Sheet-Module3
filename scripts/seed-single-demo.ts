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

async function seedDemoData() {
  console.log('Starting to seed demo data...');
  
  try {
    // Step 1: Create a warehouse
    console.log('Creating warehouse...');
    const warehouseData = {
      name: 'Main Warehouse',
      pincode: '492001',
      latitude: 21.2514,
      longitude: 81.6296,
      active: true
    };
    
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .insert(warehouseData)
      .select()
      .single();
    
    if (warehouseError) {
      throw new Error(`Failed to create warehouse: ${warehouseError.message}`);
    }
    
    console.log('✅ Warehouse created:', warehouse.id);
    
    // Step 2: Create a destination
    console.log('Creating destination...');
    const destinationData = {
      name: 'Bilaspur',
      latitude: 22.0797,
      longitude: 82.1409,
      standard_distance: 120,
      estimated_time: '2h 30m',
      historical_deviation: 5,
      type: 'city',
      state: 'chhattisgarh',
      active: true
    };
    
    const { data: destination, error: destinationError } = await supabase
      .from('destinations')
      .insert(destinationData)
      .select()
      .single();
    
    if (destinationError) {
      throw new Error(`Failed to create destination: ${destinationError.message}`);
    }
    
    console.log('✅ Destination created:', destination.id);
    
    // Step 3: Create a material type
    console.log('Creating material type...');
    const materialTypeData = {
      name: 'Cement',
      active: true
    };
    
    const { data: materialType, error: materialTypeError } = await supabase
      .from('material_types')
      .insert(materialTypeData)
      .select()
      .single();
    
    if (materialTypeError) {
      throw new Error(`Failed to create material type: ${materialTypeError.message}`);
    }
    
    console.log('✅ Material type created:', materialType.id);
    
    // Step 4: Create a vehicle
    console.log('Creating vehicle...');
    const vehicleData = {
      registration_number: 'CG04MK1234',
      make: 'Tata',
      model: '1109',
      year: 2023,
      type: 'truck',
      fuel_type: 'diesel',
      current_odometer: 15000,
      status: 'active',
      chassis_number: 'MAKTB4565TRT78901',
      engine_number: 'TRT78901MAKTB4565',
      owner_name: 'Auto Vital Solutions',
      tyre_size: '215/75 R15',
      number_of_tyres: 6,
      registration_date: '2023-01-15',
      rc_expiry_date: '2038-01-14',
      insurance_policy_number: 'INS123456789',
      insurer_name: 'ICICI Lombard',
      insurance_start_date: '2023-01-15',
      insurance_expiry_date: '2024-01-14',
      insurance_premium_amount: 25000,
      fitness_certificate_number: 'FIT123456789',
      fitness_issue_date: '2023-01-15',
      fitness_expiry_date: '2025-01-14',
      permit_number: 'PER123456789',
      permit_issuing_state: 'Chhattisgarh',
      permit_type: 'national',
      permit_issue_date: '2023-01-15',
      permit_expiry_date: '2025-01-14',
      puc_certificate_number: 'PUC123456789',
      puc_issue_date: '2023-06-15',
      puc_expiry_date: '2024-06-14'
    };
    
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single();
    
    if (vehicleError) {
      throw new Error(`Failed to create vehicle: ${vehicleError.message}`);
    }
    
    console.log('✅ Vehicle created:', vehicle.id);
    
    // Step 5: Create a driver
    console.log('Creating driver...');
    const driverData = {
      name: 'Rajiv Kumar',
      license_number: 'CG0420230001234',
      contact_number: '9876543210',
      email: 'rajiv.kumar@example.com',
      join_date: '2023-02-01',
      status: 'active',
      experience_years: 5,
      primary_vehicle_id: vehicle.id,
      license_expiry_date: '2028-01-31'
    };
    
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .insert(driverData)
      .select()
      .single();
    
    if (driverError) {
      throw new Error(`Failed to create driver: ${driverError.message}`);
    }
    
    console.log('✅ Driver created:', driver.id);
    
    // Step 6: Create a trip
    console.log('Creating trip...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tripData = {
      trip_serial_number: '1234001',
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      warehouse_id: warehouse.id,
      destinations: [destination.id],
      trip_start_date: yesterday.toISOString(),
      trip_end_date: today.toISOString(),
      trip_duration: 1,
      start_km: 15000,
      end_km: 15240,
      gross_weight: 2500,
      station: 'Raipur',
      refueling_done: true,
      fuel_quantity: 30,
      fuel_cost: 90,
      total_fuel_cost: 2700,
      unloading_expense: 500,
      driver_expense: 300,
      road_rto_expense: 200,
      breakdown_expense: 0,
      total_road_expenses: 1000,
      short_trip: false,
      remarks: 'Demo trip for testing',
      calculated_kmpl: 8.0,
      material_type_ids: [materialType.id]
    };
    
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single();
    
    if (tripError) {
      throw new Error(`Failed to create trip: ${tripError.message}`);
    }
    
    console.log('✅ Trip created:', trip.id);
    
    // Step 7: Create a maintenance task
    console.log('Creating maintenance task...');
    const maintenanceTaskData = {
      vehicle_id: vehicle.id,
      task_type: 'general_scheduled_service',
      title: ['eng1', 'eng3'],
      description: 'Regular oil change and filter replacement',
      status: 'resolved',
      priority: 'medium',
      garage_id: 'g1',
      estimated_cost: 3000,
      actual_cost: 3200,
      start_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      end_date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
      downtime_days: 1,
      odometer_reading: 14800,
      category: 'General'
    };
    
    const { data: maintenanceTask, error: maintenanceTaskError } = await supabase
      .from('maintenance_tasks')
      .insert(maintenanceTaskData)
      .select()
      .single();
    
    if (maintenanceTaskError) {
      throw new Error(`Failed to create maintenance task: ${maintenanceTaskError.message}`);
    }
    
    console.log('✅ Maintenance task created:', maintenanceTask.id);
    
    // Step 8: Create a maintenance service task
    console.log('Creating maintenance service task...');
    const serviceTaskData = {
      maintenance_task_id: maintenanceTask.id,
      vendor_id: 'v1',
      tasks: ['eng1', 'eng3'],
      cost: 3200,
      parts_replaced: true
    };
    
    const { data: serviceTask, error: serviceTaskError } = await supabase
      .from('maintenance_service_tasks')
      .insert(serviceTaskData)
      .select()
      .single();
    
    if (serviceTaskError) {
      throw new Error(`Failed to create maintenance service task: ${serviceTaskError.message}`);
    }
    
    console.log('✅ Maintenance service task created:', serviceTask.id);
    
    console.log('\n✅ Demo data seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- Warehouse: ${warehouse.id} (${warehouse.name})`);
    console.log(`- Destination: ${destination.id} (${destination.name})`);
    console.log(`- Material Type: ${materialType.id} (${materialType.name})`);
    console.log(`- Vehicle: ${vehicle.id} (${vehicle.registration_number})`);
    console.log(`- Driver: ${driver.id} (${driver.name})`);
    console.log(`- Trip: ${trip.id} (${trip.trip_serial_number})`);
    console.log(`- Maintenance Task: ${maintenanceTask.id}`);
    
  } catch (error) {
    console.error('Error seeding demo data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDemoData()
  .then(() => {
    console.log('Seed script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });