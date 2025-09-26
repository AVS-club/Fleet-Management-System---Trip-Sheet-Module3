/**
 * Format a date with year in either short or long format
 * @param d - The date value (string, Date, null, or undefined)
 * @param style - Format style: "short" (22 Sept 2025) or "long" (22nd of September 2025)
 * @returns Formatted date string or "—" for invalid/missing dates
 */
export function fmtDateWithYear(
  d: string | Date | null | undefined,
  style: "short" | "long" = "short"
): string {
  // Handle null/undefined dates
  if (!d) return "—";
  
  // Convert to Date object
  const dt = new Date(d);
  
  // Check for invalid date
  if (Number.isNaN(dt.getTime())) return "—";
  
  if (style === "short") {
    // Format: "22 Sept 2025"
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
      .format(dt)
      .replace(/\./g, ""); // Remove any dots from abbreviated months
  }
  
  // Long format: "22nd of September 2025"
  const day = dt.getDate();
  
  // Determine ordinal suffix
  const getOrdinal = (n: number): string => {
    // Special cases for 11th, 12th, 13th
    if (n === 11 || n === 12 || n === 13) return "th";
    
    // Regular cases based on last digit
    const lastDigit = n % 10;
    switch (lastDigit) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };
  
  const ordinal = getOrdinal(day);
  const month = new Intl.DateTimeFormat("en-GB", { 
    month: "long" 
  }).format(dt);
  
  return `${day}${ordinal} of ${month} ${dt.getFullYear()}`;
}

/**
 * Unit tests for date formatting (for reference)
 */
export const testDateFormatter = () => {
  const testCases = [
    { date: "2025-09-01", expected: "1st" },
    { date: "2025-09-02", expected: "2nd" },
    { date: "2025-09-03", expected: "3rd" },
    { date: "2025-09-04", expected: "4th" },
    { date: "2025-09-11", expected: "11th" },
    { date: "2025-09-12", expected: "12th" },
    { date: "2025-09-13", expected: "13th" },
    { date: "2025-09-21", expected: "21st" },
    { date: "2025-09-22", expected: "22nd" },
    { date: "2025-09-23", expected: "23rd" },
    { date: "2025-09-31", expected: "31st" },
  ];
  
  testCases.forEach(({ date, expected }) => {
    const formatted = fmtDateWithYear(date, "long");
    const ordinal = formatted.split(' ')[0];
    console.assert(
      ordinal.includes(expected),
      `Expected ${expected} but got ${ordinal}`
    );
  });
};
