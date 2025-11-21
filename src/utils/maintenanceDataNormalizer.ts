/**
 * Normalizer utility to standardize maintenance data structures
 * between frontend and backend to prevent data loss and inconsistencies
 */

import { createLogger } from './logger';

const logger = createLogger('maintenanceDataNormalizer');

/**
 * Service group field mapping
 */
const SERVICE_GROUP_FIELD_MAP = {
  // Frontend to Backend
  serviceType: 'service_type',
  vendor: 'vendor_id',
  tasks: 'tasks',
  cost: 'cost',
  notes: 'notes',
  bills: 'bill_file',
  partsData: 'parts_data',
  parts: 'parts_data',
  // Keep consistent fields
  id: 'id',
  maintenance_task_id: 'maintenance_task_id',
  part_warranty_url: 'part_warranty_url',
};

/**
 * Part data field mapping
 */
const PART_FIELD_MAP = {
  // Frontend to Backend
  partType: 'part_type',
  partName: 'part_name',
  brand: 'brand',
  serialNumber: 'serial_number',
  quantity: 'quantity',
  warrantyPeriod: 'warranty_period',
  warrantyDocument: 'warranty_document',
  warrantyDocumentUrl: 'warranty_document_url',
  tyrePositions: 'tyre_positions',
  // Keep consistent fields
  id: 'id',
  odometerAtReplacement: 'odometer_at_replacement',
};

/**
 * Normalize a single service group from frontend to backend format
 */
export function normalizeServiceGroupForBackend(group: any): any {
  try {
    const normalized: any = {};

    // Map basic fields
    Object.keys(group).forEach(key => {
      const mappedKey = SERVICE_GROUP_FIELD_MAP[key as keyof typeof SERVICE_GROUP_FIELD_MAP] || key;
      
      if (key === 'serviceType' || key === 'service_type') {
        // Ensure service_type is properly set
        normalized.service_type = group.serviceType || group.service_type || '';
      } else if (key === 'vendor' || key === 'vendor_id') {
        // Ensure vendor_id is properly set
        normalized.vendor_id = group.vendor || group.vendor_id || '';
      } else if (key === 'partsData' || key === 'parts' || key === 'parts_data') {
        // Normalize parts data
        const parts = group.partsData || group.parts || group.parts_data || [];
        normalized.parts_data = normalizePartsDataForBackend(parts);
      } else if (key === 'bills' || key === 'bill_file') {
        // Handle bill files
        normalized.bill_file = group.bills || group.bill_file || [];
      } else {
        normalized[mappedKey] = group[key];
      }
    });

    // Ensure required fields exist
    normalized.tasks = normalized.tasks || [];
    normalized.cost = normalized.cost || 0;
    normalized.notes = normalized.notes || '';

    return normalized;
  } catch (error) {
    logger.error('Error normalizing service group for backend:', error);
    return group; // Return original if normalization fails
  }
}

/**
 * Normalize parts data from frontend to backend format
 */
export function normalizePartsDataForBackend(parts: any[]): any[] {
  if (!Array.isArray(parts)) return [];

  return parts.map(part => {
    try {
      const normalized: any = {};

      Object.keys(part).forEach(key => {
        const mappedKey = PART_FIELD_MAP[key as keyof typeof PART_FIELD_MAP] || key;
        normalized[mappedKey] = part[key];
      });

      // Ensure required fields
      normalized.quantity = normalized.quantity || 1;
      normalized.part_type = normalized.part_type || '';
      normalized.part_name = normalized.part_name || '';

      return normalized;
    } catch (error) {
      logger.error('Error normalizing part data:', error);
      return part;
    }
  });
}

/**
 * Normalize a single service group from backend to frontend format
 */
export function normalizeServiceGroupForFrontend(group: any): any {
  try {
    const normalized: any = {};

    // Reverse map fields
    Object.keys(group).forEach(key => {
      if (key === 'service_type') {
        normalized.serviceType = group.service_type;
      } else if (key === 'vendor_id') {
        normalized.vendor = group.vendor_id;
      } else if (key === 'parts_data') {
        normalized.partsData = normalizePartsDataForFrontend(group.parts_data);
      } else if (key === 'bill_file') {
        normalized.bills = group.bill_file;
      } else {
        normalized[key] = group[key];
      }
    });

    return normalized;
  } catch (error) {
    logger.error('Error normalizing service group for frontend:', error);
    return group;
  }
}

