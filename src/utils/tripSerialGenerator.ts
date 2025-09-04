import { supabase } from './supabaseClient';
import { handleSupabaseError } from './errors';

/**
 * Generates a trip serial number in the format TYY-####-XXXX
 * @param vehicleRegistration - Vehicle registration number (e.g., "CG04AB1234")
 * @param tripStartDate - Trip start date (YYYY-MM-DD format)
 * @param vehicleId - Vehicle ID (not directly used for uniqueness, but kept for context)
 * @returns Promise<string> - Generated trip serial number
 */
export const generateTripSerialNumber = async (
  vehicleRegistration: string,
  tripStartDate: string,
  vehicleId: string // Keep for function signature, but won't use for uniqueness logic
): Promise<string> => {
  try {
    // Extract YY (last 2 digits of year)
    const year = new Date(tripStartDate).getFullYear();
    const yy = year.toString().slice(-2);
    
    // Extract #### (last 4 digits from vehicle registration)
    // This part is for readability/association, not global uniqueness
    const vehicleDigits = vehicleRegistration.replace(/[^0-9]/g, '');
    const last4Digits = vehicleDigits.slice(-4).padStart(4, '0');
    
    // Query Supabase to find the highest XXXX sequence from *any* trip serial number globally
    // This ensures global uniqueness of the XXXX part
    const { data: latestTrip, error } = await supabase
      .from('trips')
      .select('trip_serial_number')
      .order('trip_serial_number', { ascending: false }) // Order to get the highest serial number
      .limit(1) // Only need the single highest one
      .maybeSingle(); // Use maybeSingle to get null if no rows

    if (error) {
      handleSupabaseError('fetch latest trip serial for generation', error);
      throw error;
    }

    // Find the maximum sequence number (XXXX) for this vehicle-year combination
    let maxSequence = 0;
    if (latestTrip && latestTrip.trip_serial_number) {
      const parts = latestTrip.trip_serial_number.split('-');
      const sequencePart = parts.pop(); // Get the XXXX part
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