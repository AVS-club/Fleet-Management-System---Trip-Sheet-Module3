import { supabase } from "./supabaseClient";
import { handleSupabaseError } from "./errors";

/**
 * Clean and normalize file paths
 */
const cleanFilePath = (filePath: string): string => {
  if (!filePath) return '';
  
  // If it's already a clean path (e.g., "vehicleId/docType_timestamp.ext"), return as is
  if (!filePath.includes('http') && !filePath.includes('vehicle-docs') && !filePath.includes('driver-docs')) {
    return filePath;
  }
  
  // Remove any URL prefixes and bucket names
  return filePath
    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, '')
    .replace(/^vehicle-docs\//, '')
    .replace(/^driver-docs\//, '')
    .trim();
};

/**
 * Check if a file exists in storage
 */
const checkFileExists = async (
  bucketName: string,
  filePath: string
): Promise<boolean> => {
  try {
    const cleanPath = cleanFilePath(filePath);
    if (!cleanPath) return false;

    // Try to get file metadata
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(cleanPath.split('/')[0], {
        search: cleanPath.split('/').pop()
      });

    return !error && data && data.length > 0;
  } catch (error) {
    console.warn(`File check failed for ${filePath}:`, error);
    return false;
  }
};

/**
 * Uploads a file with progress tracking using XMLHttpRequest
 * @param bucketName The Supabase storage bucket name
 * @param filePath The file path in the bucket
 * @param file The file to upload
 * @param onProgress Callback for progress updates (0-100)
 * @returns Promise<string> The file path
 */
const uploadFileWithProgress = async (
  bucketName: string,
  filePath: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Get the upload URL from Supabase
    supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath)
      .then(({ data, error }) => {
        if (error || !data) {
          reject(error || new Error('Failed to get upload URL'));
          return;
        }

        // Configure the XMLHttpRequest
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(filePath);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        // Perform the upload
        xhr.open('PUT', data.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      })
      .catch(reject);
  });
};

/**
 * Uploads a vehicle document to Supabase Storage
 * @param file The file to upload
 * @param vehicleId The ID of the vehicle
 * @param docType The type of document (e.g., 'rc', 'insurance', 'fitness')
 * @param onProgress Optional callback for progress updates
 * @returns The file path of the uploaded file (not the public URL)
 */
export const uploadVehicleDocument = async (
  file: File,
  vehicleId: string,
  docType: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension and original name
  const fileExt = file.name.split(".").pop();
  const originalName = file.name;
  
  // Create a unique filename that preserves original name
  const fileName = `${vehicleId}/${docType}_${Date.now()}_${originalName}`;
  const filePath = fileName;


  // Upload the file with progress if callback provided
  if (onProgress) {
    await uploadFileWithProgress("vehicle-docs", filePath, file, onProgress);
  } else {
    // Fallback to regular upload without progress
    const { error: uploadError } = await supabase.storage
      .from("vehicle-docs")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      handleSupabaseError('upload vehicle document', uploadError);
      throw uploadError;
    }
  }


  // Return the file path instead of the public URL
  return filePath;
};

/**
 * Generates a signed URL for a vehicle document with validation
 * Returns null instead of throwing errors for missing files
 */
