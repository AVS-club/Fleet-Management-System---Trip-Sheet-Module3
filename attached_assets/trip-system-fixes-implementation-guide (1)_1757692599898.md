# Trip System Data Integrity Fixes - Implementation Guide

## Overview
This document provides step-by-step implementation instructions to fix all 10 identified data integrity gaps in your trip tracking system. Each fix includes SQL migrations, TypeScript validation code, and pseudocode for clarity.

---

## Fix 1: Odometer Continuity Validation

### Problem
No validation that odometer readings are continuous between consecutive trips for the same vehicle.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_odometer_continuity_check.sql

-- Create a function to validate odometer continuity
CREATE OR REPLACE FUNCTION validate_odometer_continuity()
RETURNS TRIGGER AS $$
DECLARE
    last_trip RECORD;
    odometer_gap INTEGER;
BEGIN
    -- Get the most recent trip for this vehicle
    SELECT end_km, trip_end_date 
    INTO last_trip
    FROM trips 
    WHERE vehicle_id = NEW.vehicle_id 
        AND id != NEW.id
        AND created_by = NEW.created_by
    ORDER BY trip_end_date DESC 
    LIMIT 1;
    
    -- If there's a previous trip, validate continuity
    IF last_trip IS NOT NULL THEN
        odometer_gap := NEW.start_km - last_trip.end_km;
        
        -- Allow small gaps (0-50 km) for movements between trips
        IF odometer_gap < 0 THEN
            RAISE EXCEPTION 'Invalid odometer reading: Start KM (%) is less than previous trip end KM (%)', 
                NEW.start_km, last_trip.end_km;
        ELSIF odometer_gap > 50 THEN
            -- Log warning but allow (could be legitimate maintenance/personal use)
            RAISE WARNING 'Large odometer gap detected: % km between trips', odometer_gap;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new trips
CREATE TRIGGER check_odometer_continuity
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION validate_odometer_continuity();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_end_date 
ON trips(vehicle_id, trip_end_date DESC);
```

### TypeScript Validation
```typescript
// File: src/utils/validators/odometerValidator.ts

import { supabase } from '../supabaseClient';
import { Trip } from '@/types';

interface OdometerValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestedStartKm?: number;
}

