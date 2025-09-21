import { scannerService } from '../scannerService';

// Mock Supabase client
jest.mock('../supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'test-vehicle-id' }, error: null }))
        }))
      }))
    }))
  }
}));

describe('ScannerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(result.vehicleReg).toBe('GJ03BW8184');
    });
  });

  describe('extractVehicleReg', () => {
    it('should extract vehicle registration from query', () => {
      const testCases = [
        { input: 'MH12AB1234', expected: 'MH12AB1234' },
        { input: 'MH 12 AB 1234', expected: 'MH12AB1234' },
        { input: 'GJ03BW8184', expected: 'GJ03BW8184' },
        { input: 'MP09KV1123', expected: 'MP09KV1123' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = scannerService.processQuery(`trips for ${input} last month`);
        expect(result.vehicleReg).toBe(expected);
      });
    });
  });

  describe('period detection', () => {
    it('should detect different time periods', () => {
      const testCases = [
        { input: 'today', expected: 'today' },
        { input: 'yesterday', expected: 'yesterday' },
        { input: 'last week', expected: 'last week' },
        { input: 'this month', expected: 'this month' },
        { input: 'last month', expected: 'last month' },
        { input: 'this year', expected: 'this year' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = scannerService.processQuery(`trips for MH12AB1234 ${input}`);
        expect(result.period).toBe(expected);
      });
    });
  });
});