export const getSignedDocumentUrl = async (
  filePath: string,
  expiresIn: number = 604800 // 7 days in seconds
): Promise<string | null> => {
  if (!filePath) {
    console.warn("No file path provided");
    return null;
  }

  try {
    const cleanedPath = cleanFilePath(filePath);
    
    if (!cleanedPath) {
      console.warn("Invalid file path after cleaning:", filePath);
      return null;
    }

    // Generate signed URL without checking existence first (faster)
    const { data, error } = await supabase.storage
      .from("vehicle-docs")
      .createSignedUrl(cleanedPath, expiresIn);

    if (error) {
      // Log but don't throw - return null for missing files
      if (error.message?.includes('not found') || error.statusCode === 404) {
        console.warn(`File not found in storage: ${cleanedPath}`);
        return null;
      }
      console.error(`Failed to generate signed URL for ${cleanedPath}:`, error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error generating signed document URL:', error);
    return null;
  }
};

/**
 * Deletes a vehicle document from Supabase Storage
 * @param filePath The path of the file to delete
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export const deleteVehicleDocument = async (filePath: string): Promise<boolean> => {
  if (!filePath) {
    console.warn('No file path provided for deletion');
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from("vehicle-docs")
      .remove([filePath]);

    if (error) {
      handleSupabaseError('delete vehicle document', error);
      return false;
    }

    return true;
  } catch (error) {
    handleSupabaseError('delete vehicle document', error);
    return false;
  }
};

/**
 * Uploads a driver document to Supabase Storage
 * @param file The file to upload
 * @param driverId The ID of the driver
 * @param docType The type of document (e.g., 'license', 'photo')
 * @param onProgress Optional callback for progress updates
 * @returns The file path of the uploaded file
 */
export const uploadDriverDocument = async (
  file: File,
  driverId: string,
  docType: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension and original name
  const fileExt = file.name.split(".").pop();
  const originalName = file.name;
  
  // Create a unique filename that preserves original name
  const fileName = `${driverId}/${docType}_${Date.now()}_${originalName}`;
  const filePath = fileName;

  // Upload the file with progress if callback provided
  if (onProgress) {
    await uploadFileWithProgress("driver-docs", filePath, file, onProgress);
  } else {
    // Fallback to regular upload without progress
    const { error: uploadError } = await supabase.storage
      .from("driver-docs")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      handleSupabaseError('upload driver document', uploadError);
      throw new Error(`Error uploading document: ${uploadError.message}`);
    }
  }
  // Return the file path instead of the public URL
  return filePath;
};

/**
 * Generates a signed URL for a driver document
 */
export const getSignedDriverDocumentUrl = async (
  filePath: string,
  expiresIn: number = 604800
): Promise<string | null> => {
  if (!filePath) {
    console.warn("No file path provided");
    return null;
  }

  try {
    const cleanedPath = cleanFilePath(filePath);
    
    if (!cleanedPath) {
      console.warn("Invalid file path after cleaning:", filePath);
      return null;
    }

    const { data, error } = await supabase.storage
      .from("driver-docs")
      .createSignedUrl(cleanedPath, expiresIn);

    if (error) {
      if (error.message?.includes('not found') || error.statusCode === 404) {
        console.warn(`File not found in storage: ${cleanedPath}`);
        return null;
      }
      console.error(`Failed to generate signed URL for ${cleanedPath}:`, error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error generating signed driver document URL:', error);
    return null;
  }
};

/**
 * Uploads a fuel bill to Supabase Storage
 * @param file The file to upload
 * @param tripId The ID of the trip
 * @param refuelingIndex The index of the refueling entry
 * @param onProgress Optional callback for progress updates
 * @returns The public URL of the uploaded file
 */
export const uploadFuelBill = async (
  file: File,
  tripId: string,
  refuelingIndex: number,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension
  const fileExt = file.name.split(".").pop();
  // Create a unique filename
  const fileName = `${tripId}/refueling_${refuelingIndex}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  // Upload the file with progress if callback provided
  if (onProgress) {
    await uploadFileWithProgress("trip-docs", filePath, file, onProgress);
  } else {
    // Fallback to regular upload without progress
    const { error: uploadError } = await supabase.storage
      .from("trip-docs")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      handleSupabaseError('upload fuel bill', uploadError);
      throw new Error(`Error uploading fuel bill: ${uploadError.message}`);
    }
  }
  
  // Get public URL for the uploaded file
  const { data } = supabase.storage.from("trip-docs").getPublicUrl(filePath);
  return data.publicUrl;
};

/**
 * Uploads multiple files to Supabase Storage and returns their public URLs.
 * @param bucketId - The Supabase Storage bucket name.
 * @param pathPrefix - The folder path prefix (e.g., "{userId}/drivingLicence").
 * @param files - Array of File objects to upload.
 * @param onProgress - Optional callback for progress updates (0-100).
 * @returns Array of public URLs for the uploaded files.
 * @throws Error if any upload fails.
 */
export async function uploadFilesAndGetPublicUrls(
  bucketId: string,
  pathPrefix: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<string[]> {
  // Handle case where files is null or undefined
  if (!files || files.length === 0) {
    return [];
  }

  try {
    const uploadedPaths: string[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const docName = pathPrefix.split("/").pop() || "document";
        const ext = file.name.split(".").pop();
        const filePath = `${pathPrefix}/${docName}_${i}.${ext}`;
        const { data, error } = await supabase.storage
          .from(bucketId)
          .upload(filePath, file, { upsert: true });
        if (error) throw error;
        if (data?.path) uploadedPaths.push(data.path);
        
        // Report progress
        if (onProgress) {
          const progress = Math.round(((i + 1) / totalFiles) * 100);
          onProgress(progress);
        }
      } catch (error) {
        console.error(`Error uploading file ${i}:`, error);
        throw error;
      }
    }

    // Get public URLs for all uploaded files
    const urls = uploadedPaths.map((path) => {
      const { data } = supabase.storage.from(bucketId).getPublicUrl(path);
      return data.publicUrl;
    });

    return urls;
  } catch (error) {
    handleSupabaseError('upload files to Supabase', error);
    throw new Error(
      "Failed to upload one or more files. Please try again or check your network/storage settings."
    );
  }
}

/**
 * Batch generate signed URLs with graceful error handling
 */
export const generateSignedUrlsBatch = async (
  filePaths: string[] | undefined,
  bucketType: 'vehicle' | 'driver' = 'vehicle'
): Promise<(string | null)[]> => {
  if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
    return [];
  }

  const urlPromises = filePaths.map(path => {
    if (!path) return Promise.resolve(null);
    
    if (bucketType === 'vehicle') {
      return getSignedDocumentUrl(path);
    } else {
      return getSignedDriverDocumentUrl(path);
    }
  });

  // Use Promise.allSettled to handle individual failures gracefully
  const results = await Promise.allSettled(urlPromises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Failed to generate URL for path ${filePaths[index]}:`, result.reason);
      return null;
    }
  });
};