/**
 * Normalize parts data from backend to frontend format
 */
export function normalizePartsDataForFrontend(parts: any[]): any[] {
  if (!Array.isArray(parts)) return [];

  return parts.map(part => {
    try {
      const normalized: any = {};

      Object.keys(part).forEach(key => {
        if (key === 'part_type') {
          normalized.partType = part.part_type;
        } else if (key === 'part_name') {
          normalized.partName = part.part_name;
        } else if (key === 'serial_number') {
          normalized.serialNumber = part.serial_number;
        } else if (key === 'warranty_period') {
          normalized.warrantyPeriod = part.warranty_period;
        } else if (key === 'warranty_document_url') {
          normalized.warrantyDocumentUrl = part.warranty_document_url;
        } else if (key === 'tyre_positions') {
          normalized.tyrePositions = part.tyre_positions;
        } else if (key === 'odometer_at_replacement') {
          normalized.odometerAtReplacement = part.odometer_at_replacement;
        } else {
          normalized[key] = part[key];
        }
      });

      return normalized;
    } catch (error) {
      logger.error('Error normalizing part data for frontend:', error);
      return part;
    }
  });
}

/**
 * Normalize entire maintenance task data for backend
 */
export function normalizeMaintenanceTaskForBackend(task: any): any {
  try {
    const normalized = { ...task };

    // Normalize service groups if present
    if (task.service_groups && Array.isArray(task.service_groups)) {
      normalized.service_groups = task.service_groups.map(normalizeServiceGroupForBackend);
    }

    // Remove deprecated fields
    delete normalized.estimated_cost;
    delete normalized.actual_cost;

    // Ensure dates are properly formatted
    if (normalized.start_date === '') {
      normalized.start_date = new Date().toISOString().split('T')[0];
    }
    if (!normalized.end_date || normalized.end_date === '') {
      normalized.end_date = normalized.start_date;
    }

    // Ensure numeric fields are numbers
    normalized.downtime_days = parseInt(normalized.downtime_days) || 0;
    normalized.downtime_hours = parseInt(normalized.downtime_hours) || 0;
    normalized.odometer_reading = parseFloat(normalized.odometer_reading) || 0;

    return normalized;
  } catch (error) {
    logger.error('Error normalizing maintenance task for backend:', error);
    return task;
  }
}

/**
 * Normalize entire maintenance task data for frontend
 */
export function normalizeMaintenanceTaskForFrontend(task: any): any {
  try {
    const normalized = { ...task };

    // Normalize service groups if present
    if (task.service_groups && Array.isArray(task.service_groups)) {
      normalized.service_groups = task.service_groups.map(normalizeServiceGroupForFrontend);
    }

    return normalized;
  } catch (error) {
    logger.error('Error normalizing maintenance task for frontend:', error);
    return task;
  }
}

/**
 * Validate maintenance task data before submission
 */
export function validateMaintenanceTask(task: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field validation
  if (!task.vehicle_id) {
    errors.push('Vehicle selection is required');
  }

  if (!task.start_date || task.start_date === '') {
    errors.push('Start date is required');
  }

  if (!task.odometer_reading || task.odometer_reading < 0) {
    errors.push('Valid odometer reading is required');
  }

  // Date validation
  if (task.start_date && task.end_date) {
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    
    if (endDate < startDate) {
      errors.push('End date cannot be before start date');
    }

    // Check for future dates (warning, not error)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate > today) {
      logger.warn('Start date is in the future');
    }
  }

  // Downtime validation
  if (task.downtime_days < 0) {
    errors.push('Downtime days cannot be negative');
  }

  if (task.downtime_hours < 0 || task.downtime_hours >= 24) {
    errors.push('Downtime hours must be between 0 and 23');
  }

  // Service groups validation
  if (task.service_groups && Array.isArray(task.service_groups)) {
    task.service_groups.forEach((group: any, index: number) => {
      if (group.cost < 0) {
        errors.push(`Service group ${index + 1}: Cost cannot be negative`);
      }

      // Validate parts data
      if (group.partsData && Array.isArray(group.partsData)) {
        group.partsData.forEach((part: any, partIndex: number) => {
          if (part.quantity <= 0) {
            errors.push(`Part ${partIndex + 1} in group ${index + 1}: Quantity must be positive`);
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
