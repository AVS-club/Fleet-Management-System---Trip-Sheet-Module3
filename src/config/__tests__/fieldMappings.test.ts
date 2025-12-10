/**
 * Unit tests for field mappings
 */

import { describe, it, expect } from 'vitest';
import {
  mapDriverApiToDriver,
  mapVehicleApiToVehicle,
  getUpdatedFields,
  mergeApiDataWithExisting,
  DRIVER_API_PRIORITY_FIELDS,
} from '../fieldMappings';
import type { DriverApiResponse, VehicleApiResponse } from '../../services/apiValidation';
import type { Driver } from '../../types/driver';

describe('Driver API Mapping', () => {
  it('should map complete driver API response', () => {
    const apiData: DriverApiResponse = {
      full_name: 'John Doe',
      father_name: 'Richard Doe',
      gender: 'Male',
      date_of_birth: '02-03-1992',
      permanent_address: '123 Main St',
      temporary_address: '',
      license_number: 'DL123456',
      issue_date: '01-01-2020',
      valid_from: '01-01-2020',
      valid_upto: '31-12-2040',
      vehicle_class: ['LMV', 'MCWG'],
      blood_group: 'O+',
      state: 'Karnataka',
      rto_code: 'RTO Bangalore, Karnataka',
      rto: 'Bangalore',
      image: 'base64imagestring',
    };
    
    const mapped = mapDriverApiToDriver(apiData);
    
    expect(mapped.name).toBe('John Doe');
    expect(mapped.father_or_husband_name).toBe('Richard Doe');
    expect(mapped.dob).toBe('1992-03-02'); // Converted to YYYY-MM-DD
    expect(mapped.license_issue_date).toBe('2020-01-01');
    expect(mapped.license_expiry).toBe('2040-12-31');
    expect(mapped.vehicle_class).toEqual(['LMV', 'MCWG']);
    expect(mapped.address).toBe('123 Main St');
  });
  
  it('should preserve existing data when API data is missing', () => {
    const apiData: DriverApiResponse = {
      full_name: 'John Doe',
      license_number: 'DL123456',
    };
    
    const existing: Partial<Driver> = {
      id: '123',
      contact_number: '9876543210',
      email: 'john@example.com',
      status: 'active',
    };
    
    const mapped = mapDriverApiToDriver(apiData, existing);
    
    expect(mapped.id).toBe('123');
    expect(mapped.contact_number).toBe('9876543210');
    expect(mapped.email).toBe('john@example.com');
    expect(mapped.status).toBe('active');
    expect(mapped.name).toBe('John Doe');
  });
  
  it('should extract RTO info from rto_code', () => {
    const apiData: DriverApiResponse = {
      full_name: 'John Doe',
      license_number: 'DL123456',
      rto_code: 'RTO Bangalore, Karnataka',
    };
    
    const mapped = mapDriverApiToDriver(apiData);
    
    expect(mapped.rto).toBe('RTO Bangalore');
    expect(mapped.state).toBe('Karnataka');
  });
  
  it('should handle image data URL conversion', () => {
    const apiData: DriverApiResponse = {
      full_name: 'John Doe',
      license_number: 'DL123456',
      image: '/9j/4AAQSkZJRg', // Base64 without data URL prefix
    };
    
    const mapped = mapDriverApiToDriver(apiData);
    
    expect(mapped.driver_photo_url).toContain('data:image/jpeg;base64,');
  });
});

describe('Vehicle API Mapping', () => {
  it('should map complete vehicle API response', () => {
    const apiData: VehicleApiResponse = {
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
    
    const mapped = mapVehicleApiToVehicle(apiData);
    
    expect(mapped.registration_number).toBe('KA01AB1234');
    expect(mapped.make).toBe('TATA');
    expect(mapped.model).toBe('ACE');
    expect(mapped.registration_date).toBe('2020-01-01'); // Converted
    expect(mapped.fitness_expiry).toBe('2025-12-31'); // Converted
    expect(mapped.seating_capacity).toBe(2);
  });
  
  it('should handle string seating capacity', () => {
    const apiData: VehicleApiResponse = {
      registration_number: 'KA01AB1234',
      seating_capacity: '2' as any,
    };
    
    const mapped = mapVehicleApiToVehicle(apiData);
    
    expect(mapped.seating_capacity).toBe(2);
  });
});

describe('Field Update Tracking', () => {
  it('should identify updated fields', () => {
    const original = {
      name: 'John Doe',
      email: '',
      phone: '123456',
    };
    
    const updated = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123456',
    };
    
    const updatedFields = getUpdatedFields(original, updated);
    
    expect(updatedFields).toContain('email');
    expect(updatedFields).not.toContain('name');
    expect(updatedFields).not.toContain('phone');
  });
});

describe('Data Merging', () => {
  it('should merge API data with existing data', () => {
    const apiData = {
      name: 'John Doe',
      license_number: 'DL123456',
      email: '',
    };
    
    const existingData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '123456',
    };
    
    const merged = mergeApiDataWithExisting(apiData, existingData);
    
    expect(merged.name).toBe('John Doe'); // API value takes priority
    expect(merged.license_number).toBe('DL123456'); // New from API
    expect(merged.email).toBe('jane@example.com'); // Existing preserved (API empty)
    expect(merged.phone).toBe('123456'); // Existing preserved
  });
  
  it('should respect priority fields', () => {
    const apiData = {
      name: 'John Doe',
      email: 'new@example.com',
    };
    
    const existingData = {
      name: 'Jane Doe',
      email: 'old@example.com',
    };
    
    const merged = mergeApiDataWithExisting(apiData, existingData, ['name']);
    
    expect(merged.name).toBe('John Doe'); // Priority field
    expect(merged.email).toBe('old@example.com'); // Not priority
  });
});

