import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Validate environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Constants
const VEHICLE_REGISTRATIONS = ['CG04NB2187', 'GJ06LM6958', 'MH12AB1001'];
const DRIVER_NAMES = ['Ravi Shankar', 'Rohan Goda', 'Kavita Rao'];
const WAREHOUSE_NAMES = [
  'Mumbai', 'Raipur', 'Bilaspur', 'Cuttack', 'Delhi',
  'Hyderabad', 'Indore', 'Lucknow', 'Bengaluru', 'Silchar', 'Nashik'
];
const DIESEL_RATE = 96.10; // ₹ per liter
const BATCH_SIZE = 15;
const TRIPS_PER_VEHICLE = 200;
const START_DATE_OFFSET_MONTHS = 18;

// Helper function to get random integer between min and max (inclusive)
function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random float between min and max with specified precision
function getRandomFloat(min: number, max: number, precision: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(precision));
}

// Helper function to generate a value following bell curve distribution
function generateBellCurveValue(min: number, max: number, iterations: number = 3): number {
  let sum = 0;
  for (let i = 0; i < iterations; i++) {
    sum += Math.random();
  }
  // Normalize to 0-1 range and then scale to min-max range
  const normalized = sum / iterations;
  return min + normalized * (max - min);
}

// Helper function to generate trip dates for a given month
function generateTripDates(year: number, month: number): {start: Date, end: Date} {
  // Create a date in the specified month
  const startDate = new Date(year, month, getRandomInt(1, 28));
  
  // Trip duration between 1-3 days
  const duration = getRandomInt(1, 3);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + duration);
  
  return { start: startDate, end: endDate };
}

// Helper function to format date to ISO string without timezone
function formatDateForDB(date: Date): string {
  return date.toISOString();
}

// Function to get vehicle IDs from registration numbers
async function getVehicleIds(registrations: string[]): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, registration_number, current_odometer')
      .in('registration_number', registrations);
    
    if (error) {
      throw error;
    }
    
    const vehicleMap: Record<string, any> = {};
    data?.forEach(vehicle => {
      vehicleMap[vehicle.registration_number] = {
        id: vehicle.id,
        currentOdometer: vehicle.current_odometer || 0
      };
    });
    
    return vehicleMap;
  } catch (error) {
    console.error('Error fetching vehicle IDs:', error);
    throw error;
  }
}

// Function to get driver IDs from names
async function getDriverIds(names: string[]): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name')
      .in('name', names);
    
    if (error) {
      throw error;
    }
    
    const driverMap: Record<string, string> = {};
    data?.forEach(driver => {
      driverMap[driver.name] = driver.id;
    });
    
    return driverMap;
  } catch (error) {
    console.error('Error fetching driver IDs:', error);
    throw error;
  }
}

// Function to get warehouse IDs from names
async function getWarehouseIds(names: string[]): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('id, name');
    
    if (error) {
      throw error;
    }
    
    // Check if warehouses exist, if not, create them
    const existingWarehouses = new Map(data?.map(w => [w.name.toLowerCase(), w.id]) || []);
    const missingWarehouses = names.filter(name => !existingWarehouses.has(name.toLowerCase()));
    
    if (missingWarehouses.length > 0) {
      await createWarehouses(missingWarehouses);
      
      // Fetch all warehouses again
      const { data: updatedData, error: updatedError } = await supabase
        .from('warehouses')
        .select('id, name');
      
      if (updatedError) {
        throw updatedError;
      }
      
      const warehouseMap: Record<string, string> = {};
      updatedData?.forEach(warehouse => {
        warehouseMap[warehouse.name] = warehouse.id;
      });
      
      return warehouseMap;
    }
    
    const warehouseMap: Record<string, string> = {};
    data?.forEach(warehouse => {
      warehouseMap[warehouse.name] = warehouse.id;
    });
    
    return warehouseMap;
  } catch (error) {
    console.error('Error fetching warehouse IDs:', error);
    throw error;
  }
}

