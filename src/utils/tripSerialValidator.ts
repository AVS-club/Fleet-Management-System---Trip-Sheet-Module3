import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('tripSerialValidator');

export interface SerialMismatch {
  tripId: string;
  tripSerialNumber: string;
  vehicleId: string;
  vehicleRegistration: string;
  serialVehicleDigits: string;
  actualVehicleDigits: string;
  driverName: string;
  tripStartDate: string;
  tripEndDate: string;
  createdAt: string;
  updatedAt: string;
  wasModified: boolean;
}

export interface SerialValidationReport {
  totalTrips: number;
  validTrips: number;
  mismatchedTrips: number;
  mismatches: SerialMismatch[];
  generatedAt: string;
}

/**
 * Extracts the 4-digit vehicle identifier from a trip serial number
 * Format: TYY-####-XXXX where #### are the vehicle digits
 */
function extractSerialVehicleDigits(serialNumber: string): string | null {
  if (!serialNumber) return null;
  
  const parts = serialNumber.split('-');
  if (parts.length !== 3) return null;
  
  // Return the second part (the 4-digit vehicle identifier)
  return parts[1];
}

/**
 * Extracts the last 4 digits from a vehicle registration number
 */
function extractVehicleDigits(registration: string): string {
  if (!registration) return '0000';
  
  // Remove all non-digit characters and take last 4 digits
  const digits = registration.replace(/[^0-9]/g, '');
  return digits.slice(-4).padStart(4, '0');
}

/**
 * Validates if a trip's serial number matches its assigned vehicle
 */
export function validateTripSerial(
  serialNumber: string,
  vehicleRegistration: string
): boolean {
  const serialDigits = extractSerialVehicleDigits(serialNumber);
  const vehicleDigits = extractVehicleDigits(vehicleRegistration);
  
  return serialDigits === vehicleDigits;
}

/**
 * Scans the database for trips with mismatched serial numbers
 * @param organizationId - Optional organization ID to scope the scan
 * @param limit - Maximum number of mismatches to return (default: all)
 */
export async function detectSerialMismatches(
  organizationId?: string,
  limit?: number
): Promise<SerialValidationReport> {
  try {
    logger.debug('Starting serial number mismatch detection...');
    
    // First, get total count to bypass Supabase's default 1000 row limit
    let countQuery = supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .not('trip_serial_number', 'is', null)
      .not('vehicle_id', 'is', null)
      .is('deleted_at', null);
    
    if (organizationId) {
      countQuery = countQuery.eq('organization_id', organizationId);
    }
    
    const { count: totalCount } = await countQuery;
    logger.debug(`Total trips to validate: ${totalCount}`);
    
    // Build query to get trips with vehicle information
    // Use .range() to bypass Supabase's default 1000 row limit
    let query = supabase
      .from('trips')
      .select(`
        id,
        trip_serial_number,
        vehicle_id,
        driver_name,
        trip_start_date,
        trip_end_date,
        created_at,
        updated_at,
        organization_id,
        vehicles!inner(
          registration_number
        )
      `)
      .not('trip_serial_number', 'is', null)
      .not('vehicle_id', 'is', null)
      .is('deleted_at', null)
      .range(0, (totalCount || 10000) - 1);  // Fetch ALL trips, not just first 1000
    
    // Filter by organization if provided
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: trips, error } = await query;
    
    if (error) {
      logger.error('Error fetching trips for validation:', error);
      throw error;
    }
    
    if (!trips || trips.length === 0) {
      logger.debug('No trips found for validation');
      return {
        totalTrips: 0,
        validTrips: 0,
        mismatchedTrips: 0,
        mismatches: [],
        generatedAt: new Date().toISOString()
      };
    }
    
    logger.debug(`Scanning ${trips.length} trips for serial number mismatches...`);
    
    const mismatches: SerialMismatch[] = [];
    let validCount = 0;
    
    for (const trip of trips) {
      const vehicleRegistration = (trip.vehicles as any).registration_number;
      const serialDigits = extractSerialVehicleDigits(trip.trip_serial_number);
      const vehicleDigits = extractVehicleDigits(vehicleRegistration);
      
      if (serialDigits !== vehicleDigits) {
        // Check if trip was modified (could indicate vehicle was changed)
        const wasModified = new Date(trip.updated_at).getTime() > 
                           new Date(trip.created_at).getTime() + 60000; // More than 1 minute difference
        
        mismatches.push({
          tripId: trip.id,
          tripSerialNumber: trip.trip_serial_number,
          vehicleId: trip.vehicle_id,
          vehicleRegistration,
          serialVehicleDigits: serialDigits || 'N/A',
          actualVehicleDigits: vehicleDigits,
          driverName: trip.driver_name,
          tripStartDate: trip.trip_start_date,
          tripEndDate: trip.trip_end_date,
          createdAt: trip.created_at,
          updatedAt: trip.updated_at,
          wasModified
        });
      } else {
        validCount++;
      }
    }
    
    // Apply limit if specified
    const limitedMismatches = limit ? mismatches.slice(0, limit) : mismatches;
    
    logger.debug(`Validation complete: ${validCount} valid, ${mismatches.length} mismatches found`);
    
    return {
      totalTrips: trips.length,
      validTrips: validCount,
      mismatchedTrips: mismatches.length,
      mismatches: limitedMismatches,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error detecting serial mismatches:', error);
    throw error;
  }
}

