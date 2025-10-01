import { supabase } from './supabaseClient';
import { handleSupabaseError } from './errors';

/**
 * Generates a trip serial number in the format TYY-####-XXXX
 * @param vehicleRegistration - Vehicle registration number (e.g., "CG04AB1234")
 * @param tripStartDate - Trip start date (YYYY-MM-DD format)
 * @param vehicleId - Vehicle ID for uniqueness tracking
 * @param attemptNumber - Current attempt number for incrementing sequence
 * @returns Promise<string> - Generated trip serial number
 */
export const generateTripSerialNumber = async (
  vehicleRegistration: string,
  tripStartDate: string,
  vehicleId: string,
  attemptNumber: number = 0
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
    
    // Get user's organization ID first
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgUser) {
      throw new Error('User not associated with any organization');
    }

    // Query to find ALL existing serial numbers for THIS specific vehicle and year
    // This ensures we get the complete picture of what sequences exist
    const { data: existingTrips, error } = await supabase
      .from('trips')
      .select('trip_serial_number')
      .eq('organization_id', orgUser.organization_id)  // Check within organization
      .eq('vehicle_id', vehicleId)  // Filter by specific vehicle
      .ilike('trip_serial_number', `${prefix}-%`)  // Match the prefix pattern
      .order('trip_serial_number', { ascending: false });

    if (error) {
      handleSupabaseError('fetch existing trip serials', error);
      throw error;
    }

    // Extract all existing sequence numbers to find gaps or the next available
    const existingSequences = new Set<number>();
    let maxSequence = 0;
    
    if (existingTrips && existingTrips.length > 0) {
      existingTrips.forEach(trip => {
        if (trip.trip_serial_number) {
          const parts = trip.trip_serial_number.split('-');
          const sequencePart = parts[2]; // Get the XXXX part (third segment)
          if (sequencePart) {
            const parsedSequence = parseInt(sequencePart, 10);
            if (!isNaN(parsedSequence)) {
              existingSequences.add(parsedSequence);
              maxSequence = Math.max(maxSequence, parsedSequence);
            }
          }
        }
      });
    }
    
    // Find the next available sequence number
    // Start from max + 1 + attempt number to ensure we try different numbers
    let nextSequence = maxSequence + 1 + attemptNumber;
    
    // Check if this sequence is already taken (shouldn't happen but being safe)
    while (existingSequences.has(nextSequence)) {
      nextSequence++;
    }
    
    // Format as 4-digit string
    const sequenceStr = nextSequence.toString().padStart(4, '0');
    
    // Construct the final trip serial number
    const tripSerialNumber = `${prefix}-${sequenceStr}`;
    
    console.log(`Generated trip serial: ${tripSerialNumber} for vehicle ${vehicleId} (${vehicleRegistration}), attempt ${attemptNumber}`);
    
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

    // Get user's organization ID
    const { data: orgUser } = await supabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgUser) {
      throw new Error('User not associated with any organization');
    }

    let query = supabase
      .from('trips')
      .select('id, trip_serial_number')
      .eq('organization_id', orgUser.organization_id)  // Check within organization
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
 * Ensures we get a unique trip serial number
 * Uses intelligent retry with incrementing attempts
 */
export const ensureUniqueTripSerial = async (
  vehicleRegistration: string,
  tripStartDate: string,
  vehicleId: string,
  maxAttempts: number = 10
): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pass the attempt number to the generator so it can increment accordingly
    const serialNumber = await generateTripSerialNumber(
      vehicleRegistration,
      tripStartDate,
      vehicleId,
      attempt
    );
    
    const isUnique = await validateTripSerialUniqueness(serialNumber);
    
    if (isUnique) {
      console.log(`Successfully generated unique serial: ${serialNumber}`);
      return serialNumber;
    }
    
    console.warn(`Serial ${serialNumber} not unique, attempt ${attempt + 1}/${maxAttempts}`);
  }
  
  // If all attempts fail, generate a serial with timestamp to ensure uniqueness
  const timestamp = Date.now().toString().slice(-6);
  const year = new Date(tripStartDate).getFullYear().toString().slice(-2);
  const vehicleDigits = vehicleRegistration.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
  const fallbackSerial = `T${year}-${vehicleDigits}-${timestamp}`;
  
  console.log(`Using fallback serial with timestamp: ${fallbackSerial}`);
  return fallbackSerial;
};