// Function to create warehouses if they don't exist
async function createWarehouses(names: string[]): Promise<void> {
  try {
    const warehouses = names.map(name => ({
      name,
      pincode: `${getRandomInt(100000, 999999)}`,
      latitude: getRandomFloat(8.0, 36.0, 6),
      longitude: getRandomFloat(68.0, 98.0, 6)
    }));
    
    const { error } = await supabase
      .from('warehouses')
      .insert(warehouses);
    
    if (error) {
      throw error;
    }
    
    console.log(`Created ${names.length} missing warehouses`);
  } catch (error) {
    console.error('Error creating warehouses:', error);
    throw error;
  }
}

// Function to get or create destinations
async function getDestinations(originName: string): Promise<string[]> {
  try {
    // Get potential destinations (excluding the origin)
    const potentialDestinations = WAREHOUSE_NAMES.filter(name => name !== originName);
    
    // Select 1-2 random destinations
    const count = getRandomInt(1, 2);
    const selectedNames: string[] = [];
    
    // Make sure we have unique destinations
    while (selectedNames.length < count && potentialDestinations.length > selectedNames.length) {
      const randomName = potentialDestinations[getRandomInt(0, potentialDestinations.length - 1)];
      if (!selectedNames.includes(randomName)) {
        selectedNames.push(randomName);
      }
    }
    
    // Get existing destinations from the database
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name')
      .in('name', selectedNames);
    
    if (error) {
      throw error;
    }
    
    const existingDestinations = new Map(data?.map(d => [d.name.toLowerCase(), d.id]) || []);
    const destinationIds: string[] = [];
    
    // For each selected destination
    for (const name of selectedNames) {
      const existingId = existingDestinations.get(name.toLowerCase());
      
      if (existingId) {
        destinationIds.push(existingId);
      } else {
        // Create missing destination
        const { data: newDestination, error: createError } = await supabase
          .from('destinations')
          .insert({
            name,
            latitude: getRandomFloat(8.0, 36.0, 6),
            longitude: getRandomFloat(68.0, 98.0, 6),
            standard_distance: getRandomInt(100, 800),
            estimated_time: `${getRandomInt(2, 12)}h ${getRandomInt(0, 59)}m`,
            historical_deviation: getRandomInt(0, 15),
            type: 'city',
            state: Math.random() > 0.5 ? 'chhattisgarh' : 'odisha'
          })
          .select('id')
          .single();
        
        if (createError) {
          throw createError;
        }
        
        if (newDestination?.id) {
          destinationIds.push(newDestination.id);
        }
      }
    }
    
    return destinationIds;
  } catch (error) {
    console.error('Error getting or creating destinations:', error);
    throw error;
  }
}

// Function to generate trip serial number based on vehicle registration and index
function generateTripSerialNumber(vehicleReg: string, index: number): string {
  // Extract the last 4 characters from registration
  const regSuffix = vehicleReg.slice(-4);
  // Create a sequential number padded to 4 digits
  const sequentialNum = String(index + 1).padStart(4, '0');
  return `${regSuffix}${sequentialNum}`;
}

// Function to determine which driver to assign to a trip
function assignDriverToVehicle(
  vehicleIndex: number,
  driverIds: string[],
  monthIndex: number,
  tripIndex: number
): string {
  // Each vehicle has a primary driver (0->0, 1->1, 2->2)
  const primaryDriverIndex = vehicleIndex % driverIds.length;
  const primaryDriverId = driverIds[primaryDriverIndex];
  
  // Occasionally swap drivers (1-2 times per month)
  // The chance increases slightly in the middle of the month
  const normalizedTripIndex = tripIndex / 25; // 0-1 range for the month
  const swapProbability = 0.1 * Math.sin(Math.PI * normalizedTripIndex); // Peaks in the middle
  
  if (swapProbability > Math.random() * 0.2) {
    // Pick a different driver
    const otherDriverIndex = (primaryDriverIndex + 1 + Math.floor(Math.random() * (driverIds.length - 1))) % driverIds.length;
    return driverIds[otherDriverIndex];
  }
  
  return primaryDriverId;
}

