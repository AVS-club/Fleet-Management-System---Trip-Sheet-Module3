import { compressBatch } from './imageCompression';
import { uploadFilesAndGetPublicUrls } from './supabaseStorage';
import { createLogger } from './logger';
import { getCurrentUserId, getUserActiveOrganization } from './supaHelpers';

const logger = createLogger('maintenanceFileUpload');

export type FileUploadCallback = (event: {
  type: 'start' | 'progress' | 'complete' | 'error';
  operation: string;
  progress?: number;
  error?: string;
}) => void;

export interface ServiceGroupFileData {
  bills?: File[];
  batteryWarrantyFiles?: File[];
  tyreWarrantyFiles?: File[];
  partsData?: Array<{
    warrantyDocument?: File;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface ProcessedServiceGroupData {
  bill_url?: string[];
  battery_warranty_url?: string[];
  tyre_warranty_url?: string[];
  partsData?: Array<{
    warrantyDocumentUrl?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Uploads maintenance bills for a service group
 *
 * @param files - Array of bill files to upload
 * @param taskId - The maintenance task ID
 * @param groupIndex - Index of the service group
 * @returns Array of public URLs for uploaded bills
 */
export const uploadMaintenanceBills = async (
  files: File[],
  taskId: string,
  groupIndex: number
): Promise<string[]> => {
  if (!files || files.length === 0) return [];

  try {
    logger.debug(`📄 Uploading ${files.length} bill(s) for group ${groupIndex}`);

    // Get organization ID for path namespacing
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No active organization found');
    }

    // Compress images before upload
    const compressedFiles = await compressBatch(files);

    // Upload to Supabase storage with organization-based path
    // Path structure: {org-id}/tasks/{task-id}/bills/{filename}
    const billUrls = await uploadFilesAndGetPublicUrls(
      "maintenance-bills",
      `${organizationId}/tasks/${taskId}/group${groupIndex}/bills`,
      compressedFiles
    );

    logger.debug(`✅ Uploaded ${billUrls.length} bill(s)`);
    return billUrls;
  } catch (error) {
    logger.error(`Failed to upload bills for group ${groupIndex}:`, error);
    throw new Error(`Failed to upload bills for service group ${groupIndex + 1}`);
  }
};

/**
 * Uploads warranty documents (battery, tyre, or parts)
 *
 * @param files - Array of warranty files to upload
 * @param taskId - The maintenance task ID
 * @param groupIndex - Index of the service group
 * @param type - Type of warranty document
 * @returns Array of public URLs for uploaded warranty documents
 */
export const uploadWarrantyDocuments = async (
  files: File[],
  taskId: string,
  groupIndex: number,
  type: 'battery' | 'tyre' | 'part',
  partIndex?: number
): Promise<string[]> => {
  if (!files || files.length === 0) return [];

  try {
    const typeName = type === 'part' && partIndex !== undefined
      ? `part${partIndex}`
      : type;

    logger.debug(`📜 Uploading ${files.length} ${type} warranty document(s) for group ${groupIndex}`);

    // Get organization ID for path namespacing
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No active organization found');
    }

    // Compress images before upload
    const compressedFiles = await compressBatch(files);

    // Upload to appropriate bucket
    const bucketName = type === 'battery'
      ? 'battery-warranties'
      : type === 'tyre'
      ? 'tyre-warranties'
      : 'part-warranties';

    // Determine the subfolder based on type
    const typeFolder = type === 'battery' ? 'batteries' : type === 'tyre' ? 'tyres' : 'parts';

    // Upload with organization-based path
    // Path structure: {org-id}/tasks/{task-id}/{type-folder}/{filename}
    const warrantyUrls = await uploadFilesAndGetPublicUrls(
      bucketName,
      `${organizationId}/tasks/${taskId}/group${groupIndex}/${typeFolder}/${typeName}`,
      compressedFiles
    );

    logger.debug(`✅ Uploaded ${warrantyUrls.length} ${type} warranty document(s)`);
    return warrantyUrls;
  } catch (error) {
    logger.error(`Failed to upload ${type} warranty documents:`, error);
    throw new Error(`Failed to upload ${type} warranty documents`);
  }
};

/**
 * Processes all file uploads for a single service group
 *
 * @param group - Service group data containing file references
 * @param taskId - The maintenance task ID
 * @param groupIndex - Index of the service group
 * @param onFileProgress - Optional callback for individual file upload progress
 * @returns Processed service group with file URLs instead of File objects
 */
export const processServiceGroupFiles = async (
  group: ServiceGroupFileData,
  taskId: string,
  groupIndex: number,
  onFileProgress?: FileUploadCallback
): Promise<ProcessedServiceGroupData> => {
  const processedGroup: ProcessedServiceGroupData = { ...group };

  try {
    // Upload bills
    if (group.bills && group.bills.length > 0) {
      onFileProgress?.({
        type: 'start',
        operation: `group${groupIndex}_bills`,
      });

      const billUrls = await uploadMaintenanceBills(group.bills, taskId, groupIndex);
      processedGroup.bill_url = billUrls;
      delete processedGroup.bills;

      onFileProgress?.({
        type: 'complete',
        operation: `group${groupIndex}_bills`,
        progress: 100,
      });
    }

    // Upload battery warranty files
    if (group.batteryWarrantyFiles && group.batteryWarrantyFiles.length > 0) {
      onFileProgress?.({
        type: 'start',
        operation: `group${groupIndex}_battery_warranty`,
      });

      const batteryWarrantyUrls = await uploadWarrantyDocuments(
        group.batteryWarrantyFiles,
        taskId,
        groupIndex,
        'battery'
      );
      processedGroup.battery_warranty_url = batteryWarrantyUrls;
      delete processedGroup.batteryWarrantyFiles;

      onFileProgress?.({
        type: 'complete',
        operation: `group${groupIndex}_battery_warranty`,
        progress: 100,
      });
    }

    // Upload tyre warranty files
    if (group.tyreWarrantyFiles && group.tyreWarrantyFiles.length > 0) {
      onFileProgress?.({
        type: 'start',
        operation: `group${groupIndex}_tyre_warranty`,
      });

      const tyreWarrantyUrls = await uploadWarrantyDocuments(
        group.tyreWarrantyFiles,
        taskId,
        groupIndex,
        'tyre'
      );
      processedGroup.tyre_warranty_url = tyreWarrantyUrls;
      delete processedGroup.tyreWarrantyFiles;

      onFileProgress?.({
        type: 'complete',
        operation: `group${groupIndex}_tyre_warranty`,
        progress: 100,
      });
    }

    // Upload parts warranty files
    if (group.partsData && group.partsData.length > 0) {
      const processedPartsData = await Promise.all(
        group.partsData.map(async (part, partIndex) => {
          if (part.warrantyDocument) {
            onFileProgress?.({
              type: 'start',
              operation: `group${groupIndex}_part${partIndex}_warranty`,
            });

            const warrantyUrls = await uploadWarrantyDocuments(
              [part.warrantyDocument],
              taskId,
              groupIndex,
              'part',
              partIndex
            );

            onFileProgress?.({
              type: 'complete',
              operation: `group${groupIndex}_part${partIndex}_warranty`,
              progress: 100,
            });

            return {
              ...part,
              warrantyDocumentUrl: warrantyUrls[0],
              warrantyDocument: undefined, // Remove the File object
            };
          }
          return part;
        })
      );

      processedGroup.partsData = processedPartsData;
    }

    return processedGroup;
  } catch (error) {
    logger.error(`Error processing files for service group ${groupIndex}:`, error);

    onFileProgress?.({
      type: 'error',
      operation: `group${groupIndex}_files`,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
};

/**
 * Processes file uploads for multiple service groups
 *
 * @param serviceGroups - Array of service groups with file references
 * @param taskId - The maintenance task ID
 * @param onProgress - Optional progress callback (0-100)
 * @param onFileProgress - Optional callback for individual file upload progress
 * @returns Array of processed service groups with file URLs
 */
export const processAllServiceGroupFiles = async (
  serviceGroups: ServiceGroupFileData[],
  taskId: string,
  onProgress?: (progress: number) => void,
  onFileProgress?: FileUploadCallback
): Promise<ProcessedServiceGroupData[]> => {
  if (!serviceGroups || serviceGroups.length === 0) {
    return [];
  }

  logger.debug(`📁 Processing files for ${serviceGroups.length} service group(s)`);
  const startTime = performance.now();

  const processedGroups: ProcessedServiceGroupData[] = [];

  for (let i = 0; i < serviceGroups.length; i++) {
    try {
      const processedGroup = await processServiceGroupFiles(
        serviceGroups[i],
        taskId,
        i,
        onFileProgress
      );
      processedGroups.push(processedGroup);

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + 1) / serviceGroups.length) * 100);
        onProgress(progress);
      }
    } catch (error) {
      logger.error(`Failed to process service group ${i}:`, error);

      onFileProgress?.({
        type: 'error',
        operation: `service_group_${i}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(`Failed to process service group ${i + 1}`);
    }
  }

  const duration = performance.now() - startTime;
  logger.debug(`✅ Processed all service groups in ${duration.toFixed(2)}ms`);

  return processedGroups;
};

/**
 * Validates that all required files are present in service groups
 *
 * @param serviceGroups - Array of service groups to validate
 * @returns Validation result with errors if any
 */
export const validateServiceGroupFiles = (
  serviceGroups: ServiceGroupFileData[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!serviceGroups || serviceGroups.length === 0) {
    return { valid: true, errors: [] };
  }

  serviceGroups.forEach((group, index) => {
    // Check if bills exist and are valid File objects
    if (group.bills && group.bills.length > 0) {
      group.bills.forEach((bill, billIndex) => {
        if (!(bill instanceof File)) {
          errors.push(`Service group ${index + 1}, bill ${billIndex + 1}: Invalid file object`);
        }
      });
    }

    // Validate battery warranty files
    if (group.batteryWarrantyFiles && group.batteryWarrantyFiles.length > 0) {
      group.batteryWarrantyFiles.forEach((file, fileIndex) => {
        if (!(file instanceof File)) {
          errors.push(`Service group ${index + 1}, battery warranty ${fileIndex + 1}: Invalid file object`);
        }
      });
    }

    // Validate tyre warranty files
    if (group.tyreWarrantyFiles && group.tyreWarrantyFiles.length > 0) {
      group.tyreWarrantyFiles.forEach((file, fileIndex) => {
        if (!(file instanceof File)) {
          errors.push(`Service group ${index + 1}, tyre warranty ${fileIndex + 1}: Invalid file object`);
        }
      });
    }

    // Validate parts warranty files
    if (group.partsData && group.partsData.length > 0) {
      group.partsData.forEach((part, partIndex) => {
        if (part.warrantyDocument && !(part.warrantyDocument instanceof File)) {
          errors.push(`Service group ${index + 1}, part ${partIndex + 1}: Invalid warranty file object`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
