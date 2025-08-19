export const VEHICLE_TYPES = ['truck','tanker','trailer','bus','car','van'] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

const ALIASES: Record<string, VehicleType> = {
  lorry: 'truck',
  hmv: 'truck',
  hcv: 'truck',
  troller: 'trailer',
  omnibus: 'bus',
  suv: 'car',
};

export function normalizeVehicleType(input?: string | null): VehicleType {
  const raw = String(input || '').trim().toLowerCase();
  const guess = ALIASES[raw] ?? raw;
  const match = VEHICLE_TYPES.find(t => t === guess);
  return match ?? 'truck'; // safe default
}