export async function validateOdometerContinuity(
  vehicleId: string,
  startKm: number,
  currentTripId?: string
): Promise<OdometerValidationResult> {
  try {
    // Get the last trip for this vehicle
    let query = supabase
      .from('trips')
      .select('end_km, trip_end_date, trip_serial_number')
      .eq('vehicle_id', vehicleId)
      .order('trip_end_date', { ascending: false })
      .limit(1);
    
    if (currentTripId) {
      query = query.neq('id', currentTripId);
    }
    
    const { data: lastTrip, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    if (!lastTrip) {
      return { isValid: true };
    }
    
    const gap = startKm - lastTrip.end_km;
    
    if (gap < 0) {
      return {
        isValid: false,
        error: `Start KM (${startKm}) cannot be less than the previous trip's end KM (${lastTrip.end_km})`,
        suggestedStartKm: lastTrip.end_km
      };
    }
    
    if (gap > 50) {
      return {
        isValid: true,
        warning: `Large gap detected: ${gap} km since last trip (${lastTrip.trip_serial_number}). Please verify this is correct.`,
        suggestedStartKm: lastTrip.end_km
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Error validating odometer continuity:', error);
    return {
      isValid: true, // Don't block on validation errors
      warning: 'Could not validate odometer reading'
    };
  }
}
```

### Frontend Integration
```typescript
// File: src/components/trips/TripForm.tsx
// Add to your existing TripForm component

import { validateOdometerContinuity } from '@/utils/validators/odometerValidator';

// Inside your TripForm component, add this validation
const handleStartKmBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
  const startKm = parseFloat(e.target.value);
  
  if (!isNaN(startKm) && selectedVehicleId) {
    const validation = await validateOdometerContinuity(
      selectedVehicleId,
      startKm,
      editingTrip?.id
    );
    
    if (!validation.isValid) {
      toast.error(validation.error);
      if (validation.suggestedStartKm) {
        setValue('start_km', validation.suggestedStartKm);
      }
    } else if (validation.warning) {
      toast.warning(validation.warning);
    }
  }
};

// Add to your Start KM input
<Input
  label="Start KM"
  type="number"
  onBlur={handleStartKmBlur}
  // ... rest of your props
/>
```

---

## Fix 2: Concurrent Trip Prevention

### Problem
No logic preventing overlapping trips for the same vehicle or driver.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_concurrent_trip_prevention.sql

-- Function to check for overlapping trips
CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    -- Check vehicle overlap
    SELECT COUNT(*) INTO overlap_count
    FROM trips
    WHERE vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND created_by = NEW.created_by
        AND (
            (NEW.trip_start_date, NEW.trip_end_date) OVERLAPS 
            (trip_start_date, trip_end_date)
        );
    
    IF overlap_count > 0 THEN
        RAISE EXCEPTION 'Vehicle is already assigned to another trip during this period';
    END IF;
    
    -- Check driver overlap
    SELECT COUNT(*) INTO overlap_count
    FROM trips
    WHERE driver_id = NEW.driver_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND created_by = NEW.created_by
        AND (
            (NEW.trip_start_date, NEW.trip_end_date) OVERLAPS 
            (trip_start_date, trip_end_date)
        );
    
    IF overlap_count > 0 THEN
        RAISE EXCEPTION 'Driver is already assigned to another trip during this period';
    END IF;
    
    -- Validate dates
    IF NEW.trip_end_date < NEW.trip_start_date THEN
        RAISE EXCEPTION 'Trip end date must be after start date';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER prevent_concurrent_trips
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION check_trip_overlap();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_dates 
ON trips(vehicle_id, trip_start_date, trip_end_date);

CREATE INDEX IF NOT EXISTS idx_trips_driver_dates 
ON trips(driver_id, trip_start_date, trip_end_date);
```

### TypeScript Validation
```typescript
// File: src/utils/validators/concurrentTripValidator.ts

import { supabase } from '../supabaseClient';

interface OverlapCheckResult {
  hasOverlap: boolean;
  conflictingTrips: Array<{
    trip_serial_number: string;
    start_date: string;
    end_date: string;
    type: 'vehicle' | 'driver';
  }>;
}

export async function checkTripOverlap(
  vehicleId: string,
  driverId: string,
  startDate: string,
  endDate: string,
  excludeTripId?: string
): Promise<OverlapCheckResult> {
  const conflictingTrips = [];
  
  try {
    // Check vehicle conflicts
    let vehicleQuery = supabase
      .from('trips')
      .select('trip_serial_number, trip_start_date, trip_end_date')
      .eq('vehicle_id', vehicleId)
      .or(`trip_start_date.lte.${endDate},trip_end_date.gte.${startDate}`);
    
    if (excludeTripId) {
      vehicleQuery = vehicleQuery.neq('id', excludeTripId);
    }
    
    const { data: vehicleConflicts } = await vehicleQuery;
    
    if (vehicleConflicts && vehicleConflicts.length > 0) {
      vehicleConflicts.forEach(trip => {
        conflictingTrips.push({
          trip_serial_number: trip.trip_serial_number,
          start_date: trip.trip_start_date,
          end_date: trip.trip_end_date,
          type: 'vehicle' as const
        });
      });
    }
    
    // Check driver conflicts
    let driverQuery = supabase
      .from('trips')
      .select('trip_serial_number, trip_start_date, trip_end_date')
      .eq('driver_id', driverId)
      .or(`trip_start_date.lte.${endDate},trip_end_date.gte.${startDate}`);
    
    if (excludeTripId) {
      driverQuery = driverQuery.neq('id', excludeTripId);
    }
    
    const { data: driverConflicts } = await driverQuery;
    
    if (driverConflicts && driverConflicts.length > 0) {
      driverConflicts.forEach(trip => {
        conflictingTrips.push({
          trip_serial_number: trip.trip_serial_number,
          start_date: trip.trip_start_date,
          end_date: trip.trip_end_date,
          type: 'driver' as const
        });
      });
    }
    
    return {
      hasOverlap: conflictingTrips.length > 0,
      conflictingTrips
    };
  } catch (error) {
    console.error('Error checking trip overlap:', error);
    return { hasOverlap: false, conflictingTrips: [] };
  }
}
```

---

## Fix 3: Mileage Calculation Chain Integrity

### Problem
No validation to ensure the mileage calculation chain remains intact when deleting refueling trips.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_mileage_chain_integrity.sql

-- Add soft delete for trips to preserve mileage chain
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create function to handle trip deletion with chain validation
CREATE OR REPLACE FUNCTION handle_trip_deletion()
RETURNS TRIGGER AS $$
DECLARE
    dependent_trips_count INTEGER;
BEGIN
    -- Check if this is a refueling trip
    IF OLD.refueling_done = true THEN
        -- Count trips that depend on this refueling
        SELECT COUNT(*) INTO dependent_trips_count
        FROM trips
        WHERE vehicle_id = OLD.vehicle_id
            AND trip_start_date > OLD.trip_end_date
            AND deleted_at IS NULL
            AND refueling_done = false;
        
        IF dependent_trips_count > 0 THEN
            -- Soft delete instead of hard delete
            UPDATE trips 
            SET deleted_at = NOW(),
                deletion_reason = 'Soft deleted - has dependent non-refueling trips'
            WHERE id = OLD.id;
            
            -- Prevent the actual deletion
            RETURN NULL;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion
CREATE TRIGGER preserve_mileage_chain
BEFORE DELETE ON trips
FOR EACH ROW
EXECUTE FUNCTION handle_trip_deletion();

-- Function to recalculate mileage for affected trips
CREATE OR REPLACE FUNCTION recalculate_trip_mileage(
    p_trip_id UUID
) RETURNS VOID AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
BEGIN
    -- Get the trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id AND deleted_at IS NULL;
    
    IF NOT FOUND OR NOT trip_record.refueling_done THEN
        RETURN;
    END IF;
    
    -- Find previous refueling trip
    SELECT * INTO prev_refueling
    FROM trips
    WHERE vehicle_id = trip_record.vehicle_id
        AND trip_end_date < trip_record.trip_end_date
        AND refueling_done = true
        AND deleted_at IS NULL
    ORDER BY trip_end_date DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Tank-to-tank calculation
        UPDATE trips
        SET calculated_kmpl = (trip_record.end_km - prev_refueling.end_km) / 
                              NULLIF(trip_record.fuel_quantity, 0)
        WHERE id = p_trip_id;
    ELSE
        -- Simple calculation for first refueling
        UPDATE trips
        SET calculated_kmpl = (trip_record.end_km - trip_record.start_km) / 
                              NULLIF(trip_record.fuel_quantity, 0)
        WHERE id = p_trip_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### TypeScript Handler
```typescript
// File: src/utils/mileageChainManager.ts

import { supabase } from './supabaseClient';
import { Trip } from '@/types';

export interface MileageChainValidation {
  canDelete: boolean;
  reason?: string;
  affectedTrips?: string[];
  requiresSoftDelete?: boolean;
}

export async function validateMileageChainDeletion(
  tripId: string
): Promise<MileageChainValidation> {
  try {
    // Get the trip to be deleted
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    
    if (tripError || !trip) {
      throw new Error('Trip not found');
    }
    
    // If not a refueling trip, can delete freely
    if (!trip.refueling_done) {
      return { canDelete: true };
    }
    
    // Check for dependent trips
    const { data: dependentTrips, error: depError } = await supabase
      .from('trips')
      .select('trip_serial_number')
      .eq('vehicle_id', trip.vehicle_id)
      .gt('trip_start_date', trip.trip_end_date)
      .is('deleted_at', null);
    
    if (depError) {
      throw depError;
    }
    
    if (dependentTrips && dependentTrips.length > 0) {
      return {
        canDelete: false,
        requiresSoftDelete: true,
        reason: 'This refueling trip has dependent trips that rely on it for mileage calculation',
        affectedTrips: dependentTrips.map(t => t.trip_serial_number)
      };
    }
    
    return { canDelete: true };
  } catch (error) {
    console.error('Error validating mileage chain:', error);
    return {
      canDelete: false,
      reason: 'Error validating deletion impact'
    };
  }
}

export async function recalculateMileageChain(
  vehicleId: string,
  fromDate: string
): Promise<void> {
  try {
    // Get all refueling trips after the specified date
    const { data: refuelingTrips, error } = await supabase
      .from('trips')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('refueling_done', true)
      .gte('trip_end_date', fromDate)
      .is('deleted_at', null)
      .order('trip_end_date', { ascending: true });
    
    if (error) throw error;
    
    // Recalculate each trip's mileage
    for (const trip of refuelingTrips || []) {
      await supabase.rpc('recalculate_trip_mileage', {
        p_trip_id: trip.id
      });
    }
  } catch (error) {
    console.error('Error recalculating mileage chain:', error);
    throw error;
  }
}
```

---

## Fix 4: Unrealistic Value Detection

### Problem
Need additional validation for unrealistic values beyond the 15% deviation.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_value_range_validation.sql

-- Create vehicle capacity table for validation
CREATE TABLE IF NOT EXISTS vehicle_capacities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    fuel_tank_capacity NUMERIC NOT NULL,
    max_daily_distance INTEGER DEFAULT 1000,
    max_mileage NUMERIC DEFAULT 40, -- km/L max for trucks
    min_mileage NUMERIC DEFAULT 2,  -- km/L min
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(vehicle_id)
);

-- Function to validate trip values
CREATE OR REPLACE FUNCTION validate_trip_values()
RETURNS TRIGGER AS $$
DECLARE
    vehicle_capacity RECORD;
    trip_distance NUMERIC;
    trip_duration_days NUMERIC;
    daily_distance NUMERIC;
BEGIN
    -- Get vehicle capacities
    SELECT * INTO vehicle_capacity
    FROM vehicle_capacities
    WHERE vehicle_id = NEW.vehicle_id;
    
    -- Calculate trip metrics
    trip_distance := NEW.end_km - NEW.start_km;
    trip_duration_days := EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 86400.0;
    
    IF trip_duration_days > 0 THEN
        daily_distance := trip_distance / trip_duration_days;
    ELSE
        daily_distance := trip_distance;
    END IF;
    
    -- Validate distance
    IF trip_distance < 1 THEN
        RAISE EXCEPTION 'Trip distance must be at least 1 km';
    END IF;
    
    -- Validate against vehicle capacity if exists
    IF vehicle_capacity IS NOT NULL THEN
        -- Check fuel quantity
        IF NEW.fuel_quantity > vehicle_capacity.fuel_tank_capacity THEN
            RAISE EXCEPTION 'Fuel quantity (% L) exceeds tank capacity (% L)', 
                NEW.fuel_quantity, vehicle_capacity.fuel_tank_capacity;
        END IF;
        
        -- Check daily distance
        IF daily_distance > vehicle_capacity.max_daily_distance THEN
            RAISE WARNING 'Daily distance (% km) exceeds typical maximum (% km)', 
                daily_distance, vehicle_capacity.max_daily_distance;
        END IF;
        
        -- Check mileage if refueling done
        IF NEW.refueling_done AND NEW.calculated_kmpl IS NOT NULL THEN
            IF NEW.calculated_kmpl > vehicle_capacity.max_mileage THEN
                RAISE EXCEPTION 'Mileage (% km/L) exceeds maximum possible (% km/L)', 
                    NEW.calculated_kmpl, vehicle_capacity.max_mileage;
            END IF;
            
            IF NEW.calculated_kmpl < vehicle_capacity.min_mileage THEN
                RAISE WARNING 'Extremely low mileage detected: % km/L', NEW.calculated_kmpl;
            END IF;
        END IF;
    ELSE
        -- Default validations when no vehicle capacity defined
        IF NEW.fuel_quantity > 500 THEN -- Default max for trucks
            RAISE WARNING 'Large fuel quantity: % L. Please verify.', NEW.fuel_quantity;
        END IF;
        
        IF daily_distance > 1000 THEN
            RAISE WARNING 'High daily distance: % km. Please verify.', daily_distance;
        END IF;
        
        IF NEW.calculated_kmpl > 40 OR NEW.calculated_kmpl < 2 THEN
            RAISE WARNING 'Unusual mileage: % km/L. Please verify.', NEW.calculated_kmpl;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_trip_realistic_values
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION validate_trip_values();
```

### TypeScript Validation
```typescript
// File: src/utils/validators/valueRangeValidator.ts

interface VehicleCapacity {
  fuel_tank_capacity: number;
  max_daily_distance: number;
  max_mileage: number;
  min_mileage: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TripValueValidator {
  private static DEFAULT_LIMITS = {
    MIN_DISTANCE: 1,
    MAX_FUEL_TRUCK: 500,
    MAX_FUEL_CAR: 100,
    MAX_DAILY_DISTANCE: 1000,
    MAX_MILEAGE_TRUCK: 40,
    MAX_MILEAGE_CAR: 30,
    MIN_MILEAGE: 2,
  };
  
  static async validateTripValues(
    tripData: Partial<Trip>,
    vehicleType: 'truck' | 'lorry' | 'car' | 'pickup',
    vehicleCapacity?: VehicleCapacity
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Calculate basic metrics
    const distance = (tripData.end_km || 0) - (tripData.start_km || 0);
    const tripDurationMs = new Date(tripData.trip_end_date!).getTime() - 
                           new Date(tripData.trip_start_date!).getTime();
    const tripDurationDays = tripDurationMs / (1000 * 60 * 60 * 24);
    const dailyDistance = tripDurationDays > 0 ? distance / tripDurationDays : distance;
    
    // Validate distance
    if (distance < this.DEFAULT_LIMITS.MIN_DISTANCE) {
      errors.push(`Trip distance must be at least ${this.DEFAULT_LIMITS.MIN_DISTANCE} km`);
    }
    
    // Validate fuel quantity
    const maxFuel = vehicleCapacity?.fuel_tank_capacity || 
      (vehicleType === 'car' ? this.DEFAULT_LIMITS.MAX_FUEL_CAR : this.DEFAULT_LIMITS.MAX_FUEL_TRUCK);
    
    if (tripData.fuel_quantity && tripData.fuel_quantity > maxFuel) {
      errors.push(`Fuel quantity (${tripData.fuel_quantity}L) exceeds tank capacity (${maxFuel}L)`);
    }
    
    // Validate daily distance
    const maxDaily = vehicleCapacity?.max_daily_distance || this.DEFAULT_LIMITS.MAX_DAILY_DISTANCE;
    if (dailyDistance > maxDaily) {
      warnings.push(`Daily distance (${dailyDistance.toFixed(0)} km) exceeds typical maximum (${maxDaily} km)`);
    }
    
    // Validate mileage
    if (tripData.calculated_kmpl) {
      const maxMileage = vehicleCapacity?.max_mileage || 
        (vehicleType === 'car' ? this.DEFAULT_LIMITS.MAX_MILEAGE_CAR : this.DEFAULT_LIMITS.MAX_MILEAGE_TRUCK);
      const minMileage = vehicleCapacity?.min_mileage || this.DEFAULT_LIMITS.MIN_MILEAGE;
      
      if (tripData.calculated_kmpl > maxMileage) {
        errors.push(`Mileage (${tripData.calculated_kmpl.toFixed(2)} km/L) exceeds maximum possible (${maxMileage} km/L)`);
      }
      
      if (tripData.calculated_kmpl < minMileage) {
        warnings.push(`Very low mileage detected: ${tripData.calculated_kmpl.toFixed(2)} km/L`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

---

## Fix 5: Data Correction Cascade Management

### Problem
No clear mechanism for handling corrections that affect multiple records.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_correction_cascade.sql

-- Create audit table for tracking corrections
CREATE TABLE IF NOT EXISTS trip_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    correction_reason TEXT,
    affects_subsequent_trips BOOLEAN DEFAULT false,
    corrected_by UUID REFERENCES auth.users(id),
    corrected_at TIMESTAMP DEFAULT NOW()
);

-- Function to cascade odometer corrections
CREATE OR REPLACE FUNCTION cascade_odometer_correction(
    p_trip_id UUID,
    p_old_end_km INTEGER,
    p_new_end_km INTEGER,
    p_correction_reason TEXT
) RETURNS TABLE(
    affected_trip_id UUID,
    old_start_km INTEGER,
    new_start_km INTEGER
) AS $$
DECLARE
    km_difference INTEGER;
    trip_record RECORD;
BEGIN
    km_difference := p_new_end_km - p_old_end_km;
    
    -- Get all subsequent trips for the same vehicle
    FOR trip_record IN
        SELECT t.id, t.start_km, t.end_km
        FROM trips t
        JOIN trips corrected_trip ON corrected_trip.id = p_trip_id
        WHERE t.vehicle_id = corrected_trip.vehicle_id
            AND t.trip_start_date > corrected_trip.trip_end_date
            AND t.deleted_at IS NULL
        ORDER BY t.trip_start_date
    LOOP
        -- Update the trip's odometer readings
        UPDATE trips
        SET start_km = start_km + km_difference,
            end_km = end_km + km_difference
        WHERE id = trip_record.id;
        
        -- Log the correction
        INSERT INTO trip_corrections (
            trip_id, field_name, old_value, new_value, 
            correction_reason, affects_subsequent_trips
        ) VALUES (
            trip_record.id, 'odometer_cascade', 
            trip_record.start_km::TEXT, 
            (trip_record.start_km + km_difference)::TEXT,
            p_correction_reason, true
        );
        
        -- Return affected trip info
        RETURN QUERY SELECT 
            trip_record.id,
            trip_record.start_km,
            trip_record.start_km + km_difference;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create index for correction lookups
CREATE INDEX idx_trip_corrections_trip_id ON trip_corrections(trip_id);
```

### TypeScript Cascade Manager
```typescript
// File: src/utils/correctionCascadeManager.ts

import { supabase } from './supabaseClient';

interface CascadeCorrection {
  tripId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

interface CascadeResult {
  success: boolean;
  affectedTrips: Array<{
    trip_id: string;
    old_value: any;
    new_value: any;
  }>;
  error?: string;
}

export class CorrectionCascadeManager {
  static async cascadeOdometerCorrection(
    tripId: string,
    newEndKm: number,
    reason: string
  ): Promise<CascadeResult> {
    try {
      // Get current trip data
      const { data: currentTrip, error: tripError } = await supabase
        .from('trips')
        .select('end_km, vehicle_id')
        .eq('id', tripId)
        .single();
      
      if (tripError || !currentTrip) {
        throw new Error('Trip not found');
      }
      
      const oldEndKm = currentTrip.end_km;
      
      // Check if cascade is needed
      if (oldEndKm === newEndKm) {
        return { success: true, affectedTrips: [] };
      }
      
      // Call the cascade function
      const { data: affectedTrips, error: cascadeError } = await supabase
        .rpc('cascade_odometer_correction', {
          p_trip_id: tripId,
          p_old_end_km: oldEndKm,
          p_new_end_km: newEndKm,
          p_correction_reason: reason
        });
      
      if (cascadeError) throw cascadeError;
      
      // Recalculate mileage for affected trips
      await this.recalculateAffectedMileage(currentTrip.vehicle_id, tripId);
      
      return {
        success: true,
        affectedTrips: affectedTrips || []
      };
    } catch (error) {
      console.error('Cascade correction failed:', error);
      return {
        success: false,
        affectedTrips: [],
        error: error.message
      };
    }
  }
  
  static async recalculateAffectedMileage(
    vehicleId: string,
    fromTripId: string
  ): Promise<void> {
    // Get the trip date
    const { data: trip } = await supabase
      .from('trips')
      .select('trip_end_date')
      .eq('id', fromTripId)
      .single();
    
    if (!trip) return;
    
    // Get all refueling trips after this date
    const { data: refuelingTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('refueling_done', true)
      .gte('trip_end_date', trip.trip_end_date)
      .order('trip_end_date');
    
    // Recalculate mileage for each
    for (const refuelTrip of refuelingTrips || []) {
      await supabase.rpc('recalculate_trip_mileage', {
        p_trip_id: refuelTrip.id
      });
    }
  }
  
  static async getCorrectionHistory(tripId: string): Promise<CascadeCorrection[]> {
    const { data, error } = await supabase
      .from('trip_corrections')
      .select('*')
      .eq('trip_id', tripId)
      .order('corrected_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching correction history:', error);
      return [];
    }
    
    return data.map(correction => ({
      tripId: correction.trip_id,
      fieldName: correction.field_name,
      oldValue: correction.old_value,
      newValue: correction.new_value,
      reason: correction.correction_reason
    }));
  }
}
```

---

## Fix 6: Trip Serial Number Monitoring

### Problem
Need better monitoring of serial number patterns and gaps.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_serial_number_monitoring.sql

-- Create table for retired/reserved serial numbers
CREATE TABLE IF NOT EXISTS trip_serial_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('retired', 'reserved', 'skip')) NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function to validate serial number format
CREATE OR REPLACE FUNCTION validate_serial_format()
RETURNS TRIGGER AS $$
BEGIN
    -- Check format: T[YY]-[4DIGITS]-[4DIGITS]
    IF NOT NEW.trip_serial_number ~ '^T\d{2}-\d{4}-\d{4}$' THEN
        RAISE EXCEPTION 'Invalid serial number format. Expected: TYY-####-#### (e.g., T25-1234-0001)';
    END IF;
    
    -- Check if serial is retired or reserved
    IF EXISTS (
        SELECT 1 FROM trip_serial_reservations 
        WHERE serial_number = NEW.trip_serial_number
            AND status IN ('retired', 'skip')
    ) THEN
        RAISE EXCEPTION 'Serial number % is retired/reserved and cannot be used', 
            NEW.trip_serial_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_trip_serial_format
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION validate_serial_format();

-- Function to detect gaps in serial numbers
CREATE OR REPLACE FUNCTION analyze_serial_gaps(
    p_vehicle_id UUID DEFAULT NULL,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())
) RETURNS TABLE(
    gap_start TEXT,
    gap_end TEXT,
    gap_size INTEGER
) AS $$
DECLARE
    prev_serial INTEGER := 0;
    curr_serial INTEGER;
    serial_record RECORD;
BEGIN
    FOR serial_record IN
        SELECT trip_serial_number,
               CAST(SPLIT_PART(trip_serial_number, '-', 3) AS INTEGER) as sequence_num
        FROM trips
        WHERE (p_vehicle_id IS NULL OR vehicle_id = p_vehicle_id)
            AND CAST(SUBSTRING(trip_serial_number, 2, 2) AS INTEGER) = p_year % 100
            AND deleted_at IS NULL
        ORDER BY sequence_num
    LOOP
        curr_serial := serial_record.sequence_num;
        
        IF prev_serial > 0 AND curr_serial - prev_serial > 1 THEN
            RETURN QUERY SELECT
                FORMAT('T%s-%s-%s', 
                    LPAD((p_year % 100)::TEXT, 2, '0'),
                    SPLIT_PART(serial_record.trip_serial_number, '-', 2),
                    LPAD((prev_serial + 1)::TEXT, 4, '0')),
                FORMAT('T%s-%s-%s', 
                    LPAD((p_year % 100)::TEXT, 2, '0'),
                    SPLIT_PART(serial_record.trip_serial_number, '-', 2),
                    LPAD((curr_serial - 1)::TEXT, 4, '0')),
                curr_serial - prev_serial - 1;
        END IF;
        
        prev_serial := curr_serial;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### TypeScript Serial Monitor
```typescript
// File: src/utils/serialNumberMonitor.ts

interface SerialGap {
  start: string;
  end: string;
  size: number;
}

interface SerialValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
  gaps?: SerialGap[];
}

export class SerialNumberMonitor {
  private static SERIAL_PATTERN = /^T\d{2}-\d{4}-\d{4}$/;
  
  static validateFormat(serialNumber: string): boolean {
    return this.SERIAL_PATTERN.test(serialNumber);
  }
  
  static async checkSerialAvailability(
    serialNumber: string
  ): Promise<SerialValidation> {
    try {
      // Validate format
      if (!this.validateFormat(serialNumber)) {
        return {
          isValid: false,
          error: 'Invalid format. Expected: TYY-####-#### (e.g., T25-1234-0001)'
        };
      }
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('trips')
        .select('id')
        .eq('trip_serial_number', serialNumber)
        .single();
      
      if (existing) {
        return {
          isValid: false,
          error: 'Serial number already exists'
        };
      }
      
      // Check if retired/reserved
      const { data: reserved } = await supabase
        .from('trip_serial_reservations')
        .select('status, reason')
        .eq('serial_number', serialNumber)
        .single();
      
      if (reserved) {
        return {
          isValid: false,
          error: `Serial number is ${reserved.status}: ${reserved.reason}`
        };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error checking serial availability:', error);
      return {
        isValid: true,
        warning: 'Could not validate serial number'
      };
    }
  }
  
  static async analyzeGaps(
    vehicleId?: string,
    year: number = new Date().getFullYear()
  ): Promise<SerialGap[]> {
    try {
      const { data: gaps, error } = await supabase
        .rpc('analyze_serial_gaps', {
          p_vehicle_id: vehicleId,
          p_year: year
        });
      
      if (error) throw error;
      
      return gaps || [];
    } catch (error) {
      console.error('Error analyzing serial gaps:', error);
      return [];
    }
  }
  
  static async reserveSerial(
    serialNumber: string,
    reason: string,
    status: 'retired' | 'reserved' | 'skip' = 'reserved'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trip_serial_reservations')
        .insert({
          serial_number: serialNumber,
          status,
          reason
        });
      
      return !error;
    } catch (error) {
      console.error('Error reserving serial:', error);
      return false;
    }
  }
}
```

---

## Fix 7: Return Trip Validation

### Problem
The `is_return_trip` field lacks associated validation logic.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_return_trip_validation.sql

-- Add column to link return trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS outbound_trip_id UUID REFERENCES trips(id);

-- Function to validate return trips
CREATE OR REPLACE FUNCTION validate_return_trip()
RETURNS TRIGGER AS $$
DECLARE
    outbound_trip RECORD;
BEGIN
    -- Only validate if marked as return trip
    IF NOT NEW.is_return_trip THEN
        RETURN NEW;
    END IF;
    
    -- Require outbound trip reference
    IF NEW.outbound_trip_id IS NULL THEN
        RAISE EXCEPTION 'Return trip must reference an outbound trip';
    END IF;
    
    -- Get outbound trip details
    SELECT * INTO outbound_trip
    FROM trips
    WHERE id = NEW.outbound_trip_id
        AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced outbound trip not found';
    END IF;
    
    -- Validate the outbound trip is not itself a return trip
    IF outbound_trip.is_return_trip THEN
        RAISE EXCEPTION 'Cannot reference another return trip as outbound';
    END IF;
    
    -- Validate dates
    IF NEW.trip_start_date < outbound_trip.trip_end_date THEN
        RAISE EXCEPTION 'Return trip cannot start before outbound trip ends';
    END IF;
    
    -- Validate locations (start should be near outbound end)
    -- Allow some flexibility for nearby locations
    IF ABS(NEW.start_km - outbound_trip.end_km) > 50 THEN
        RAISE WARNING 'Return trip starts % km from outbound end point', 
            ABS(NEW.start_km - outbound_trip.end_km);
    END IF;
    
    -- Validate same vehicle
    IF NEW.vehicle_id != outbound_trip.vehicle_id THEN
        RAISE EXCEPTION 'Return trip must use the same vehicle as outbound';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_return_trips
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION validate_return_trip();

-- Index for return trip lookups
CREATE INDEX idx_trips_outbound_trip ON trips(outbound_trip_id);
```

### TypeScript Return Trip Validator
```typescript
// File: src/utils/validators/returnTripValidator.ts

interface ReturnTripValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedValues?: {
    start_km?: number;
    warehouse_id?: string;
  };
}

export async function validateReturnTrip(
  tripData: Partial<Trip>,
  outboundTripId?: string
): Promise<ReturnTripValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestedValues: any = {};
  
  if (!tripData.is_return_trip) {
    return { isValid: true, errors, warnings };
  }
  
  if (!outboundTripId) {
    errors.push('Return trip must reference an outbound trip');
    return { isValid: false, errors, warnings };
  }
  
  try {
    // Get outbound trip details
    const { data: outboundTrip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', outboundTripId)
      .single();
    
    if (error || !outboundTrip) {
      errors.push('Referenced outbound trip not found');
      return { isValid: false, errors, warnings };
    }
    
    // Validate it's not a return trip
    if (outboundTrip.is_return_trip) {
      errors.push('Cannot reference another return trip as outbound');
    }
    
    // Validate dates
    if (new Date(tripData.trip_start_date!) < new Date(outboundTrip.trip_end_date)) {
      errors.push('Return trip cannot start before outbound trip ends');
    }
    
    // Validate start location
    const kmDifference = Math.abs((tripData.start_km || 0) - outboundTrip.end_km);
    if (kmDifference > 50) {
      warnings.push(`Return trip starts ${kmDifference} km from outbound end`);
      suggestedValues.start_km = outboundTrip.end_km;
    }
    
    // Validate same vehicle
    if (tripData.vehicle_id !== outboundTrip.vehicle_id) {
      errors.push('Return trip must use the same vehicle');
    }
    
    // Suggest return to original warehouse
    if (outboundTrip.warehouse_id) {
      suggestedValues.warehouse_id = outboundTrip.warehouse_id;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedValues: Object.keys(suggestedValues).length > 0 ? suggestedValues : undefined
    };
  } catch (error) {
    console.error('Error validating return trip:', error);
    errors.push('Error validating return trip');
    return { isValid: false, errors, warnings };
  }
}
```

---

## Fix 8: Fuel Efficiency Baseline Management

### Problem
Need vehicle-specific baselines for better anomaly detection.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_fuel_efficiency_baselines.sql

-- Create table for vehicle mileage baselines
CREATE TABLE IF NOT EXISTS vehicle_mileage_baselines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    season TEXT CHECK (season IN ('summer', 'monsoon', 'winter')),
    load_status TEXT CHECK (load_status IN ('loaded', 'empty', 'partial')),
    baseline_kmpl NUMERIC NOT NULL,
    sample_size INTEGER NOT NULL,
    confidence_score NUMERIC,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(vehicle_id, season, load_status)
);

-- Function to calculate seasonal baselines
CREATE OR REPLACE FUNCTION calculate_mileage_baseline(
    p_vehicle_id UUID
) RETURNS VOID AS $$
DECLARE
    season_text TEXT;
    load_status TEXT;
    baseline_value NUMERIC;
    sample_count INTEGER;
BEGIN
    -- Loop through seasons
    FOR season_text IN SELECT unnest(ARRAY['summer', 'monsoon', 'winter'])
    LOOP
        -- Loop through load statuses
        FOR load_status IN SELECT unnest(ARRAY['loaded', 'empty', 'partial'])
        LOOP
            -- Calculate baseline for this combination
            SELECT 
                AVG(calculated_kmpl),
                COUNT(*)
            INTO baseline_value, sample_count
            FROM trips
            WHERE vehicle_id = p_vehicle_id
                AND calculated_kmpl IS NOT NULL
                AND calculated_kmpl > 0
                AND deleted_at IS NULL
                AND CASE 
                    WHEN EXTRACT(MONTH FROM trip_start_date) IN (3,4,5) THEN 'summer'
                    WHEN EXTRACT(MONTH FROM trip_start_date) IN (6,7,8,9) THEN 'monsoon'
                    ELSE 'winter'
                END = season_text
                AND CASE 
                    WHEN gross_weight > 15000 THEN 'loaded'
                    WHEN gross_weight < 5000 THEN 'empty'
                    ELSE 'partial'
                END = load_status;
            
            -- Insert or update baseline
            IF sample_count >= 5 THEN
                INSERT INTO vehicle_mileage_baselines (
                    vehicle_id, season, load_status, 
                    baseline_kmpl, sample_size, confidence_score
                ) VALUES (
                    p_vehicle_id, season_text, load_status,
                    baseline_value, sample_count,
                    LEAST(sample_count::NUMERIC / 20, 1.0) -- Confidence based on sample size
                )
                ON CONFLICT (vehicle_id, season, load_status)
                DO UPDATE SET
                    baseline_kmpl = EXCLUDED.baseline_kmpl,
                    sample_size = EXCLUDED.sample_size,
                    confidence_score = EXCLUDED.confidence_score,
                    last_updated = NOW();
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get contextual baseline
CREATE OR REPLACE FUNCTION get_trip_baseline(
    p_trip_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    trip_record RECORD;
    baseline_value NUMERIC;
    season_text TEXT;
    load_status TEXT;
BEGIN
    -- Get trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id;
    
    -- Determine season
    season_text := CASE 
        WHEN EXTRACT(MONTH FROM trip_record.trip_start_date) IN (3,4,5) THEN 'summer'
        WHEN EXTRACT(MONTH FROM trip_record.trip_start_date) IN (6,7,8,9) THEN 'monsoon'
        ELSE 'winter'
    END;
    
    -- Determine load status
    load_status := CASE 
        WHEN trip_record.gross_weight > 15000 THEN 'loaded'
        WHEN trip_record.gross_weight < 5000 THEN 'empty'
        ELSE 'partial'
    END;
    
    -- Get baseline
    SELECT baseline_kmpl INTO baseline_value
    FROM vehicle_mileage_baselines
    WHERE vehicle_id = trip_record.vehicle_id
        AND season = season_text
        AND load_status = load_status;
    
    -- Fall back to overall average if no specific baseline
    IF baseline_value IS NULL THEN
        SELECT AVG(calculated_kmpl) INTO baseline_value
        FROM trips
        WHERE vehicle_id = trip_record.vehicle_id
            AND calculated_kmpl IS NOT NULL
            AND calculated_kmpl > 0
            AND deleted_at IS NULL;
    END IF;
    
    RETURN baseline_value;
END;
$$ LANGUAGE plpgsql;
```

### TypeScript Baseline Manager
```typescript
// File: src/utils/fuelEfficiencyBaseline.ts

interface MileageBaseline {
  season: 'summer' | 'monsoon' | 'winter';
  loadStatus: 'loaded' | 'empty' | 'partial';
  baselineKmpl: number;
  sampleSize: number;
  confidenceScore: number;
}

interface BaselineComparison {
  currentMileage: number;
  expectedBaseline: number;
  deviation: number;
  deviationPercent: number;
  isAnomaly: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export class FuelEfficiencyBaselineManager {
  static getSeason(date: Date): 'summer' | 'monsoon' | 'winter' {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'summer';
    if (month >= 6 && month <= 9) return 'monsoon';
    return 'winter';
  }
  
  static getLoadStatus(grossWeight: number): 'loaded' | 'empty' | 'partial' {
    if (grossWeight > 15000) return 'loaded';
    if (grossWeight < 5000) return 'empty';
    return 'partial';
  }
  
  static async getVehicleBaselines(
    vehicleId: string
  ): Promise<MileageBaseline[]> {
    try {
      const { data, error } = await supabase
        .from('vehicle_mileage_baselines')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('confidence_score', { ascending: false });
      
      if (error) throw error;
      
      return data.map(baseline => ({
        season: baseline.season,
        loadStatus: baseline.load_status,
        baselineKmpl: baseline.baseline_kmpl,
        sampleSize: baseline.sample_size,
        confidenceScore: baseline.confidence_score
      }));
    } catch (error) {
      console.error('Error fetching baselines:', error);
      return [];
    }
  }
  
  static async compareToBaseline(
    tripId: string
  ): Promise<BaselineComparison | null> {
    try {
      // Get trip details
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
      
      if (tripError || !trip || !trip.calculated_kmpl) {
        return null;
      }
      
      // Get contextual baseline
      const { data: baseline, error: baselineError } = await supabase
        .rpc('get_trip_baseline', { p_trip_id: tripId });
      
      if (baselineError || !baseline) {
        return null;
      }
      
      const deviation = trip.calculated_kmpl - baseline;
      const deviationPercent = (deviation / baseline) * 100;
      
      // Determine if anomaly (>15% deviation)
      const isAnomaly = Math.abs(deviationPercent) > 15;
      
      // Get confidence level
      const { data: baselineDetails } = await supabase
        .from('vehicle_mileage_baselines')
        .select('confidence_score')
        .eq('vehicle_id', trip.vehicle_id)
        .eq('season', this.getSeason(new Date(trip.trip_start_date)))
        .eq('load_status', this.getLoadStatus(trip.gross_weight))
        .single();
      
      let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
      if (baselineDetails?.confidence_score >= 0.8) confidenceLevel = 'high';
      else if (baselineDetails?.confidence_score >= 0.5) confidenceLevel = 'medium';
      
      return {
        currentMileage: trip.calculated_kmpl,
        expectedBaseline: baseline,
        deviation,
        deviationPercent,
        isAnomaly,
        confidenceLevel
      };
    } catch (error) {
      console.error('Error comparing to baseline:', error);
      return null;
    }
  }
  
  static async updateBaselines(vehicleId: string): Promise<void> {
    try {
      await supabase.rpc('calculate_mileage_baseline', {
        p_vehicle_id: vehicleId
      });
    } catch (error) {
      console.error('Error updating baselines:', error);
    }
  }
}
```

---

## Fix 9: Edge Case Handling

### Problem
Need to handle various edge cases like zero fuel consumption, negative values, etc.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_edge_case_handling.sql

-- Add constraints for data integrity
ALTER TABLE trips 
ADD CONSTRAINT check_positive_distance 
CHECK (end_km >= start_km);

ALTER TABLE trips 
ADD CONSTRAINT check_positive_fuel 
CHECK (fuel_quantity IS NULL OR fuel_quantity >= 0);

ALTER TABLE trips 
ADD CONSTRAINT check_valid_dates 
CHECK (trip_end_date >= trip_start_date);

ALTER TABLE trips 
ADD CONSTRAINT check_positive_expenses 
CHECK (
    (total_fuel_cost IS NULL OR total_fuel_cost >= 0) AND
    (total_road_expenses >= 0) AND
    (unloading_expense IS NULL OR unloading_expense >= 0) AND
    (driver_expense IS NULL OR driver_expense >= 0)
);

-- Function to handle edge cases
CREATE OR REPLACE FUNCTION handle_trip_edge_cases()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle zero distance trips
    IF NEW.end_km = NEW.start_km THEN
        RAISE WARNING 'Zero distance trip detected for trip %', NEW.trip_serial_number;
        -- Allow but flag for review
        NEW.remarks = COALESCE(NEW.remarks || ' | ', '') || 'ZERO_DISTANCE_TRIP';
    END IF;
    
    -- Handle missing fuel data for refueling trips
    IF NEW.refueling_done AND (NEW.fuel_quantity IS NULL OR NEW.fuel_quantity = 0) THEN
        RAISE EXCEPTION 'Refueling trips must have fuel quantity > 0';
    END IF;
    
    -- Handle trips spanning multiple months
    IF EXTRACT(MONTH FROM NEW.trip_start_date) != EXTRACT(MONTH FROM NEW.trip_end_date) THEN
        NEW.remarks = COALESCE(NEW.remarks || ' | ', '') || 'CROSS_MONTH_TRIP';
    END IF;
    
    -- Handle suspiciously long trips (>7 days)
    IF NEW.trip_end_date - NEW.trip_start_date > INTERVAL '7 days' THEN
        NEW.remarks = COALESCE(NEW.remarks || ' | ', '') || 'LONG_DURATION_TRIP';
    END IF;
    
    -- Prevent negative calculated values
    IF NEW.calculated_kmpl IS NOT NULL AND NEW.calculated_kmpl < 0 THEN
        NEW.calculated_kmpl = NULL;
        RAISE WARNING 'Negative mileage calculated, setting to NULL';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER handle_edge_cases
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION handle_trip_edge_cases();

-- Function to identify and flag anomalous trips
CREATE OR REPLACE FUNCTION flag_anomalous_trips()
RETURNS TABLE(
    trip_id UUID,
    anomaly_type TEXT,
    details TEXT
) AS $$
BEGIN
    -- Zero distance trips
    RETURN QUERY
    SELECT id, 'ZERO_DISTANCE', 'Start and end KM are identical'
    FROM trips
    WHERE end_km = start_km
        AND deleted_at IS NULL;
    
    -- Negative mileage (shouldn't exist but check anyway)
    RETURN QUERY
    SELECT id, 'NEGATIVE_MILEAGE', 'Calculated mileage is negative'
    FROM trips
    WHERE calculated_kmpl < 0
        AND deleted_at IS NULL;
    
    -- Very long trips
    RETURN QUERY
    SELECT id, 'EXCESSIVE_DURATION', 
           'Trip duration: ' || (trip_end_date - trip_start_date)::TEXT
    FROM trips
    WHERE trip_end_date - trip_start_date > INTERVAL '7 days'
        AND deleted_at IS NULL;
    
    -- Trips with future dates
    RETURN QUERY
    SELECT id, 'FUTURE_DATE', 'Trip date is in the future'
    FROM trips
    WHERE trip_start_date > NOW()
        OR trip_end_date > NOW()
        AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### TypeScript Edge Case Handler
```typescript
// File: src/utils/edgeCaseHandler.ts

interface EdgeCaseValidation {
  hasIssues: boolean;
  errors: string[];
  warnings: string[];
  flags: string[];
}

export class EdgeCaseHandler {
  static validateTripData(tripData: Partial<Trip>): EdgeCaseValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const flags: string[] = [];
    
    // Check for zero distance
    if (tripData.end_km !== undefined && tripData.start_km !== undefined) {
      const distance = tripData.end_km - tripData.start_km;
      
      if (distance === 0) {
        warnings.push('Zero distance trip - please verify odometer readings');
        flags.push('ZERO_DISTANCE_TRIP');
      } else if (distance < 0) {
        errors.push('End KM cannot be less than Start KM');
      }
    }
    
    // Check for negative values
    if (tripData.fuel_quantity !== undefined && tripData.fuel_quantity < 0) {
      errors.push('Fuel quantity cannot be negative');
    }
    
    if (tripData.total_fuel_cost !== undefined && tripData.total_fuel_cost < 0) {
      errors.push('Fuel cost cannot be negative');
    }
    
    // Check date validity
    if (tripData.trip_start_date && tripData.trip_end_date) {
      const startDate = new Date(tripData.trip_start_date);
      const endDate = new Date(tripData.trip_end_date);
      
      if (endDate < startDate) {
        errors.push('End date cannot be before start date');
      }
      
      // Check for future dates
      const now = new Date();
      if (startDate > now || endDate > now) {
        warnings.push('Trip dates are in the future');
        flags.push('FUTURE_DATE');
      }
      
      // Check for excessively long trips
      const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (durationDays > 7) {
        warnings.push(`Trip duration is ${Math.round(durationDays)} days - please verify`);
        flags.push('LONG_DURATION_TRIP');
      }
      
      // Check for cross-month trips
      if (startDate.getMonth() !== endDate.getMonth()) {
        flags.push('CROSS_MONTH_TRIP');
      }
    }
    
    // Check refueling consistency
    if (tripData.refueling_done && (!tripData.fuel_quantity || tripData.fuel_quantity === 0)) {
      errors.push('Refueling trips must have fuel quantity greater than 0');
    }
    
    return {
      hasIssues: errors.length > 0 || warnings.length > 0,
      errors,
      warnings,
      flags
    };
  }
  
  static async identifyAnomalousTrips(): Promise<Array<{
    tripId: string;
    anomalyType: string;
    details: string;
  }>> {
    try {
      const { data, error } = await supabase
        .rpc('flag_anomalous_trips');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error identifying anomalous trips:', error);
      return [];
    }
  }
  
  static handleTimezoneConversion(
    dateString: string,
    fromTimezone: string = 'Asia/Kolkata'
  ): string {
    // Implement timezone handling if trips cross timezones
    // For now, assuming all trips are in IST
    return dateString;
  }
}
```

---

## Fix 10: Data Quality Metrics

### Problem
Need quality scores to track data reliability.

### SQL Migration
```sql
-- File: supabase/migrations/[timestamp]_add_data_quality_metrics.sql

-- Create data quality scoring table
CREATE TABLE IF NOT EXISTS trip_quality_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
    completeness_score NUMERIC CHECK (completeness_score BETWEEN 0 AND 100),
    consistency_score NUMERIC CHECK (consistency_score BETWEEN 0 AND 100),
    anomaly_score NUMERIC CHECK (anomaly_score BETWEEN 0 AND 100),
    overall_score NUMERIC CHECK (overall_score BETWEEN 0 AND 100),
    quality_flags TEXT[],
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Function to calculate trip quality score
CREATE OR REPLACE FUNCTION calculate_trip_quality_score(
    p_trip_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    trip_record RECORD;
    completeness_score NUMERIC := 100;
    consistency_score NUMERIC := 100;
    anomaly_score NUMERIC := 100;
    overall_score NUMERIC;
    quality_flags TEXT[] := ARRAY[]::TEXT[];
    vehicle_baseline NUMERIC;
BEGIN
    -- Get trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate completeness score
    -- Check required fields
    IF trip_record.trip_serial_number IS NULL THEN
        completeness_score := completeness_score - 10;
        quality_flags := array_append(quality_flags, 'MISSING_SERIAL');
    END IF;
    
    IF trip_record.destinations IS NULL OR array_length(trip_record.destinations, 1) = 0 THEN
        completeness_score := completeness_score - 15;
        quality_flags := array_append(quality_flags, 'MISSING_DESTINATIONS');
    END IF;
    
    IF trip_record.refueling_done AND trip_record.fuel_quantity IS NULL THEN
        completeness_score := completeness_score - 20;
        quality_flags := array_append(quality_flags, 'MISSING_FUEL_DATA');
    END IF;
    
    -- Calculate consistency score
    -- Check odometer consistency
    IF trip_record.end_km < trip_record.start_km THEN
        consistency_score := consistency_score - 50;
        quality_flags := array_append(quality_flags, 'INVALID_ODOMETER');
    END IF;
    
    -- Check date consistency
    IF trip_record.trip_end_date < trip_record.trip_start_date THEN
        consistency_score := consistency_score - 50;
        quality_flags := array_append(quality_flags, 'INVALID_DATES');
    END IF;
    
    -- Calculate anomaly score
    -- Check mileage anomaly
    IF trip_record.calculated_kmpl IS NOT NULL THEN
        vehicle_baseline := get_trip_baseline(p_trip_id);
        
        IF vehicle_baseline IS NOT NULL AND vehicle_baseline > 0 THEN
            IF ABS(trip_record.calculated_kmpl - vehicle_baseline) / vehicle_baseline > 0.25 THEN
                anomaly_score := anomaly_score - 30;
                quality_flags := array_append(quality_flags, 'MILEAGE_ANOMALY');
            END IF;
        END IF;
        
        -- Check for unrealistic mileage
        IF trip_record.calculated_kmpl > 50 OR trip_record.calculated_kmpl < 1 THEN
            anomaly_score := anomaly_score - 40;
            quality_flags := array_append(quality_flags, 'UNREALISTIC_MILEAGE');
        END IF;
    END IF;
    
    -- Check for long duration
    IF trip_record.trip_end_date - trip_record.trip_start_date > INTERVAL '7 days' THEN
        anomaly_score := anomaly_score - 20;
        quality_flags := array_append(quality_flags, 'EXCESSIVE_DURATION');
    END IF;
    
    -- Calculate overall score
    overall_score := (completeness_score * 0.3 + 
                     consistency_score * 0.4 + 
                     anomaly_score * 0.3);
    
    -- Store the quality score
    INSERT INTO trip_quality_scores (
        trip_id, completeness_score, consistency_score, 
        anomaly_score, overall_score, quality_flags
    ) VALUES (
        p_trip_id, completeness_score, consistency_score,
        anomaly_score, overall_score, quality_flags
    )
    ON CONFLICT (trip_id) DO UPDATE SET
        completeness_score = EXCLUDED.completeness_score,
        consistency_score = EXCLUDED.consistency_score,
        anomaly_score = EXCLUDED.anomaly_score,
        overall_score = EXCLUDED.overall_score,
        quality_flags = EXCLUDED.quality_flags,
        calculated_at = NOW();
    
    RETURN overall_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate quality score on trip changes
CREATE OR REPLACE FUNCTION trigger_calculate_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_trip_quality_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_quality_on_change
AFTER INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_quality_score();

-- View for low quality trips
CREATE OR REPLACE VIEW low_quality_trips AS
SELECT 
    t.*,
    q.overall_score,
    q.quality_flags
FROM trips t
JOIN trip_quality_scores q ON t.id = q.trip_id
WHERE q.overall_score < 70
    AND t.deleted_at IS NULL
ORDER BY q.overall_score ASC;
```

### TypeScript Quality Manager
```typescript
// File: src/utils/dataQualityManager.ts

interface QualityScore {
  completenessScore: number;
  consistencyScore: number;
  anomalyScore: number;
  overallScore: number;
  qualityFlags: string[];
  calculatedAt: string;
}

interface QualityMetrics {
  totalTrips: number;
  highQuality: number;
  mediumQuality: number;
  lowQuality: number;
  averageScore: number;
  commonIssues: { issue: string; count: number }[];
}

export class DataQualityManager {
  static calculateQualityScore(trip: Trip): QualityScore {
    let completenessScore = 100;
    let consistencyScore = 100;
    let anomalyScore = 100;
    const qualityFlags: string[] = [];
    
    // Completeness checks
    if (!trip.trip_serial_number) {
      completenessScore -= 10;
      qualityFlags.push('MISSING_SERIAL');
    }
    
    if (!trip.destinations || trip.destinations.length === 0) {
      completenessScore -= 15;
      qualityFlags.push('MISSING_DESTINATIONS');
    }
    
    if (trip.refueling_done && !trip.fuel_quantity) {
      completenessScore -= 20;
      qualityFlags.push('MISSING_FUEL_DATA');
    }
    
    if (!trip.driver_id) {
      completenessScore -= 10;
      qualityFlags.push('MISSING_DRIVER');
    }
    
    // Consistency checks
    if (trip.end_km < trip.start_km) {
      consistencyScore -= 50;
      qualityFlags.push('INVALID_ODOMETER');
    }
    
    if (new Date(trip.trip_end_date) < new Date(trip.trip_start_date)) {
      consistencyScore -= 50;
      qualityFlags.push('INVALID_DATES');
    }
    
    // Anomaly checks
    if (trip.calculated_kmpl) {
      if (trip.calculated_kmpl > 50 || trip.calculated_kmpl < 1) {
        anomalyScore -= 40;
        qualityFlags.push('UNREALISTIC_MILEAGE');
      }
    }
    
    const tripDuration = 
      (new Date(trip.trip_end_date).getTime() - 
       new Date(trip.trip_start_date).getTime()) / 
      (1000 * 60 * 60 * 24);
    
    if (tripDuration > 7) {
      anomalyScore -= 20;
      qualityFlags.push('EXCESSIVE_DURATION');
    }
    
    // Calculate overall score
    const overallScore = 
      completenessScore * 0.3 + 
      consistencyScore * 0.4 + 
      anomalyScore * 0.3;
    
    return {
      completenessScore,
      consistencyScore,
      anomalyScore,
      overallScore,
      qualityFlags,
      calculatedAt: new Date().toISOString()
    };
  }
  
  static async getTripQualityScore(tripId: string): Promise<QualityScore | null> {
    try {
      const { data, error } = await supabase
        .from('trip_quality_scores')
        .select('*')
        .eq('trip_id', tripId)
        .single();
      
      if (error || !data) {
        // Calculate if not exists
        const { data: score } = await supabase
          .rpc('calculate_trip_quality_score', { p_trip_id: tripId });
        
        return await this.getTripQualityScore(tripId);
      }
      
      return {
        completenessScore: data.completeness_score,
        consistencyScore: data.consistency_score,
        anomalyScore: data.anomaly_score,
        overallScore: data.overall_score,
        qualityFlags: data.quality_flags,
        calculatedAt: data.calculated_at
      };
    } catch (error) {
      console.error('Error getting quality score:', error);
      return null;
    }
  }
  
  static async getQualityMetrics(
    vehicleId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<QualityMetrics> {
    try {
      let query = supabase
        .from('trip_quality_scores')
        .select(`
          *,
          trips!inner(vehicle_id, trip_start_date)
        `);
      
      if (vehicleId) {
        query = query.eq('trips.vehicle_id', vehicleId);
      }
      
      if (dateRange) {
        query = query
          .gte('trips.trip_start_date', dateRange.start)
          .lte('trips.trip_start_date', dateRange.end);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const metrics: QualityMetrics = {
        totalTrips: data?.length || 0,
        highQuality: 0,
        mediumQuality: 0,
        lowQuality: 0,
        averageScore: 0,
        commonIssues: []
      };
      
      const issueCount: Record<string, number> = {};
      let totalScore = 0;
      
      data?.forEach(score => {
        totalScore += score.overall_score;
        
        if (score.overall_score >= 85) metrics.highQuality++;
        else if (score.overall_score >= 70) metrics.mediumQuality++;
        else metrics.lowQuality++;
        
        score.quality_flags?.forEach((flag: string) => {
          issueCount[flag] = (issueCount[flag] || 0) + 1;
        });
      });
      
      metrics.averageScore = metrics.totalTrips > 0 
        ? totalScore / metrics.totalTrips 
        : 0;
      
      metrics.commonIssues = Object.entries(issueCount)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      return metrics;
    } catch (error) {
      console.error('Error getting quality metrics:', error);
      return {
        totalTrips: 0,
        highQuality: 0,
        mediumQuality: 0,
        lowQuality: 0,
        averageScore: 0,
        commonIssues: []
      };
    }
  }
  
  static getQualityBadgeColor(score: number): string {
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  }
  
  static getQualityLabel(score: number): string {
    if (score >= 85) return 'High Quality';
    if (score >= 70) return 'Medium Quality';
    return 'Low Quality';
  }
}
```

---

## Implementation Sequence

### Phase 1: Critical Data Integrity (Week 1)
1. **Fix 1**: Odometer Continuity Validation
2. **Fix 2**: Concurrent Trip Prevention
3. **Fix 9**: Edge Case Handling

### Phase 2: Calculation Integrity (Week 2)
4. **Fix 3**: Mileage Calculation Chain Integrity
5. **Fix 4**: Unrealistic Value Detection
6. **Fix 8**: Fuel Efficiency Baseline Management

### Phase 3: Data Management (Week 3)
7. **Fix 5**: Data Correction Cascade Management
8. **Fix 6**: Trip Serial Number Monitoring
9. **Fix 7**: Return Trip Validation

### Phase 4: Quality Assurance (Week 4)
10. **Fix 10**: Data Quality Metrics

## Testing Checklist

### Unit Tests Required
- [ ] Odometer validation logic
- [ ] Concurrent trip detection
- [ ] Mileage calculation chain
- [ ] Value range validation
- [ ] Serial number generation and validation
- [ ] Return trip validation
- [ ] Baseline calculations
- [ ] Edge case handlers
- [ ] Quality score calculations

### Integration Tests Required
- [ ] Full trip creation flow with all validations
- [ ] Trip editing with cascade corrections
- [ ] Trip deletion with chain preservation
- [ ] Bulk import with validation
- [ ] Quality metrics aggregation

### Performance Tests Required
- [ ] Validation performance with large datasets
- [ ] Cascade correction performance
- [ ] Quality score calculation performance
- [ ] Baseline calculation performance

## Deployment Notes

1. **Database Migrations**: Run in sequence, test rollback procedures
2. **Frontend Updates**: Deploy after backend validations are in place
3. **Data Cleanup**: Run quality scoring on existing data to identify issues
4. **Monitoring**: Set up alerts for validation failures and low quality scores
5. **User Training**: Document new validation rules and quality requirements

## Maintenance Guidelines

1. **Weekly**: Review quality metrics and address low-scoring trips
2. **Monthly**: Update vehicle baselines with new data
3. **Quarterly**: Analyze serial number gaps and patterns
4. **Annually**: Review and adjust validation thresholds

---

This comprehensive implementation guide provides everything needed to fix all 10 identified issues in your trip tracking system. Each fix includes complete SQL migrations, TypeScript code, and integration instructions that can be implemented incrementally following the suggested phases.
