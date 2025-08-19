// src/utils/vehicleNormalize.ts

// Canonical values your app/DB expects
export const VEHICLE_TYPES = ['truck', 'bus', 'car', 'van'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * Convert anything we get from Vahan / manual entry into one of our
 * canonical vehicle types. Falls back to 'truck'.
 */
export function normalizeVehicleType(raw?: string | null): VehicleType {
  const s = (raw ?? '').toString().trim().toLowerCase();

  // common synonyms / noise from Vahan & user inputs
  const map: Record<string, VehicleType> = {
    truck: 'truck',
    lorry: 'truck',
    hgv: 'truck',
    mhcv: 'truck',
    tipper: 'truck',
    dumper: 'truck',
    tanker: 'truck',
    trailer: 'truck',

    bus: 'bus',
    coach: 'bus',
    'school bus': 'bus',

    car: 'car',
    suv: 'car',
    sedan: 'car',
    hatchback: 'car',
    'motor car': 'car',

    van: 'van',
    pickup: 'van',
    pickupvan: 'van',
    'pick up': 'van',
    minivan: 'van',
  };

  // direct match
  if ((VEHICLE_TYPES as readonly string[]).includes(s)) return s as VehicleType;

  // mapped match
  if (s in map) return map[s];

  // heuristic: simple contains checks
  if (/\b(bus|coach)\b/.test(s)) return 'bus';
  if (/\b(car|suv|sedan|hatch)\b/.test(s)) return 'car';
  if (/\b(van|pickup)\b/.test(s)) return 'van';

  // default
  return 'truck';
}