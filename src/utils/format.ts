export function formatKmPerLitre(value: number | string, decimalPlaces = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return `${num.toFixed(decimalPlaces)} km/L`;
}

export function truncateString(str: string, maxLength: number = 4): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).toUpperCase();
}