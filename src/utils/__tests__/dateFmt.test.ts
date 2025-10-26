import { describe, it, expect } from 'vitest';
import { fmtDateWithYear } from '../dateFmt';

describe('fmtDateWithYear', () => {
  describe('ordinal suffix logic', () => {
    const testCases = [
      { day: 1, expected: '1st' },
      { day: 2, expected: '2nd' },
      { day: 3, expected: '3rd' },
      { day: 4, expected: '4th' },
      { day: 11, expected: '11th' }, // Special case
      { day: 12, expected: '12th' }, // Special case
      { day: 13, expected: '13th' }, // Special case
      { day: 21, expected: '21st' },
      { day: 22, expected: '22nd' },
      { day: 23, expected: '23rd' },
      { day: 31, expected: '31st' },
    ];

    testCases.forEach(({ day, expected }) => {
      it(`should format day ${day} as ${expected}`, () => {
        // Use a month that has 31 days (January = month 0)
        const date = new Date(2025, 0, day); // January 2025
        const result = fmtDateWithYear(date, 'long');
        expect(result).toContain(expected);
      });
    });
  });

  describe('short format', () => {
    it('should format date as "22 Sept 2025"', () => {
      const date = new Date('2025-09-22');
      const result = fmtDateWithYear(date, 'short');
      expect(result).toBe('22 Sept 2025');
    });
  });

  describe('long format', () => {
    it('should format date as "22nd of September 2025"', () => {
      const date = new Date('2025-09-22');
      const result = fmtDateWithYear(date, 'long');
      expect(result).toBe('22nd of September 2025');
    });
  });

  describe('edge cases', () => {
    it('should return "—" for null', () => {
      expect(fmtDateWithYear(null)).toBe('—');
    });

    it('should return "—" for undefined', () => {
      expect(fmtDateWithYear(undefined)).toBe('—');
    });

    it('should return "—" for invalid date', () => {
      expect(fmtDateWithYear('invalid-date')).toBe('—');
    });
  });
});
