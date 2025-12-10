/**
 * API Response Validation Schemas
 * Uses Zod for runtime validation of API responses
 */

import { z } from 'zod';

/**
 * Date validation and conversion utilities
 */
export const DateSchemas = {
  // DD-MM-YYYY format from API
  ddmmyyyy: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Invalid date format (expected DD-MM-YYYY)'),
  
  // YYYY-MM-DD format for HTML inputs
  yyyymmdd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
  
  // Optional date that can be empty
  optionalDdMmYyyy: z.string().regex(/^\d{2}-\d{2}-\d{4}$/).or(z.literal('')).optional(),
  optionalYyyyMmDd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
};

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD
 */
export function convertDdMmYyyyToYyyyMmDd(date: string | undefined): string {
  if (!date || date === '') return '';
  
  const parts = date.split('-');
  if (parts.length !== 3) return '';
  
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
}

/**
 * Convert YYYY-MM-DD to DD-MM-YYYY
 */
export function convertYyyyMmDdToDdMmYyyy(date: string | undefined): string {
  if (!date || date === '') return '';
  
  const parts = date.split('-');
  if (parts.length !== 3) return '';
  
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

/**
 * Driver License API Response Schema
 */
export const DriverApiResponseSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  father_name: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: DateSchemas.optionalDdMmYyyy,
  permanent_address: z.string().optional(),
  temporary_address: z.string().optional(),
  license_number: z.string().min(1, 'License number is required'),
  issue_date: DateSchemas.optionalDdMmYyyy,
  valid_from: DateSchemas.optionalDdMmYyyy,
  valid_upto: DateSchemas.optionalDdMmYyyy,
  vehicle_class: z.array(z.string()).optional().default([]),
  blood_group: z.string().optional(),
  state: z.string().optional(),
  rto_code: z.string().optional(),
  rto: z.string().optional(),
  image: z.string().optional(),
});

export type DriverApiResponse = z.infer<typeof DriverApiResponseSchema>;

/**
 * Vehicle RC API Response Schema
 */
export const VehicleApiResponseSchema = z.object({
  registration_number: z.string().min(1, 'Registration number is required'),
  owner_name: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  vehicle_type: z.string().optional(),
  fuel_type: z.string().optional(),
  color: z.string().optional(),
  registration_date: DateSchemas.optionalDdMmYyyy,
  fitness_valid_upto: DateSchemas.optionalDdMmYyyy,
  insurance_valid_upto: DateSchemas.optionalDdMmYyyy,
  permit_valid_upto: DateSchemas.optionalDdMmYyyy,
  pollution_valid_upto: DateSchemas.optionalDdMmYyyy,
  tax_valid_upto: DateSchemas.optionalDdMmYyyy,
  chassis_number: z.string().optional(),
  engine_number: z.string().optional(),
  seating_capacity: z.number().or(z.string()).optional(),
  unladen_weight: z.number().or(z.string()).optional(),
  gross_vehicle_weight: z.number().or(z.string()).optional(),
  rto_location: z.string().optional(),
  state: z.string().optional(),
  body_type: z.string().optional(),
});

export type VehicleApiResponse = z.infer<typeof VehicleApiResponseSchema>;

/**
 * Challan API Response Schema
 */
export const ChallanApiResponseSchema = z.object({
  vehicle_id: z.string(),
  challans: z.array(z.object({
    challan_number: z.string(),
    date: z.string(),
    amount: z.number(),
    status: z.string(),
    reason: z.string().optional(),
  })).optional().default([]),
  total_amount: z.number().optional(),
});

export type ChallanApiResponse = z.infer<typeof ChallanApiResponseSchema>;

/**
 * Generic API Response Wrapper
 */
export const ApiResponseWrapperSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type ApiResponseWrapper<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

/**
 * Validate and parse API response
 */
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessages}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Safe parse with default value
 */
export function safeParseWithDefault<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  defaultValue: T
): T {
  const result = validateApiResponse(data, schema);
  return result.success ? result.data : defaultValue;
}