/**
 * Checks if a specific trip has a serial number mismatch
 */
export async function checkTripSerialMismatch(tripId: string): Promise<{
  hasMismatch: boolean;
  details?: SerialMismatch;
}> {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        id,
        trip_serial_number,
        vehicle_id,
        driver_name,
        trip_start_date,
        trip_end_date,
        created_at,
        updated_at,
        vehicles!inner(
          registration_number
        )
      `)
      .eq('id', tripId)
      .single();
    
    if (error || !trip) {
      throw new Error('Trip not found');
    }
    
    const vehicleRegistration = (trip.vehicles as any).registration_number;
    const serialDigits = extractSerialVehicleDigits(trip.trip_serial_number);
    const vehicleDigits = extractVehicleDigits(vehicleRegistration);
    
    const hasMismatch = serialDigits !== vehicleDigits;
    
    if (!hasMismatch) {
      return { hasMismatch: false };
    }
    
    const wasModified = new Date(trip.updated_at).getTime() > 
                       new Date(trip.created_at).getTime() + 60000;
    
    return {
      hasMismatch: true,
      details: {
        tripId: trip.id,
        tripSerialNumber: trip.trip_serial_number,
        vehicleId: trip.vehicle_id,
        vehicleRegistration,
        serialVehicleDigits: serialDigits || 'N/A',
        actualVehicleDigits: vehicleDigits,
        driverName: trip.driver_name,
        tripStartDate: trip.trip_start_date,
        tripEndDate: trip.trip_end_date,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
        wasModified
      }
    };
  } catch (error) {
    logger.error('Error checking trip serial mismatch:', error);
    throw error;
  }
}

/**
 * Generates a formatted report of serial number mismatches
 */
export function formatMismatchReport(report: SerialValidationReport): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('   TRIP SERIAL NUMBER VALIDATION REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push('');
  lines.push('SUMMARY:');
  lines.push(`  Total Trips Scanned: ${report.totalTrips}`);
  lines.push(`  Valid Serials: ${report.validTrips} (${((report.validTrips / report.totalTrips) * 100).toFixed(1)}%)`);
  lines.push(`  Mismatched Serials: ${report.mismatchedTrips} (${((report.mismatchedTrips / report.totalTrips) * 100).toFixed(1)}%)`);
  lines.push('');
  
  if (report.mismatches.length > 0) {
    lines.push('MISMATCHES FOUND:');
    lines.push('───────────────────────────────────────────────────────────');
    
    report.mismatches.forEach((mismatch, index) => {
      lines.push('');
      lines.push(`${index + 1}. Trip: ${mismatch.tripSerialNumber}`);
      lines.push(`   Driver: ${mismatch.driverName}`);
      lines.push(`   Vehicle: ${mismatch.vehicleRegistration}`);
      lines.push(`   Serial Digits: ${mismatch.serialVehicleDigits} (from serial number)`);
      lines.push(`   Vehicle Digits: ${mismatch.actualVehicleDigits} (from vehicle registration)`);
      lines.push(`   Status: ${mismatch.wasModified ? '⚠️ MODIFIED after creation' : '📝 Created with mismatch'}`);
      lines.push(`   Date: ${new Date(mismatch.tripStartDate).toLocaleDateString()} - ${new Date(mismatch.tripEndDate).toLocaleDateString()}`);
      lines.push(`   Created: ${new Date(mismatch.createdAt).toLocaleString()}`);
      lines.push(`   Updated: ${new Date(mismatch.updatedAt).toLocaleString()}`);
    });
    
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('');
    lines.push('POTENTIAL CAUSES:');
    lines.push('  • Vehicle was changed after trip creation');
    lines.push('  • Data import/migration error');
    lines.push('  • Manual serial number entry');
    lines.push('');
    lines.push('IMPACT:');
    lines.push('  ⚠️ These mismatches may indicate data integrity issues');
    lines.push('  ⚠️ Odometer readings may be incorrect for the vehicle');
    lines.push('  ⚠️ Mileage calculations may be inaccurate');
    lines.push('');
    lines.push('RECOMMENDATION:');
    lines.push('  Contact your administrator to investigate and fix these trips');
  } else {
    lines.push('✅ NO MISMATCHES FOUND');
    lines.push('   All trip serial numbers match their assigned vehicles.');
  }
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

/**
 * Exports mismatch report as CSV
 */
export function exportMismatchesAsCSV(mismatches: SerialMismatch[]): string {
  const headers = [
    'Trip Serial',
    'Vehicle Registration',
    'Serial Digits',
    'Vehicle Digits',
    'Driver',
    'Start Date',
    'End Date',
    'Created At',
    'Updated At',
    'Was Modified',
    'Trip ID'
  ];
  
  const rows = mismatches.map(m => [
    m.tripSerialNumber,
    m.vehicleRegistration,
    m.serialVehicleDigits,
    m.actualVehicleDigits,
    m.driverName,
    m.tripStartDate,
    m.tripEndDate,
    m.createdAt,
    m.updatedAt,
    m.wasModified ? 'Yes' : 'No',
    m.tripId
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}












