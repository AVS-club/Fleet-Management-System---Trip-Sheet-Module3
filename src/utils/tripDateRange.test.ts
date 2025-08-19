import { describe, expect, it } from 'vitest';
import { filterTripsByDateRange } from './tripDateRange';
import type { Trip } from '../types';

const createTrip = (overrides: Partial<Trip>): Trip => ({
  id: '1',
  vehicle_id: 'veh',
  driver_id: 'drv',
  warehouse_id: 'wh',
  destinations: [],
  trip_start_date: '2024-01-01',
  trip_end_date: '2024-01-01',
  trip_duration: 1,
  trip_serial_number: 'SN',
  manual_trip_id: false,
  start_km: 0,
  end_km: 0,
  gross_weight: 0,
  refueling_done: false,
  unloading_expense: 0,
  driver_expense: 0,
  road_rto_expense: 0,
  total_road_expenses: 0,
  short_trip: false,
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('filterTripsByDateRange', () => {
  it('returns trips within the date range', () => {
    const trips: Trip[] = [
      createTrip({ id: '1', trip_end_date: '2024-01-10' }),
      createTrip({ id: '2', trip_end_date: '2024-02-05' }),
      createTrip({ id: '3', trip_end_date: '2023-12-31' }),
    ];

    const range = {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    };

    const result = filterTripsByDateRange(trips, range);
    expect(result.map(t => t.id)).toEqual(['1']);
  });

  it('returns empty array for invalid date range', () => {
    const trips: Trip[] = [createTrip({ id: '1', trip_end_date: '2024-01-10' })];

    const range = {
      start: new Date('2024-02-01'),
      end: new Date('2024-01-01'),
    };

    expect(filterTripsByDateRange(trips, range)).toEqual([]);
  });

  it('skips trips with invalid dates', () => {
    const trips: Trip[] = [
      createTrip({ id: '1', trip_end_date: 'invalid-date' as any }),
      createTrip({ id: '2', trip_end_date: '2024-01-15' }),
      createTrip({ id: '3', trip_end_date: undefined as unknown as string }),
    ];

    const range = {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    };

    const result = filterTripsByDateRange(trips, range);
    expect(result.map(t => t.id)).toEqual(['2']);
  });
});

