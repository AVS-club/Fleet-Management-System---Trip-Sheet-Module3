import { supabase } from "./supabaseClient";
import { handleSupabaseError } from "./errors";

/**
 * Upload progress callback function type
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Uploads a vehicle document to Supabase Storage
 * @param file The file to upload
 * @param vehicleId The ID of the vehicle
 * @param docType The type of document (e.g., 'rc', 'insurance', 'fitness')
 * @param onProgress Optional callback for upload progress
 * @returns The file path of the uploaded file (not the public URL)
 */
export const uploadVehicleDocument = async (
  file: File,
  vehicleId: string,
  docType: string,
  onProgress?: UploadProgressCallback
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension
  const fileExt = file.name.split(".").pop();
  // Create a unique filename
  const fileName = `${vehicleId}/${docType}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  if (onProgress) {
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          onProgress(100);
          resolve(filePath);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Upload failed'));
      };
      
      // Get signed upload URL from Supabase
      supabase.storage
        .from("vehicle-docs")
        .createSignedUploadUrl(filePath)
        .then(({ data, error }) => {
          if (error) {
            reject(error);
            return;
          }
          
          const formData = new FormData();
          formData.append('file', file);
          
          xhr.open('PUT', data.signedUrl);
          xhr.setRequestHeader('x-upsert', 'true');
          xhr.send(file);
        })
        .catch(reject);
    });
  }

  // Upload the file
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


  // Return the file path instead of the public URL
  return filePath;
};

/**
 * Generates a signed URL for a vehicle document
 * @param filePath The path of the file in storage
 * @param expiresIn Expiration time in seconds (default: 7 days)
 * @returns The signed URL for the file
 */
export const getSignedDocumentUrl = async (
  filePath: string,
  expiresIn: number = 604800 // 7 days in seconds
): Promise<string> => {
  if (!filePath) {
    throw new Error("No file path provided");
  }

  try {

    const { data, error } = await supabase.storage
      .from("vehicle-docs")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      handleSupabaseError('generate signed URL', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    handleSupabaseError('get signed document URL', error);
    throw error;
  }
};

/**
 * Uploads a driver document to Supabase Storage
 * @param file The file to upload
 * @param driverId The ID of the driver
 * @param docType The type of document (e.g., 'license', 'photo')
 * @param onProgress Optional callback for upload progress
 * @returns The file path of the uploaded file
 */
export const uploadDriverDocument = async (
  file: File,
  driverId: string,
  docType: string,
  onProgress?: UploadProgressCallback
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension
  const fileExt = file.name.split(".").pop();
  // Create a unique filename
  const fileName = `${driverId}/${docType}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  if (onProgress) {
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          onProgress(100);
          resolve(filePath);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Upload failed'));
      };
      
      // Get signed upload URL from Supabase
      supabase.storage
        .from("driver-docs")
        .createSignedUploadUrl(filePath)
        .then(({ data, error }) => {
          if (error) {
            reject(error);
            return;
          }
          
          const formData = new FormData();
          formData.append('file', file);
          
          xhr.open('PUT', data.signedUrl);
          xhr.setRequestHeader('x-upsert', 'true');
          xhr.send(file);
        })
        .catch(reject);
    });
  }

  // Upload the file
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

  // Return the file path instead of the public URL
  return filePath;
};

/**
 * Generates a signed URL for a driver document
 * @param filePath The path of the file in storage
 * @param expiresIn Expiration time in seconds (default: 7 days)
 * @returns The signed URL for the file
 */
export const getSignedDriverDocumentUrl = async (
  filePath: string,
  expiresIn: number = 604800 // 7 days in seconds
): Promise<string> => {
  if (!filePath) {
    throw new Error("No file path provided");
  }

  try {
    // Clean the file path to remove any URL prefix and bucket name
    const cleanedPath = filePath
      .replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/(?:public|sign)\/[^\/]+\//, '')
      .replace(/^driver-docs\//, '');

    const { data, error } = await supabase.storage
      .from("driver-docs")
      .createSignedUrl(cleanedPath, expiresIn);

    if (error) {
      handleSupabaseError('generate signed URL for driver document', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    handleSupabaseError('get signed driver document URL', error);
    throw error;
  }
};

/**
 * Uploads multiple files to Supabase Storage and returns their public URLs.
 * @param bucketId - The Supabase Storage bucket name.
 * @param pathPrefix - The folder path prefix (e.g., "{userId}/drivingLicence").
 * @param files - Array of File objects to upload.
 * @returns Array of public URLs for the uploaded files.
 * @throws Error if any upload fails.
 */
export async function uploadFilesAndGetPublicUrls(
  bucketId: string,
  pathPrefix: string,
  files: File[]
): Promise<string[]> {
  // Handle case where files is null or undefined
  if (!files || files.length === 0) {
    return [];
  }

  try {
    const uploadedPaths: string[] = [];

    await Promise.all(
      files.map(async (file, i) => {
        const docName = pathPrefix.split("/").pop() || "document";
        const ext = file.name.split(".").pop();
        const filePath = `${pathPrefix}/${docName}_${i}.${ext}`;
        const { data, error } = await supabase.storage
          .from(bucketId)
          .upload(filePath, file, { upsert: true });
        if (error) throw error;
        if (data?.path) uploadedPaths.push(data.path);
      })
    );

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
