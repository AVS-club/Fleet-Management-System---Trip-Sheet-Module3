/**
 * Field Mapping Configuration
 * Maps API response fields to application form fields
 * Prevents breaking changes when API response structure changes
 */

import { convertDdMmYyyyToYyyyMmDd } from '../services/apiValidation';
import type { Driver } from '../types/driver';
import type { Vehicle } from '../types/vehicle';
import type { DriverApiResponse, VehicleApiResponse } from '../services/apiValidation';

/**
 * Field mapper function type
 */
type FieldMapper<TSource, TTarget> = (source: TSource, existing?: TTarget) => TTarget;

/**
 * Helper: Ensure base64 image has proper data URL format
 */
function ensureImageDataUrl(base64: string): string {
  if (!base64) return '';
  if (base64.startsWith('data:')) return base64;
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Helper: Extract RTO name and state from RTO code
 * Format: "RTO Name, State" or just "RTO Code"
 */
function extractRtoInfo(rtoCode: string | undefined): { rto: string; state: string } {
  if (!rtoCode) return { rto: '', state: '' };
  
  const parts = rtoCode.split(',').map(p => p.trim());
  if (parts.length === 2) {
    return { rto: parts[0], state: parts[1] };
  }
  
  return { rto: rtoCode, state: '' };
}

/**
 * Helper: Parse address priority (present > permanent > temporary)
 */
function parseAddress(apiData: DriverApiResponse): string {
  return apiData.permanent_address || apiData.temporary_address || '';
}

/**
 * Helper: Parse seating capacity
 */
function parseSeatingCapacity(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Helper: Parse weight values
 */
function parseWeight(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Map Driver API response to Driver model
 */
export const mapDriverApiToDriver: FieldMapper<DriverApiResponse, Partial<Driver>> = (apiData, existing) => {
  const { rto, state } = extractRtoInfo(apiData.rto_code);
  
  return {
    // Keep existing ID if updating
    id: existing?.id,
    
    // Map basic info
    name: apiData.full_name || existing?.name || '',
    father_or_husband_name: apiData.father_name || existing?.father_or_husband_name || '',
    gender: apiData.gender || existing?.gender || '',
    blood_group: apiData.blood_group || existing?.blood_group || '',
    
    // Map dates (convert DD-MM-YYYY to YYYY-MM-DD)
    dob: apiData.date_of_birth ? convertDdMmYyyyToYyyyMmDd(apiData.date_of_birth) : (existing?.dob || ''),
    license_issue_date: apiData.issue_date ? convertDdMmYyyyToYyyyMmDd(apiData.issue_date) : (existing?.license_issue_date || ''),
    valid_from: apiData.valid_from ? convertDdMmYyyyToYyyyMmDd(apiData.valid_from) : (existing?.valid_from || ''),
    license_expiry: apiData.valid_upto ? convertDdMmYyyyToYyyyMmDd(apiData.valid_upto) : (existing?.license_expiry || ''),
    
    // Map license info
    license_number: apiData.license_number || existing?.license_number || '',
    vehicle_class: apiData.vehicle_class || existing?.vehicle_class || [],
    
    // Map location info
    address: parseAddress(apiData) || existing?.address || '',
    state: state || apiData.state || existing?.state || '',
    rto: rto || apiData.rto || existing?.rto || '',
    rto_code: apiData.rto_code || existing?.rto_code || '',
    
    // Map photo
    driver_photo_url: apiData.image ? ensureImageDataUrl(apiData.image) : existing?.driver_photo_url || '',
    
    // Preserve existing fields not in API
    contact_number: existing?.contact_number || '',
    date_of_joining: existing?.date_of_joining || '',
    medical_certificate_expiry: existing?.medical_certificate_expiry || '',
    aadhar_number: existing?.aadhar_number || '',
    status: existing?.status || 'active',
    experience_years: existing?.experience_years,
    salary: existing?.salary,
    email: existing?.email || '',
    primary_vehicle_id: existing?.primary_vehicle_id,
    documents_verified: existing?.documents_verified || false,
    license_doc_url: existing?.license_doc_url || '',
    aadhar_doc_url: existing?.aadhar_doc_url || '',
    police_doc_url: existing?.police_doc_url || '',
    medical_doc_url: existing?.medical_doc_url || '',
    added_by: existing?.added_by,
    organization_id: existing?.organization_id,
    created_at: existing?.created_at,
    updated_at: existing?.updated_at,
  };
};

/**
 * Map Vehicle API response to Vehicle model
 */
export const mapVehicleApiToVehicle: FieldMapper<VehicleApiResponse, Partial<Vehicle>> = (apiData, existing) => {
  return {
    // Keep existing ID if updating
    id: existing?.id,
    
    // Map basic info
    registration_number: apiData.registration_number || existing?.registration_number || '',
    make: apiData.make || existing?.make || '',
    model: apiData.model || existing?.model || '',
    vehicle_type: apiData.vehicle_type || existing?.vehicle_type || '',
    fuel_type: apiData.fuel_type || existing?.fuel_type || '',
    color: apiData.color || existing?.color || '',
    body_type: apiData.body_type || existing?.body_type || '',
    
    // Map dates (convert DD-MM-YYYY to YYYY-MM-DD)
    registration_date: apiData.registration_date ? convertDdMmYyyyToYyyyMmDd(apiData.registration_date) : (existing?.registration_date || ''),
    fitness_expiry: apiData.fitness_valid_upto ? convertDdMmYyyyToYyyyMmDd(apiData.fitness_valid_upto) : (existing?.fitness_expiry || ''),
    insurance_expiry: apiData.insurance_valid_upto ? convertDdMmYyyyToYyyyMmDd(apiData.insurance_valid_upto) : (existing?.insurance_expiry || ''),
    permit_expiry: apiData.permit_valid_upto ? convertDdMmYyyyToYyyyMmDd(apiData.permit_valid_upto) : (existing?.permit_expiry || ''),
    pollution_expiry: apiData.pollution_valid_upto ? convertDdMmYyyyToYyyyMmDd(apiData.pollution_valid_upto) : (existing?.pollution_expiry || ''),
    tax_valid_upto: apiData.tax_valid_upto ? convertDdMmYyyyToYyyyMmDd(apiData.tax_valid_upto) : (existing?.tax_valid_upto || ''),
    
    // Map technical details
    chassis_number: apiData.chassis_number || existing?.chassis_number || '',
    engine_number: apiData.engine_number || existing?.engine_number || '',
    seating_capacity: parseSeatingCapacity(apiData.seating_capacity) || existing?.seating_capacity,
    unladen_weight: parseWeight(apiData.unladen_weight) || existing?.unladen_weight,
    gross_vehicle_weight: parseWeight(apiData.gross_vehicle_weight) || existing?.gross_vehicle_weight,
    
    // Map location
    rto_location: apiData.rto_location || existing?.rto_location || '',
    state: apiData.state || existing?.state || '',
    
    // Preserve existing fields not in API
    year: existing?.year,
    status: existing?.status || 'active',
    ownership_type: existing?.ownership_type || 'owned',
    purchase_date: existing?.purchase_date || '',
    purchase_price: existing?.purchase_price,
    current_value: existing?.current_value,
    odometer_reading: existing?.odometer_reading,
    last_service_date: existing?.last_service_date || '',
    next_service_date: existing?.next_service_date || '',
    average_mileage: existing?.average_mileage,
    insurance_provider: existing?.insurance_provider || '',
    insurance_policy_number: existing?.insurance_policy_number || '',
    assigned_driver_id: existing?.assigned_driver_id,
    current_location: existing?.current_location || '',
    notes: existing?.notes || '',
    added_by: existing?.added_by,
    organization_id: existing?.organization_id,
    created_at: existing?.created_at,
    updated_at: existing?.updated_at,
  };
};

/**
 * Get list of fields that were updated from API
 */
export function getUpdatedFields<T extends Record<string, any>>(
  original: Partial<T>,
  updated: Partial<T>
): string[] {
  const updatedFields: string[] = [];
  
  for (const key in updated) {
    if (updated[key] !== original[key] && updated[key] !== undefined && updated[key] !== '') {
      updatedFields.push(key);
    }
  }
  
  return updatedFields;
}

/**
 * Merge API data with existing data (API data takes priority)
 */
export function mergeApiDataWithExisting<T extends Record<string, any>>(
  apiData: Partial<T>,
  existingData: Partial<T>,
  priorityFields?: string[]
): Partial<T> {
  const merged = { ...existingData };
  
  for (const key in apiData) {
    const apiValue = apiData[key];
    const existingValue = existingData[key];
    
    // If API has a value and it's different from existing
    if (apiValue !== undefined && apiValue !== null && apiValue !== '') {
      // Check if this is a priority field (always take API value)
      if (priorityFields?.includes(key)) {
        merged[key] = apiValue;
      } else {
        // Only update if existing value is empty
        if (!existingValue || existingValue === '') {
          merged[key] = apiValue;
        }
      }
    }
  }
  
  return merged;
}

/**
 * Priority fields for Driver (always take from API)
 */
export const DRIVER_API_PRIORITY_FIELDS = [
  'name',
  'father_or_husband_name',
  'gender',
  'dob',
  'blood_group',
  'license_number',
  'license_issue_date',
  'valid_from',
  'license_expiry',
  'vehicle_class',
  'rto',
  'rto_code',
  'state',
];

/**
 * Priority fields for Vehicle (always take from API)
 */
export const VEHICLE_API_PRIORITY_FIELDS = [
  'registration_number',
  'make',
  'model',
  'vehicle_type',
  'fuel_type',
  'chassis_number',
  'engine_number',
  'registration_date',
  'seating_capacity',
  'rto_location',
  'state',
];