/**
 * Safe wrapper for generating all vehicle document URLs
 */
export const generateVehicleDocumentUrls = async (vehicleData: any): Promise<{
  rc?: (string | null)[];
  insurance?: (string | null)[];
  fitness?: (string | null)[];
  tax?: (string | null)[];
  permit?: (string | null)[];
  puc?: (string | null)[];
  other: Record<string, string | null>;
}> => {
  const urls: any = { other: {} };
  
  // Process each document type
  const docTypes = ['rc', 'insurance', 'fitness', 'tax', 'permit', 'puc'];
  
  for (const type of docTypes) {
    const fieldName = `${type}_document_url`;
    const filePaths = vehicleData[fieldName];
    
    if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
      const generatedUrls = await generateSignedUrlsBatch(filePaths, 'vehicle');
      // Only add if we have at least one valid URL
      const validUrls = generatedUrls.filter(url => url !== null);
      if (validUrls.length > 0) {
        urls[type] = generatedUrls; // Keep nulls to maintain index alignment
      }
    }
  }
  
  // Process other documents
  if (vehicleData.other_documents && Array.isArray(vehicleData.other_documents)) {
    for (let i = 0; i < vehicleData.other_documents.length; i++) {
      const doc = vehicleData.other_documents[i];
      if (doc.file_path) {
        const url = await getSignedDocumentUrl(doc.file_path);
        if (url) {
          urls.other[`other_${i}`] = url;
        }
      }
    }
  }
  
  return urls;
};
