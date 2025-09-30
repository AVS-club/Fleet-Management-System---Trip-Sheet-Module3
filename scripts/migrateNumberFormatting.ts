/**
 * Migration Script: Update all existing data to use consistent 2-decimal formatting
 * File: scripts/migrateNumberFormatting.ts
 * 
 * This script updates all numeric values in the database to use consistent
 * 2-decimal formatting with rounding up (Math.ceil)
 */

import { createClient } from '@supabase/supabase-js';
import { NumberFormatter } from '../src/utils/numberFormatter';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key for admin operations
);

/**
 * Rounds up a number to 2 decimal places for database storage
 */
function roundUpToTwo(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.ceil(num * 100) / 100;
}

/**
 * Main migration function
 */
async function migrateNumberFormatting() {
  console.log('🚀 Starting number formatting migration...');
  
  try {
    // 1. Update trips table
    console.log('📊 Updating trips table...');
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*');
    
    if (tripsError) throw tripsError;
    
    if (trips && trips.length > 0) {
      let updatedCount = 0;
      
      for (const trip of trips) {
        const updates = {
          fuel_quantity: roundUpToTwo(trip.fuel_quantity),
          fuel_rate_per_liter: roundUpToTwo(trip.fuel_rate_per_liter),
          total_fuel_cost: roundUpToTwo(trip.total_fuel_cost),
          calculated_kmpl: roundUpToTwo(trip.calculated_kmpl),
          material_quantity: roundUpToTwo(trip.material_quantity),
          trip_expenses: roundUpToTwo(trip.trip_expenses),
          driver_allowance: roundUpToTwo(trip.driver_allowance),
          toll_expenses: roundUpToTwo(trip.toll_expenses),
          other_expenses: roundUpToTwo(trip.other_expenses),
          total_expenses: roundUpToTwo(trip.total_expenses),
          freight_rate: roundUpToTwo(trip.freight_rate),
          income_amount: roundUpToTwo(trip.income_amount),
          total_expense: roundUpToTwo(trip.total_expense),
          net_profit: roundUpToTwo(trip.net_profit),
          cost_per_km: roundUpToTwo(trip.cost_per_km),
          unloading_expense: roundUpToTwo(trip.unloading_expense),
          driver_expense: roundUpToTwo(trip.driver_expense),
          road_rto_expense: roundUpToTwo(trip.road_rto_expense),
          breakdown_expense: roundUpToTwo(trip.breakdown_expense),
          miscellaneous_expense: roundUpToTwo(trip.miscellaneous_expense),
          total_road_expenses: roundUpToTwo(trip.total_road_expenses)
        };
        
        const { error: updateError } = await supabase
          .from('trips')
          .update(updates)
          .eq('id', trip.id);
        
        if (updateError) {
          console.error(`❌ Error updating trip ${trip.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`✅ Updated ${updatedCount} trips`);
    }
    
    // 2. Update maintenance_tasks table
    console.log('🔧 Updating maintenance_tasks table...');
    const { data: maintenanceTasks, error: maintenanceError } = await supabase
      .from('maintenance_tasks')
      .select('*');
    
    if (maintenanceError) throw maintenanceError;
    
    if (maintenanceTasks && maintenanceTasks.length > 0) {
      let updatedCount = 0;
      
      for (const task of maintenanceTasks) {
        const updates = {
          cost: roundUpToTwo(task.cost),
          labor_cost: roundUpToTwo(task.labor_cost),
          parts_cost: roundUpToTwo(task.parts_cost),
          total_cost: roundUpToTwo(task.total_cost)
        };
        
        const { error: updateError } = await supabase
          .from('maintenance_tasks')
          .update(updates)
          .eq('id', task.id);
        
        if (updateError) {
          console.error(`❌ Error updating maintenance task ${task.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`✅ Updated ${updatedCount} maintenance tasks`);
    }
    
    // 3. Update fuel_efficiency_baselines table
    console.log('⛽ Updating fuel_efficiency_baselines table...');
    const { data: baselines, error: baselinesError } = await supabase
      .from('fuel_efficiency_baselines')
      .select('*');
    
    if (baselinesError) throw baselinesError;
    
    if (baselines && baselines.length > 0) {
      let updatedCount = 0;
      
      for (const baseline of baselines) {
        const updates = {
          baseline_kmpl: roundUpToTwo(baseline.baseline_kmpl),
          tolerance_upper_percent: roundUpToTwo(baseline.tolerance_upper_percent),
          tolerance_lower_percent: roundUpToTwo(baseline.tolerance_lower_percent),
          confidence_score: roundUpToTwo(baseline.confidence_score)
        };
        
        // Update data_range JSON if it exists
        if (baseline.data_range) {
          const dataRange = baseline.data_range;
          dataRange.total_fuel = roundUpToTwo(dataRange.total_fuel);
          updates['data_range'] = dataRange;
        }
        
        const { error: updateError } = await supabase
          .from('fuel_efficiency_baselines')
          .update(updates)
          .eq('id', baseline.id);
        
        if (updateError) {
          console.error(`❌ Error updating baseline ${baseline.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`✅ Updated ${updatedCount} fuel efficiency baselines`);
    }
    
    // 4. Update vendors table (if applicable)
    console.log('🏪 Updating vendors table...');
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*');
    
    if (vendorsError) {
      console.log('⚠️ Vendors table not found or accessible, skipping...');
    } else if (vendors && vendors.length > 0) {
      let updatedCount = 0;
      
      for (const vendor of vendors) {
        const updates = {
          rating: roundUpToTwo(vendor.rating),
          avgCost: roundUpToTwo(vendor.avgCost)
        };
        
        const { error: updateError } = await supabase
          .from('vendors')
          .update(updates)
          .eq('id', vendor.id);
        
        if (updateError) {
          console.error(`❌ Error updating vendor ${vendor.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
      
      console.log(`✅ Updated ${updatedCount} vendors`);
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Generate summary report
    console.log('\n📊 Migration Summary:');
    console.log('------------------------');
    console.log(`Total trips processed: ${trips?.length || 0}`);
    console.log(`Total maintenance tasks processed: ${maintenanceTasks?.length || 0}`);
    console.log(`Total baselines processed: ${baselines?.length || 0}`);
    console.log(`Total vendors processed: ${vendors?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Verification function to check if migration was successful
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Check a sample of trips for proper formatting
    const { data: sampleTrips, error } = await supabase
      .from('trips')
      .select('id, total_expense, calculated_kmpl, fuel_rate_per_liter')
      .limit(10);
    
    if (error) throw error;
    
    let hasIssues = false;
    
    sampleTrips?.forEach(trip => {
      // Check if values have more than 2 decimal places
      const checkValue = (value: number, field: string) => {
        if (value && value.toString().split('.')[1]?.length > 2) {
          console.warn(`⚠️ Trip ${trip.id} has ${field} with more than 2 decimals: ${value}`);
          hasIssues = true;
        }
      };
      
      checkValue(trip.total_expense, 'total_expense');
      checkValue(trip.calculated_kmpl, 'calculated_kmpl');
      checkValue(trip.fuel_rate_per_liter, 'fuel_rate_per_liter');
    });
    
    if (!hasIssues) {
      console.log('✅ Verification complete: All values properly formatted!');
    } else {
      console.log('⚠️ Verification found some issues. Please review the warnings above.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the migration
async function run() {
  console.log('🚀 Auto Vital Solution - Number Formatting Migration');
  console.log('====================================================');
  console.log('This script will update all numeric values to use');
  console.log('consistent 2-decimal formatting with rounding up.');
  console.log('====================================================\n');
  
  // Run migration
  await migrateNumberFormatting();
  
  // Verify results
  await verifyMigration();
  
  console.log('\n✨ Migration process complete!');
}

// Execute if running directly
if (require.main === module) {
  run().catch(console.error);
}

export { migrateNumberFormatting, verifyMigration };
