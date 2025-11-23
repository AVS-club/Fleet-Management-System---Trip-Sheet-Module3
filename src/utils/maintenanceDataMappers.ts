import { MaintenanceServiceGroup, MaintenanceServiceLineItem } from '@/types/maintenance';
import { createLogger } from './logger';

const logger = createLogger('maintenanceDataMappers');

/**
 * Form-level service group data structure
 */
export interface FormServiceGroup {
  serviceType: 'purchase' | 'labor' | 'both';
  vendor: string;
  tasks: string[];
  cost: number;
  bills?: File[];
  bill_url?: string[];
  notes?: string;
  use_line_items?: boolean;
  line_items?: MaintenanceServiceLineItem[];
  cost_entry_mode?: 'quick' | 'detailed';
  partsData?: Array<{
    partType: string;
    partName: string;
    brand: string;
    serialNumber?: string;
    quantity: number;
    warrantyPeriod?: string;
    warrantyDocument?: File;
    warrantyDocumentUrl?: string;
  }>;
}

/**
 * Database-level service group structure
 */
export interface DatabaseServiceGroup {
  id?: string;
  maintenance_task_id?: string;
  service_type: 'purchase' | 'labor' | 'both';
  vendor_id: string;
  tasks: string[];
  service_cost: number; // Database field is service_cost, not cost
  bill_url?: string[];
  notes?: string | null;
  use_line_items?: boolean;
  line_items?: MaintenanceServiceLineItem[];
  cost_entry_mode?: 'quick' | 'detailed';
  parts_data?: Array<{
    partType: string;
    partName: string;
    brand: string;
    serialNumber?: string | null;
    quantity: number;
    warrantyPeriod?: string | null;
    warrantyDocumentUrl?: string | null;
  }>;
}

/**
 * Maps a form service group to database format
 *
 * @param group - Service group from form
 * @param taskId - Optional task ID (for updates)
 * @returns Database-formatted service group
 */
export const mapServiceGroupToDatabase = (
  group: FormServiceGroup,
  taskId?: string
): DatabaseServiceGroup => {
  const dbGroup: DatabaseServiceGroup = {
    maintenance_task_id: taskId,
    service_type: group.serviceType,
    vendor_id: group.vendor,
    tasks: group.tasks || [],
    service_cost: group.cost || 0,
    bill_url: group.bill_url || [],
    notes: group.notes || null,
    use_line_items: group.use_line_items || false,
  };

  // Map line items
  if (group.use_line_items && group.line_items && group.line_items.length > 0) {
    dbGroup.line_items = group.line_items.map((item, index) => ({
      item_name: item.item_name,
      description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_order: item.item_order !== undefined ? item.item_order : index,
      id: item.id,
    }));
  }

  // Map parts data
  if (group.partsData && group.partsData.length > 0) {
    dbGroup.parts_data = group.partsData.map((part) => ({
      partType: part.partType,
      partName: part.partName,
      brand: part.brand,
      serialNumber: part.serialNumber || null,
      quantity: part.quantity,
      warrantyPeriod: part.warrantyPeriod || null,
      warrantyDocumentUrl: part.warrantyDocumentUrl || null,
    }));
  }

  return dbGroup;
};

/**
 * Maps multiple form service groups to database format
 *
 * @param groups - Array of service groups from form
 * @param taskId - Optional task ID (for updates)
 * @returns Array of database-formatted service groups
 */
export const mapServiceGroupsToDatabase = (
  groups: FormServiceGroup[],
  taskId?: string
): DatabaseServiceGroup[] => {
  if (!groups || groups.length === 0) {
    return [];
  }

  logger.debug(`Mapping ${groups.length} service group(s) to database format`);

  return groups.map((group) => mapServiceGroupToDatabase(group, taskId));
};

/**
 * Maps a database service group to form format
 *
 * @param dbGroup - Service group from database
 * @returns Form-formatted service group
 */
