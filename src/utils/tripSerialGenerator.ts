import { supabase } from './supabaseClient';
import { handleSupabaseError } from './errors';

/**
 * Generates a trip serial number in the format TYY-####-XXXX
 * @param vehicleRegistration - Vehicle registration number (e.g., "CG04AB1234")
 * @param tripStartDate - Trip start date (YYYY-MM-DD format)
 * @param vehicleId - Vehicle ID for uniqueness tracking
 * @returns Promise<string> - Generated trip serial number
 */
export const generateTripSerialNumber = async (
  vehicleRegistration: string,
  tripStartDate: string,
  vehicleId: string
): Promise<string> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Extract YY (last 2 digits of year)
    const year = new Date(tripStartDate).getFullYear();
    const yy = year.toString().slice(-2);
    
    // Extract #### (last 4 digits from vehicle registration)
    const vehicleDigits = vehicleRegistration.replace(/[^0-9]/g, '');
    const last4Digits = vehicleDigits.slice(-4).padStart(4, '0');
    
    // Build the prefix for this vehicle and year
    const prefix = `T${yy}-${last4Digits}`;
    
    // Query to find the highest sequence number for THIS specific vehicle and year combination
    // Only within the current user's trips for consistent scope
    const { data: existingTrips, error } = await supabase
      .from('trips')
      .select('trip_serial_number')
      .eq('added_by', user.id)  // Only check within user's trips for consistency
      .eq('vehicle_id', vehicleId)  // Filter by specific vehicle
      .ilike('trip_serial_number', `${prefix}-%`)  // Match the prefix pattern
      .order('trip_serial_number', { ascending: false })
      .limit(1);

    if (error) {
      handleSupabaseError('fetch latest trip serial for generation', error);
      throw error;
    }

    // Find the maximum sequence number for this vehicle-year combination
    let maxSequence = 0;
    if (existingTrips && existingTrips.length > 0) {
      const latestSerial = existingTrips[0].trip_serial_number;
      const parts = latestSerial.split('-');
      const sequencePart = parts[2]; // Get the XXXX part (third segment)
      if (sequencePart) {
        const parsedSequence = parseInt(sequencePart, 10);
        if (!isNaN(parsedSequence)) {
          maxSequence = parsedSequence;
        }
      }
    }
    
    // Increment the sequence and format as 4-digit string
    const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
    
    // Construct the final trip serial number
    const tripSerialNumber = `${prefix}-${nextSequence}`;
    
    console.log(`Generated trip serial: ${tripSerialNumber} for vehicle ${vehicleId} (${vehicleRegistration})`);
    
    return tripSerialNumber;
  } catch (error) {
    console.error('Error generating trip serial number:', error);
    throw error;
  }
};

/**
 * Validates if a trip serial number is unique within the user's trips
 * @param tripSerialNumber - The trip serial number to validate
 * @param excludeTripId - Optional trip ID to exclude from the check (for updates)
 * @returns Promise<boolean> - True if unique, false if already exists
 */
export const validateTripSerialUniqueness = async (
  tripSerialNumber: string,
  excludeTripId?: string
): Promise<boolean> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    let query = supabase
      .from('trips')
      .select('id, trip_serial_number')
      .eq('added_by', user.id)  // Check within user's trips (same scope as generation)
      .eq('trip_serial_number', tripSerialNumber);
    
    // Exclude the current trip if updating
    if (excludeTripId) {
      query = query.neq('id', excludeTripId);
    }
    
    const { data, error } = await query;

    if (error) {
      handleSupabaseError('validate trip serial uniqueness', error);
      throw error;
    }

    // Log for debugging
    if (data && data.length > 0) {
      console.log(`Trip serial ${tripSerialNumber} already exists:`, data);
    }

    // Return true if no existing trip found (unique)
    return !data || data.length === 0;
  } catch (error) {
    console.error('Error validating trip serial uniqueness:', error);
    throw error;
  }
};

/**
 * Regenerates a trip serial number if the current one is not unique
 * This is a helper function to ensure we always get a unique serial
 */
export const ensureUniqueTripSerial = async (
  vehicleRegistration: string,
  tripStartDate: string,
  vehicleId: string,
  maxAttempts: number = 5
): Promise<string> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const serialNumber = await generateTripSerialNumber(
      vehicleRegistration,
      tripStartDate,
      vehicleId
    );
    
    const isUnique = await validateTripSerialUniqueness(serialNumber);
    
    if (isUnique) {
      return serialNumber;
    }
    
    console.warn(`Serial ${serialNumber} not unique, attempt ${attempt}/${maxAttempts}`);
    
    // Add a small delay before retrying to avoid race conditions
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error(`Could not generate unique trip serial after ${maxAttempts} attempts`);
};