/**
 * Unit tests for API validation service
 */

import { describe, it, expect } from 'vitest';
import {
  convertDdMmYyyyToYyyyMmDd,
  convertYyyyMmDdToDdMmYyyy,
  validateApiResponse,
  DriverApiResponseSchema,
  VehicleApiResponseSchema,
} from '../apiValidation';

describe('Date Conversion', () => {
  describe('convertDdMmYyyyToYyyyMmDd', () => {
    it('should convert DD-MM-YYYY to YYYY-MM-DD', () => {
      expect(convertDdMmYyyyToYyyyMmDd('02-03-1992')).toBe('1992-03-02');
      expect(convertDdMmYyyyToYyyyMmDd('31-12-2023')).toBe('2023-12-31');
    });
    
    it('should return empty string for invalid dates', () => {
      expect(convertDdMmYyyyToYyyyMmDd('')).toBe('');
      expect(convertDdMmYyyyToYyyyMmDd(undefined)).toBe('');
      expect(convertDdMmYyyyToYyyyMmDd('invalid')).toBe('');
    });
  });
  
  describe('convertYyyyMmDdToDdMmYyyy', () => {
    it('should convert YYYY-MM-DD to DD-MM-YYYY', () => {
      expect(convertYyyyMmDdToDdMmYyyy('1992-03-02')).toBe('02-03-1992');
      expect(convertYyyyMmDdToDdMmYyyy('2023-12-31')).toBe('31-12-2023');
    });
    
    it('should return empty string for invalid dates', () => {
      expect(convertYyyyMmDdToDdMmYyyy('')).toBe('');
      expect(convertYyyyMmDdToDdMmYyyy(undefined)).toBe('');
      expect(convertYyyyMmDdToDdMmYyyy('invalid')).toBe('');
    });
  });
});

describe('Driver API Response Validation', () => {
  it('should validate complete driver data', () => {
    const validData = {
      full_name: 'John Doe',
      father_name: 'Richard Doe',
      gender: 'Male',
      date_of_birth: '02-03-1992',
      permanent_address: '123 Main St',
      license_number: 'DL123456',
      issue_date: '01-01-2020',
      valid_from: '01-01-2020',
      valid_upto: '31-12-2040',
      vehicle_class: ['LMV', 'MCWG'],
      blood_group: 'O+',
      state: 'Karnataka',
      rto_code: 'KA01',
      rto: 'Bangalore',
      image: 'base64string',
    };
    
    const result = validateApiResponse(validData, DriverApiResponseSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.full_name).toBe('John Doe');
      expect(result.data.vehicle_class).toEqual(['LMV', 'MCWG']);
    }
  });
  
  it('should validate minimal driver data', () => {
    const minimalData = {
      full_name: 'John Doe',
      license_number: 'DL123456',
    };
    
    const result = validateApiResponse(minimalData, DriverApiResponseSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vehicle_class).toEqual([]);
    }
  });
  
  it('should fail validation for missing required fields', () => {
    const invalidData = {
      father_name: 'Richard Doe',
      // Missing full_name and license_number
    };
    
    const result = validateApiResponse(invalidData, DriverApiResponseSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Name is required');
    }
  });
});

describe('Vehicle API Response Validation', () => {
  it('should validate complete vehicle data', () => {
    const validData = {
      registration_number: 'KA01AB1234',
      owner_name: 'John Doe',
      make: 'TATA',
      model: 'ACE',
      vehicle_type: 'LGV',
      fuel_type: 'DIESEL',
      color: 'WHITE',
      registration_date: '01-01-2020',
      fitness_valid_upto: '31-12-2025',
      chassis_number: 'CHASSIS123',
      engine_number: 'ENGINE123',
      seating_capacity: 2,
      rto_location: 'Bangalore',
      state: 'Karnataka',
    };
    
    const result = validateApiResponse(validData, VehicleApiResponseSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registration_number).toBe('KA01AB1234');
    }
  });
  
  it('should handle seating capacity as string or number', () => {
    const dataWithString = {
      registration_number: 'KA01AB1234',
      seating_capacity: '2',
    };
    
    const dataWithNumber = {
      registration_number: 'KA01AB1234',
      seating_capacity: 2,
    };
    
    const result1 = validateApiResponse(dataWithString, VehicleApiResponseSchema);
    const result2 = validateApiResponse(dataWithNumber, VehicleApiResponseSchema);
    
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });
});