export const mapDatabaseToFormServiceGroup = (
  dbGroup: MaintenanceServiceGroup | DatabaseServiceGroup
): FormServiceGroup => {
  const formGroup: FormServiceGroup = {
    serviceType: dbGroup.service_type,
    vendor: dbGroup.vendor_id,
    tasks: dbGroup.tasks || [],
    cost: ('service_cost' in dbGroup) ? dbGroup.service_cost : ('cost' in dbGroup) ? dbGroup.cost : 0,
    bill_url: dbGroup.bill_url || [],
    notes: dbGroup.notes || undefined,
    use_line_items: dbGroup.use_line_items || false,
  };

  // Map line items
  if (dbGroup.use_line_items && dbGroup.line_items && dbGroup.line_items.length > 0) {
    formGroup.line_items = dbGroup.line_items.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      item_order: item.item_order,
    }));
  }

  // Map parts data
  if (dbGroup.parts_data && dbGroup.parts_data.length > 0) {
    formGroup.partsData = dbGroup.parts_data.map((part) => ({
      partType: part.partType,
      partName: part.partName,
      brand: part.brand,
      serialNumber: part.serialNumber || undefined,
      quantity: part.quantity,
      warrantyPeriod: part.warrantyPeriod || undefined,
      warrantyDocumentUrl: part.warrantyDocumentUrl || undefined,
    }));
  }

  return formGroup;
};

/**
 * Maps multiple database service groups to form format
 *
 * @param dbGroups - Array of service groups from database
 * @returns Array of form-formatted service groups
 */
export const mapDatabaseToFormServiceGroups = (
  dbGroups: (MaintenanceServiceGroup | DatabaseServiceGroup)[]
): FormServiceGroup[] => {
  if (!dbGroups || dbGroups.length === 0) {
    return [];
  }

  logger.debug(`Mapping ${dbGroups.length} service group(s) to form format`);

  return dbGroups.map((group) => mapDatabaseToFormServiceGroup(group));
};

/**
 * Extracts file references from service groups
 * Useful for validation or preview purposes
 *
 * @param groups - Array of form service groups
 * @returns Object containing all file references
 */
export const extractFileReferences = (groups: FormServiceGroup[]): {
  bills: File[];
  partsWarranties: File[];
} => {
  const files = {
    bills: [] as File[],
    partsWarranties: [] as File[],
  };

  groups.forEach((group) => {
    if (group.bills) {
      files.bills.push(...group.bills);
    }

    if (group.partsData) {
      group.partsData.forEach((part) => {
        if (part.warrantyDocument) {
          files.partsWarranties.push(part.warrantyDocument);
        }
      });
    }
  });

  return files;
};

/**
 * Calculates total cost across all service groups
 *
 * @param groups - Array of service groups
 * @returns Total cost
 */
export const calculateTotalServiceCost = (
  groups: FormServiceGroup[] | DatabaseServiceGroup[]
): number => {
  if (!groups || groups.length === 0) {
    return 0;
  }

  return groups.reduce((total, group) => {
    // Handle both form data (cost) and database data (service_cost)
    const cost = ('service_cost' in group) ? group.service_cost : ('cost' in group) ? group.cost : 0;
    return total + (cost || 0);
  }, 0);
};

/**
 * Validates service group data structure
 *
 * @param group - Service group to validate
 * @returns Validation result
 */
export const validateServiceGroup = (group: FormServiceGroup): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!group.vendor || group.vendor.trim() === '') {
    errors.push('Vendor is required');
  }

  if (!group.serviceType) {
    errors.push('Service type is required');
  }

  if (!group.tasks || group.tasks.length === 0) {
    errors.push('At least one task is required');
  }

  if (group.cost !== undefined && group.cost < 0) {
    errors.push('Cost cannot be negative');
  }

  // Validate parts data if present
  if (group.partsData && group.partsData.length > 0) {
    group.partsData.forEach((part, index) => {
      if (!part.partType || part.partType.trim() === '') {
        errors.push(`Part ${index + 1}: Part type is required`);
      }
      if (!part.partName || part.partName.trim() === '') {
        errors.push(`Part ${index + 1}: Part name is required`);
      }
      if (!part.brand || part.brand.trim() === '') {
        errors.push(`Part ${index + 1}: Brand is required`);
      }
      if (part.quantity === undefined || part.quantity <= 0) {
        errors.push(`Part ${index + 1}: Quantity must be greater than 0`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