// Function to get random material type IDs
async function getMaterialTypeIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('material_types')
      .select('id');
    
    if (error) {
      throw error;
    }
    
    // If no material types, create some
    if (!data || data.length === 0) {
      await createMaterialTypes();
      
      // Fetch again
      const { data: newData, error: newError } = await supabase
        .from('material_types')
        .select('id');
      
      if (newError) {
        throw newError;
      }
      
      const materialTypeIds = newData?.map(m => m.id) || [];
      // Select 1-2 random material types
      const count = getRandomInt(1, 2);
      const selectedIds: string[] = [];
      
      for (let i = 0; i < count && i < materialTypeIds.length; i++) {
        const randomIndex = getRandomInt(0, materialTypeIds.length - 1);
        selectedIds.push(materialTypeIds[randomIndex]);
      }
      
      return selectedIds;
    }
    
    const materialTypeIds = data.map(m => m.id);
    
    // Select 1-2 random material types
    const count = getRandomInt(1, 2);
    const selectedIds: string[] = [];
    
    for (let i = 0; i < count && i < materialTypeIds.length; i++) {
      const randomIndex = getRandomInt(0, materialTypeIds.length - 1);
      selectedIds.push(materialTypeIds[randomIndex]);
    }
    
    return selectedIds;
  } catch (error) {
    console.error('Error getting material type IDs:', error);
    return []; // Return empty array as fallback
  }
}

// Function to create material types if they don't exist
async function createMaterialTypes(): Promise<void> {
  try {
    const materialTypes = [
      { name: 'Cement' },
      { name: 'Steel' },
      { name: 'Timber' },
      { name: 'Bricks' },
      { name: 'Paint' },
      { name: 'Tools' },
      { name: 'Machinery' },
      { name: 'Furniture' },
      { name: 'Electronics' },
      { name: 'Food' }
    ];
    
    const { error } = await supabase
      .from('material_types')
      .insert(materialTypes);
    
    if (error) {
      throw error;
    }
    
    console.log('Created default material types');
  } catch (error) {
    console.error('Error creating material types:', error);
    throw error;
  }
}

// Function to generate reasonable remarks based on trip characteristics
function generateRemarks(isShortTrip: boolean, isReturnTrip: boolean, refueling: boolean): string {
  const remarkPool = [
    "Routine delivery",
    "Standard shipment",
    "Regular transport",
    "Normal cargo run"
  ];
  
  const shortTripRemarks = [
    "Local delivery",
    "City run",
    "Short distance shipment",
    "Nearby delivery"
  ];
  
  const returnTripRemarks = [
    "Return trip with cargo",
    "Back haul with load",
    "Return journey"
  ];
  
  const refuelingRemarks = [
    "Refueled during trip",
    "Full tank refill"
  ];
  
  if (isShortTrip) {
    return shortTripRemarks[Math.floor(Math.random() * shortTripRemarks.length)];
  } else if (isReturnTrip) {
    return returnTripRemarks[Math.floor(Math.random() * returnTripRemarks.length)];
  } else if (refueling && Math.random() > 0.7) {
    return refuelingRemarks[Math.floor(Math.random() * refuelingRemarks.length)];
  } else {
    return remarkPool[Math.floor(Math.random() * remarkPool.length)];
  }
}

