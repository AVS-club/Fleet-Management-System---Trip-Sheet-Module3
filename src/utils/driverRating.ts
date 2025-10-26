import { Driver } from '../types';

export interface DriverStats {
  total_trips: number;
  total_distance: number;
  total_fuel: number;
  avg_mileage: number;
  active_days: number;
  last_trip_date?: string;
}

export interface DocumentStatus {
  status: 'valid' | 'expiring' | 'expired' | 'missing' | 'unverified';
  color: 'green' | 'yellow' | 'red' | 'gray';
  text: string;
  daysUntilExpiry?: number;
}

export interface RatingDisplay {
  display: string;
  value: number | null;
  color: 'green' | 'yellow' | 'orange' | 'gray';
}

/**
 * Calculate driver performance rating on a 5-star scale
 * Based on weighted criteria:
 * - Fuel Efficiency (30%)
 * - Trip Frequency (20%)
 * - Document Compliance (20%)
 * - Active Days (15%)
 * - Experience (15%)
 */
export const calculateDriverRating = (
  driver: Driver,
  stats: DriverStats | null
): number => {
  if (!stats || stats.total_trips < 5) {
    return 0; // Not enough data
  }

  let rating = 0;
  let maxPoints = 0;

  // 1. Fuel Efficiency (30 points max)
  if (stats.avg_mileage) {
    maxPoints += 30;
    if (stats.avg_mileage >= 15) rating += 30;
    else if (stats.avg_mileage >= 12) rating += 25;
    else if (stats.avg_mileage >= 10) rating += 20;
    else if (stats.avg_mileage >= 8) rating += 15;
    else rating += 10;
  }

  // 2. Trip Frequency (20 points max)
  if (stats.total_trips) {
    maxPoints += 20;
    const monthsActive = getMonthsActive(driver);
    const tripsPerMonth = stats.total_trips / monthsActive;
    if (tripsPerMonth >= 25) rating += 20;
    else if (tripsPerMonth >= 20) rating += 16;
    else if (tripsPerMonth >= 15) rating += 12;
    else if (tripsPerMonth >= 10) rating += 8;
    else rating += 4;
  }

  // 3. Document Compliance (20 points max)
  maxPoints += 20;
  const docStatus = getDocumentStatus(driver);
  let docPoints = 20;
  if (docStatus.status === 'expired') docPoints -= 10;
  else if (docStatus.status === 'expiring') docPoints -= 5;
  if (!driver.documents_verified) docPoints -= 5;
  rating += Math.max(0, docPoints);

  // 4. Active Days (15 points max)
  if (stats.active_days) {
    maxPoints += 15;
    const activeDaysPercent = (stats.active_days / 30) * 100;
    if (activeDaysPercent >= 80) rating += 15;
    else if (activeDaysPercent >= 60) rating += 12;
    else if (activeDaysPercent >= 40) rating += 8;
    else rating += 4;
  }

  // 5. Experience Bonus (15 points max)
  maxPoints += 15;
  const experienceYears = driver.experience_years || 0;
  if (experienceYears >= 5) rating += 15;
  else if (experienceYears >= 3) rating += 12;
  else if (experienceYears >= 2) rating += 8;
  else if (experienceYears >= 1) rating += 5;
  else rating += 2;

  // Convert to 5-star rating
  return maxPoints > 0 ? (rating / maxPoints) * 5 : 0;
};

/**
 * Get document status with color coding and expiry information
 */
export const getDocumentStatus = (driver: Driver): DocumentStatus => {
  const today = new Date();
  const licenseExpiry = driver.license_expiry
    ? new Date(driver.license_expiry)
    : null;

  // Check if license exists
  if (!licenseExpiry) {
    return {
      status: 'missing',
      color: 'gray',
      text: 'License Information Missing',
    };
  }

  // Check if expired
  if (licenseExpiry < today) {
    return {
      status: 'expired',
      color: 'red',
      text: 'License Expired',
    };
  }

  // Calculate days until expiry
  const daysUntilExpiry = Math.ceil(
    (licenseExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if expiring soon (within 30 days)
  if (daysUntilExpiry <= 30) {
    return {
      status: 'expiring',
      color: 'yellow',
      text: `License Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      daysUntilExpiry,
    };
  }

  // Check if documents are not verified
  if (!driver.documents_verified) {
    return {
      status: 'unverified',
      color: 'yellow',
      text: 'Documents Not Verified',
    };
  }

  // All good
  return {
    status: 'valid',
    color: 'green',
    text: 'Documents Valid',
  };
};

/**
 * Calculate months active based on join date or experience
 */
export const getMonthsActive = (driver: Driver): number => {
  if (driver.date_of_joining) {
    const months = Math.floor(
      (Date.now() - new Date(driver.date_of_joining).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );
    return Math.max(1, months); // Minimum 1 month
  }

  // Fallback to experience years
  const experienceMonths = (driver.experience_years || 0) * 12;
  return experienceMonths || 1; // Minimum 1 month
};

/**
 * Get rating display information
 */
export const getDisplayRating = (
  driver: Driver,
  stats: DriverStats | null
): RatingDisplay => {
  // Minimum 5 trips to show rating
  if (!stats || stats.total_trips < 5) {
    return {
      display: 'New',
      value: null,
      color: 'gray',
    };
  }

  const rating = calculateDriverRating(driver, stats);
  const ratingValue = Number(rating.toFixed(1));

  return {
    display: `⭐ ${ratingValue}`,
    value: ratingValue,
    color: ratingValue >= 4 ? 'green' : ratingValue >= 3 ? 'yellow' : 'orange',
  };
};

/**
 * Format distance for display (auto-converts to km with 'k' suffix for large values)
 */
export const formatDistance = (distance: number): string => {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(0)}k km`;
  }
  return `${distance.toFixed(0)} km`;
};

/**
 * Format mileage for display
 */
export const formatMileage = (mileage: number): string => {
  if (mileage === 0) return 'N/A';
  return `${mileage.toFixed(1)} km/L`;
};
