import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scannerService } from '../scannerService';

// Mock Supabase client with successful responses
vi.mock('../supabaseClient', () => ({
  supabase: {
    rpc: vi.fn((method: string) => {
      // Mock successful RPC responses based on method
      switch (method) {
        case 'rpc_trips_count':
          return Promise.resolve({ data: 5, error: null });
        case 'rpc_fuel_summary':
          return Promise.resolve({
            data: [{ total_fuel_amount: 5000, total_liters: 50, trips_covered: 5 }],
            error: null
          });
        case 'rpc_mileage_stats':
          return Promise.resolve({
            data: [{ distance_km: 500, refuel_liters: 50, trip_count: 5, avg_mileage_kmpl: 10 }],
            error: null
          });
        case 'rpc_vehicle_expiries':
          return Promise.resolve({
            data: [{
              registration_number: 'MH12AB1234',
              insurance_expiry_date: '2025-12-31',
              pollution_expiry_date: '2025-11-30',
              permit_expiry_date: '2026-01-15',
              fitness_expiry_date: '2025-10-31',
              registration_date: '2015-01-01'
            }],
            error: null
          });
        default:
          return Promise.resolve({ data: null, error: null });
      }
    }),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-vehicle-id' }, error: null })),
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        or: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

describe('ScannerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processQuery', () => {
    it('should return help message for unrecognized queries', async () => {
      const result = await scannerService.processQuery('hello world');

      expect(result.type).toBe('help');
      expect(result.content).toContain('Fleet Scanner Help');
    });

    it('should detect trip queries', async () => {
      const result = await scannerService.processQuery('how many trips for MH12AB1234 last month');

      expect(result.type).toBe('trips');
      expect(result.vehicleReg).toBe('MH12AB1234');
      expect(result.period).toBe('last month');
    });

    it('should detect fuel queries', async () => {
      const result = await scannerService.processQuery('fuel expenses for GJ03BW8184 this week');

      expect(result.type).toBe('fuel');
      expect(result.vehicleReg).toBe('GJ03BW8184');
      expect(result.period).toBe('this week');
    });

    it('should detect mileage queries', async () => {
      const result = await scannerService.processQuery('average mileage for MP09KV1123 this year');

      expect(result.type).toBe('mileage');
      expect(result.vehicleReg).toBe('MP09KV1123');
      expect(result.period).toBe('this year');
    });

    it('should detect expiry queries', async () => {
      const result = await scannerService.processQuery('insurance expiry for MH12AB1234');

      expect(result.type).toBe('expiry');
      expect(result.vehicleReg).toBe('MH12AB1234');
    });

    it('should detect maintenance queries', async () => {
      const result = await scannerService.processQuery('pending maintenance for GJ03BW8184');

      expect(result.type).toBe('maintenance');
      // Note: with empty mock data, returns "No pending maintenance" message
      expect(result.content).toContain('maintenance');
    });
  });

  describe('extractVehicleReg', () => {
    it('should extract vehicle registration from query', async () => {
      const testCases = [
        { input: 'MH12AB1234', expected: 'MH12AB1234' },
        { input: 'MH 12 AB 1234', expected: 'MH12AB1234' },
        { input: 'GJ03BW8184', expected: 'GJ03BW8184' },
        { input: 'MP09KV1123', expected: 'MP09KV1123' }
      ];

      for (const { input, expected } of testCases) {
        const result = await scannerService.processQuery(`trips for ${input} last month`);
        expect(result.vehicleReg).toBe(expected);
      }
    });
  });

  describe('period detection', () => {
    it('should detect different time periods', async () => {
      const testCases = [
        { input: 'today', expected: 'today' },
        { input: 'yesterday', expected: 'yesterday' },
        { input: 'last week', expected: 'last week' },
        { input: 'this month', expected: 'this month' },
        { input: 'last month', expected: 'last month' },
        { input: 'this year', expected: 'this year' }
      ];

      for (const { input, expected } of testCases) {
        const result = await scannerService.processQuery(`trips for MH12AB1234 ${input}`);
        expect(result.period).toBe(expected);
      }
    });
  });
});
