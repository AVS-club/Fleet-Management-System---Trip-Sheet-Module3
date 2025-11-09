import { MaintenanceTask } from '@/types/maintenance';
import { createLogger } from './logger';

const logger = createLogger('maintenanceValidation');

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings?: string[];
}

/**
 * Validates a maintenance task
 *
 * @param data - Partial maintenance task data
 * @returns Validation result
 */
export const validateMaintenanceTask = (
  data: Partial<MaintenanceTask>
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // Required fields
  if (!data.vehicle_id || data.vehicle_id.trim() === '') {
    errors.vehicle_id = 'Vehicle is required';
  }

  if (!data.start_date || data.start_date === '') {
    errors.start_date = 'Start date is required';
  }

  if (data.odometer_reading === undefined || data.odometer_reading === null) {
    errors.odometer_reading = 'Odometer reading is required';
  } else if (data.odometer_reading < 0) {
    errors.odometer_reading = 'Odometer reading cannot be negative';
  }

  // Optional but recommended fields
  if (!data.task_type || data.task_type.trim() === '') {
    warnings.push('Task type is recommended for better categorization');
  }

  if (!data.garage_id || data.garage_id.trim() === '') {
    warnings.push('Garage/vendor is recommended for record keeping');
  }

  // Date range validation
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (endDate < startDate) {
      errors.end_date = 'End date must be after start date';
    }
  }

  // Cost validation
  if (data.estimated_cost !== undefined && data.estimated_cost < 0) {
    errors.estimated_cost = 'Estimated cost cannot be negative';
  }

  if (data.actual_cost !== undefined && data.actual_cost < 0) {
    errors.actual_cost = 'Actual cost cannot be negative';
  }

  // Downtime validation
  if (data.downtime_days !== undefined && data.downtime_days < 0) {
    errors.downtime_days = 'Downtime days cannot be negative';
  }

  // Priority validation
  if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
    errors.priority = 'Priority must be low, medium, or high';
  }

  // Status validation
  if (data.status && !['open', 'in_progress', 'resolved', 'rework'].includes(data.status)) {
    errors.status = 'Invalid status value';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Validates date range
 *
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Validation result
 */
export const validateDateRange = (
  startDate: string,
  endDate: string
): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!startDate || startDate === '') {
    errors.start_date = 'Start date is required';
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      errors.start_date = 'Invalid start date format';
    }

    if (isNaN(end.getTime())) {
      errors.end_date = 'Invalid end date format';
    }

    if (start.getTime() && end.getTime() && end < start) {
      errors.end_date = 'End date must be after start date';
    }

    // Check if dates are too far in the future
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (start > oneYearFromNow) {
      errors.start_date = 'Start date seems too far in the future';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates odometer reading
 *
 * @param reading - Odometer reading
 * @param previousReading - Previous odometer reading (optional)
 * @returns Validation result
 */
export const validateOdometerReading = (
  reading: number,
  previousReading?: number
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (reading === undefined || reading === null) {
    errors.odometer_reading = 'Odometer reading is required';
    return { valid: false, errors };
  }

  if (reading < 0) {
    errors.odometer_reading = 'Odometer reading cannot be negative';
  }

  if (reading > 10000000) {
    errors.odometer_reading = 'Odometer reading seems unrealistic (> 10,000,000 km)';
  }

  // Validate against previous reading
  if (previousReading !== undefined && previousReading !== null) {
    if (reading < previousReading) {
      warnings.push(
        `Current reading (${reading} km) is less than previous reading (${previousReading} km). This may indicate an error.`
      );
    }

    const difference = reading - previousReading;
    if (difference > 100000) {
      warnings.push(
        `Odometer increased by ${difference.toLocaleString()} km since last reading. Please verify this is correct.`
      );
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Validates cost values
 *
 * @param estimatedCost - Estimated cost
 * @param actualCost - Actual cost
 * @returns Validation result
 */
export const validateCosts = (
  estimatedCost?: number,
  actualCost?: number
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (estimatedCost !== undefined && estimatedCost < 0) {
    errors.estimated_cost = 'Estimated cost cannot be negative';
  }

  if (actualCost !== undefined && actualCost < 0) {
    errors.actual_cost = 'Actual cost cannot be negative';
  }

  // Check if actual cost significantly exceeds estimated cost
  if (
    estimatedCost !== undefined &&
    actualCost !== undefined &&
    estimatedCost > 0 &&
    actualCost > estimatedCost * 1.5
  ) {
    const percentage = ((actualCost - estimatedCost) / estimatedCost) * 100;
    warnings.push(
      `Actual cost is ${percentage.toFixed(0)}% higher than estimated cost`
    );
  }

  // Check for unrealistic costs
  if (actualCost !== undefined && actualCost > 1000000) {
    warnings.push(
      `Cost of ₹${actualCost.toLocaleString()} seems very high. Please verify.`
    );
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Validates warranty information
 *
 * @param warrantyPeriod - Warranty period string
 * @param warrantyExpiryDate - Warranty expiry date
 * @returns Validation result
 */
export const validateWarranty = (
  warrantyPeriod?: string,
  warrantyExpiryDate?: string
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (warrantyExpiryDate) {
    const expiryDate = new Date(warrantyExpiryDate);

    if (isNaN(expiryDate.getTime())) {
      errors.warranty_expiry = 'Invalid warranty expiry date format';
    } else {
      const now = new Date();

      // Check if warranty has already expired
      if (expiryDate < now) {
        warnings.push('Warranty has already expired');
      }

      // Check if expiry date is too far in the future
      const tenYearsFromNow = new Date();
      tenYearsFromNow.setFullYear(now.getFullYear() + 10);

      if (expiryDate > tenYearsFromNow) {
        warnings.push('Warranty expiry date is more than 10 years in the future');
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Validates downtime calculation
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param downtimeDays - Reported downtime days
 * @returns Validation result
 */
export const validateDowntime = (
  startDate: string,
  endDate: string | undefined,
  downtimeDays?: number
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  if (downtimeDays !== undefined && downtimeDays < 0) {
    errors.downtime_days = 'Downtime cannot be negative';
  }

  if (startDate && endDate && downtimeDays !== undefined) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const calculatedDowntime = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (downtimeDays > calculatedDowntime) {
        warnings.push(
          `Reported downtime (${downtimeDays} days) is greater than the date range (${calculatedDowntime} days)`
        );
      }
    }
  }

  // Warn if downtime is excessive
  if (downtimeDays !== undefined && downtimeDays > 30) {
    warnings.push(
      `Vehicle has been down for ${downtimeDays} days. This may require attention.`
    );
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Comprehensive validation that combines all validation checks
 *
 * @param data - Partial maintenance task data
 * @param previousOdometer - Previous odometer reading (optional)
 * @returns Validation result
 */
export const validateMaintenanceTaskComplete = (
  data: Partial<MaintenanceTask>,
  previousOdometer?: number
): ValidationResult => {
  const allErrors: Record<string, string> = {};
  const allWarnings: string[] = [];

  // Basic task validation
  const taskValidation = validateMaintenanceTask(data);
  Object.assign(allErrors, taskValidation.errors);
  if (taskValidation.warnings) {
    allWarnings.push(...taskValidation.warnings);
  }

  // Date range validation
  if (data.start_date && data.end_date) {
    const dateValidation = validateDateRange(data.start_date, data.end_date);
    Object.assign(allErrors, dateValidation.errors);
  }

  // Odometer validation
  if (data.odometer_reading !== undefined) {
    const odometerValidation = validateOdometerReading(
      data.odometer_reading,
      previousOdometer
    );
    Object.assign(allErrors, odometerValidation.errors);
    if (odometerValidation.warnings) {
      allWarnings.push(...odometerValidation.warnings);
    }
  }

  // Cost validation
  const costValidation = validateCosts(data.estimated_cost, data.actual_cost);
  Object.assign(allErrors, costValidation.errors);
  if (costValidation.warnings) {
    allWarnings.push(...costValidation.warnings);
  }

  // Downtime validation
  if (data.start_date) {
    const downtimeValidation = validateDowntime(
      data.start_date,
      data.end_date,
      data.downtime_days
    );
    Object.assign(allErrors, downtimeValidation.errors);
    if (downtimeValidation.warnings) {
      allWarnings.push(...downtimeValidation.warnings);
    }
  }

  // Warranty validation
  if (data.warranty_expiry) {
    const warrantyValidation = validateWarranty(undefined, data.warranty_expiry);
    Object.assign(allErrors, warrantyValidation.errors);
    if (warrantyValidation.warnings) {
      allWarnings.push(...warrantyValidation.warnings);
    }
  }

  const result: ValidationResult = {
    valid: Object.keys(allErrors).length === 0,
    errors: allErrors,
  };

  if (allWarnings.length > 0) {
    result.warnings = allWarnings;
  }

  // Log validation result
  if (!result.valid) {
    logger.warn('Maintenance task validation failed:', result.errors);
  }

  if (result.warnings && result.warnings.length > 0) {
    logger.info('Maintenance task validation warnings:', result.warnings);
  }

  return result;
};