// Main function to seed trips
async function seedTrips(): Promise<void> {
  console.log('Starting to seed trips...');
  
  try {
    // Get vehicle IDs and current odometer readings
    const vehicleMap = await getVehicleIds(VEHICLE_REGISTRATIONS);
    console.log('Vehicle map:', vehicleMap);
    
    // Get driver IDs
    const driverMap = await getDriverIds(DRIVER_NAMES);
    console.log('Driver map:', driverMap);
    
    // Get warehouse IDs
    const warehouseMap = await getWarehouseIds(WAREHOUSE_NAMES);
    console.log('Warehouse map:', warehouseMap);
    
    const driverIds = Object.values(driverMap);
    
    // For each vehicle
    let totalInserted = 0;
    
    for (const [vehicleIndex, vehicleReg] of VEHICLE_REGISTRATIONS.entries()) {
      console.log(`\nGenerating trips for vehicle ${vehicleReg}...`);
      
      const vehicleInfo = vehicleMap[vehicleReg];
      if (!vehicleInfo) {
        console.error(`Vehicle ${vehicleReg} not found in the database. Skipping.`);
        continue;
      }
      
      const vehicleId = vehicleInfo.id;
      let currentOdometer = vehicleInfo.currentOdometer || 0;
      
      // Start date is 18 months ago
      const today = new Date();
      const startMonth = new Date(today);
      startMonth.setMonth(today.getMonth() - START_DATE_OFFSET_MONTHS);
      
      // Track the total trips we've generated
      let tripIndex = 0;
      const tripsToInsert = [];
      
      // For each month (from startMonth to today)
      for (let year = startMonth.getFullYear(); year <= today.getFullYear(); year++) {
        const monthStart = year === startMonth.getFullYear() ? startMonth.getMonth() : 0;
        const monthEnd = year === today.getFullYear() ? today.getMonth() : 11;
        
        for (let month = monthStart; month <= monthEnd; month++) {
          // Determine number of trips for this month (18-25) using bell curve
          const tripsThisMonth = Math.floor(generateBellCurveValue(18, 25));
          console.log(`  Month ${year}-${month+1}: Generating ${tripsThisMonth} trips`);
          
          // Skip for maintenance 4-5 times over 18 months (randomly)
          if (Math.random() < 0.08) {
            console.log(`  Month ${year}-${month+1}: Vehicle in maintenance, skipping`);
            continue;
          }
          
          // Generate trips for this month
          for (let i = 0; i < tripsThisMonth && tripIndex < TRIPS_PER_VEHICLE; i++, tripIndex++) {
            // Generate trip dates
            const { start: tripStartDate, end: tripEndDate } = generateTripDates(year, month);
            
            // Skip if the end date is in the future
            if (tripEndDate > today) {
              console.log(`  Skipping future trip (${tripEndDate.toISOString()})`);
              continue;
            }
            
            // Assign driver
            const driverId = assignDriverToVehicle(vehicleIndex, driverIds, month, i);
            
            // Select warehouse and destinations
            const originName = WAREHOUSE_NAMES[getRandomInt(0, WAREHOUSE_NAMES.length - 1)];
            const originId = warehouseMap[originName];
            
            if (!originId) {
              console.warn(`  Origin ${originName} not found in warehouse map, skipping trip`);
              continue;
            }
            
            // Get 1-2 destinations
            const destinationIds = await getDestinations(originName);
            
            // Determine if this is a return trip (10% chance)
            const isReturnTrip = Math.random() <= 0.1;
            
            // Determine if this is a short trip (10% chance)
            const isShortTrip = Math.random() <= 0.1;
            
            // Calculate trip distance
            const distanceMultiplier = isShortTrip ? getRandomFloat(0.1, 0.3) : getRandomFloat(0.8, 1.2);
            const baseDistance = destinationIds.length * getRandomInt(100, 300);
            const distance = Math.max(20, Math.floor(baseDistance * distanceMultiplier));
            
            // Update odometer
            const startKm = currentOdometer;
            const endKm = startKm + distance;
            currentOdometer = endKm;
            
            // Determine if refueling is done (25-30% chance)
            const refuelingDone = Math.random() <= getRandomFloat(0.25, 0.3);
            
            // Calculate mileage using bell curve (6.5-7.8 km/l)
            const mileage = generateBellCurveValue(6.5, 7.8);
            
            // Calculate fuel quantity and cost if refueling is done
            let fuelQuantity = null;
            let fuelCost = null;
            let totalFuelCost = null;
            let calculatedKmpl = null;
            
            if (refuelingDone) {
              fuelQuantity = parseFloat((distance / mileage).toFixed(2));
              fuelCost = DIESEL_RATE;
              totalFuelCost = parseFloat((fuelQuantity * fuelCost).toFixed(2));
              calculatedKmpl = parseFloat(mileage.toFixed(2));
            }
            
            // Calculate gross weight (2000-3200 kg)
            const grossWeight = getRandomInt(2000, 3200);
            
            // Calculate expenses
            const unloadingExpense = getRandomInt(300, 800);
            const driverExpense = getRandomInt(400, 1000);
            const roadRtoExpense = Math.random() <= 0.15 ? getRandomInt(200, 500) : 0;
            const breakdownExpense = Math.random() <= 0.05 ? getRandomInt(500, 2000) : 0;
            const miscellaneousExpense = Math.random() <= 0.2 ? getRandomInt(100, 300) : 0;
            const totalRoadExpenses = unloadingExpense + driverExpense + roadRtoExpense + breakdownExpense + miscellaneousExpense;
            
            // Get material type IDs
            const materialTypeIds = await getMaterialTypeIds();
            
            // Generate remarks
            const remarks = generateRemarks(isShortTrip, isReturnTrip, refuelingDone);
            
            // Generate trip serial number
            const tripSerialNumber = generateTripSerialNumber(vehicleReg, tripIndex);
            
            // Create the trip object
            const trip = {
              trip_serial_number: tripSerialNumber,
              vehicle_id: vehicleId,
              driver_id: driverId,
              warehouse_id: originId,
              destinations: destinationIds,
              trip_start_date: formatDateForDB(tripStartDate),
              trip_end_date: formatDateForDB(tripEndDate),
              trip_duration: Math.round((tripEndDate.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24)),
              start_km: startKm,
              end_km: endKm,
              gross_weight: grossWeight,
              station: originName,
              refueling_done: refuelingDone,
              fuel_quantity: fuelQuantity,
              fuel_cost: fuelCost,
              total_fuel_cost: totalFuelCost,
              unloading_expense: unloadingExpense,
              driver_expense: driverExpense,
              road_rto_expense: roadRtoExpense,
              breakdown_expense: breakdownExpense,
              miscellaneous_expense: miscellaneousExpense,
              total_road_expenses: totalRoadExpenses,
              short_trip: isShortTrip,
              calculated_kmpl: calculatedKmpl,
              remarks,
              material_type_ids: materialTypeIds
            };
            
            tripsToInsert.push(trip);
            
            // Insert trips in batches
            if (tripsToInsert.length >= BATCH_SIZE) {
              const { error } = await supabase.from('trips').insert(tripsToInsert);
              
              if (error) {
                console.error(`Error inserting trips batch:`, error);
              } else {
                totalInserted += tripsToInsert.length;
                console.log(`  ✓ Inserted ${tripsToInsert.length} trips (total: ${totalInserted}/${TRIPS_PER_VEHICLE * VEHICLE_REGISTRATIONS.length})`);
              }
              
              // Clear the batch
              tripsToInsert.length = 0;
              
              // Add a small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
      }
      
      // Insert any remaining trips
      if (tripsToInsert.length > 0) {
        const { error } = await supabase.from('trips').insert(tripsToInsert);
        
        if (error) {
          console.error(`Error inserting final trips batch:`, error);
        } else {
          totalInserted += tripsToInsert.length;
          console.log(`  ✓ Inserted ${tripsToInsert.length} trips (total: ${totalInserted}/${TRIPS_PER_VEHICLE * VEHICLE_REGISTRATIONS.length})`);
        }
      }
      
      // Update the vehicle's current odometer
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ current_odometer: currentOdometer })
        .eq('id', vehicleId);
      
      if (updateError) {
        console.error(`Error updating vehicle ${vehicleReg} odometer:`, updateError);
      } else {
        console.log(`  ✓ Updated ${vehicleReg} odometer to ${currentOdometer}`);
      }
    }
    
    console.log(`\n✅ Seeding complete! Inserted ${totalInserted} trips.`);
  } catch (error) {
    console.error('Error seeding trips:', error);
  }
}

// Run the seed function
seedTrips()
  .catch(error => {
    console.error('Unhandled error in seed script:', error);
    process.exit(1);
  });