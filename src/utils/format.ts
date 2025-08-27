export function formatKmPerLitre(value: number | string, decimalPlaces = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return `${num.toFixed(decimalPlaces)} km/L`;
}