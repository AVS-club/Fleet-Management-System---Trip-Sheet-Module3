export function formatKmPerLitre(value: number | string, decimalPlaces = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  return `${num.toFixed(decimalPlaces)} km/L`;
}

export function truncateString(str: string, num: number = 4): string {
  if (!str) return '';
  if (str.length <= num) return str;
  return str.slice(0, num).toUpperCase();
}