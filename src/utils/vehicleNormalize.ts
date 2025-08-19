```typescript
// src/utils/vehicleNormalize.ts
export function normalizeVehicleType(input?: string | null) {
  if (!input) return undefined;
  const s = input.trim().toLowerCase();

  if (['truck','goods','goods carrier','goods vehicle','commercial'].includes(s)) return 'truck';
  if (['bus'].includes(s)) return 'bus';
  if (['car','lmv','hatchback','sedan','suv'].includes(s)) return 'car';
  if (['van','pickup'].includes(s)) return 'van';

  // default for unknown Vahan values
  return 'truck';
}
```