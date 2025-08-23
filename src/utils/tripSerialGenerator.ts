import { supabase } from './supabaseClient';
import { handleSupabaseError } from './errors';

/**
 * Generates a trip serial number in the format TYY-####-XXXX
 * @param vehicleRegistration - Vehicle registration number (e.g., "CG04AB1234")
 * @param tripStartDate - Trip start date (YYYY-MM-DD format)
 * @param vehicleId - Vehicle ID for querying existing trips
 * @returns Promise<string> - Generated trip serial number
 */
export const generateTripSerialNumber = async (
  vehicleRegistration: string,
  tripStartDate: string,
  vehicleId: string
): Promise<string> => {
  try {
    // Extract YY (last 2 digits of year)
    const year = new Date(tripStartDate).getFullYear();
    const yy = year.toString().slice(-2);
    
    // Extract #### (last 4 digits from vehicle registration)
    const vehicleDigits = vehicleRegistration.replace(/[^0-9]/g, ''); // Remove all non-numeric chars
    const last4Digits = vehicleDigits.slice(-4).padStart(4, '0'); // Get last 4 digits, pad with zeros
    
    // Query Supabase to find the highest XXXX sequence for this vehicle and year
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw new Error('User not authenticated');
    }
    
    if (!user) {
      throw new Error('No user found');
    }

    // Get all trips for this vehicle in the same year
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    
    const { data: existingTrips, error } = await supabase
      .from('trips')
      .select('trip_serial_number')
      .eq('added_by', user.id)
      .eq('vehicle_id', vehicleId)
      .gte('trip_start_date', yearStart)
      .lte('trip_start_date', yearEnd)
      .order('trip_serial_number', { ascending: false });

    if (error) {
      handleSupabaseError('fetch existing trips for serial generation', error);
      throw error;
    }

    // Find the maximum sequence number (XXXX) for this vehicle-year combination
    let maxSequence = 0;
    const prefix = `T${yy}-${last4Digits}-`;
    
    if (existingTrips && existingTrips.length > 0) {
      existingTrips.forEach(trip => {
        if (trip.trip_serial_number && trip.trip_serial_number.startsWith(prefix)) {
          // Extract the XXXX part (last 4 characters after the last hyphen)
          const sequencePart = trip.trip_serial_number.split('-').pop();
          if (sequencePart) {
            const sequenceNum = parseInt(sequencePart, 10);
            if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
              maxSequence = sequenceNum;
            }
          }
        }
      });
    }
    
    // Increment the sequence and format as 4-digit string
    const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
    
    // Construct the final trip serial number
    const tripSerialNumber = `T${yy}-${last4Digits}-${nextSequence}`;
    
    return tripSerialNumber;
  } catch (error) {
    console.error('Error generating trip serial number:', error);
    throw error;
  }
};

/**
 * Validates if a trip serial number is unique
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
      .select('id')
      .eq('added_by', user.id)
      .eq('trip_serial_number', tripSerialNumber);
    
    // Exclude the current trip if updating
    if (excludeTripId) {
      query = query.neq('id', excludeTripId);
    }
    
    const { data, error } = await query.limit(1);

    if (error) {
      handleSupabaseError('validate trip serial uniqueness', error);
      throw error;
    }

    // Return true if no existing trip found (unique)
    return !data || data.length === 0;
  } catch (error) {
    console.error('Error validating trip serial uniqueness:', error);
    throw error;
  }
};