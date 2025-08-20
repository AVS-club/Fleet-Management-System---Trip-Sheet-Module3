import { supabase } from "./supabaseClient";
import { BUCKETS } from "./storageBuckets";
import { Driver } from "../types"; // Assuming Driver type is available

/** Upload a driver file. Object path starts with auth.uid() to satisfy RLS. */
export async function uploadDriverFile(
  file: File | Blob,
  opts: {
    userId: string;        // auth.uid()
    driverKey: string;     // e.g., driver id or sanitized DL number
    filename: string;      // e.g., "dl-front.png"
  }
): Promise<{ path: string }> {
  const { userId, driverKey, filename } = opts;
  const objectName = `${userId}/drivers/${driverKey}/${filename}`;

  const { data, error } = await supabase
    .storage // Use the DRIVERS bucket constant
    .from(BUCKETS.DRIVERS)
    .upload(objectName, file, { upsert: true, cacheControl: "3600" });

  if (error) throw new Error(`Driver file upload failed: ${error.message}`);
  return { path: data.path };
}

/** Signed URL for private driver files (for <img src> / download). */
export async function getSignedDriverUrl(path: string, expiresInSec = 60 * 15) {
  const { data, error } = await supabase
    .storage
    .from(BUCKETS.DRIVERS) // Use the DRIVERS bucket constant
    .createSignedUrl(path, expiresInSec);

  if (error) throw new Error(`Signed URL error: ${error.message}`);
  return data.signedUrl;
}

/** Delete a file (RLS will only allow within caller's own folder). */
export async function deleteDriverFile(path: string) { // This function is not used in the current code
  const { error } = await supabase.storage.from("drivers").remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** Helper to upload all driver documents and return their storage paths. */
export async function uploadAllDriverDocs(
  driverData: Partial<Driver>,
  driverKey: string // Use a stable key for the folder, e.g., DL number or generated ID
): Promise<Partial<Driver>> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");
  const userId = user.id;

  const uploadedPaths: Partial<Driver> = {};

  const safeName = (base: string) =>
    `${base}-${Date.now()}`.replace(/[^a-z0-9\-_.]/gi, "-");

  // Main driver photo
  if (driverData.photo instanceof File) {
    const { path } = await uploadDriverFile(driverData.photo, {
      userId, driverKey, filename: `${safeName("photo")}.${driverData.photo.name.split('.').pop()}`,
    });
    uploadedPaths.driver_photo_url = path;
  }

  // License document
  if (Array.isArray(driverData.license_document) && driverData.license_document.length > 0) {
    const file = driverData.license_document; // Assuming single file for simplicity
    const { path } = await uploadDriverFile(file, {
      userId, driverKey, filename: `${safeName("license")}.${file.name.split('.').pop()}`,
    });
    uploadedPaths.license_doc_url = path; // Store as single string path
  }

  // Aadhaar document
  if (Array.isArray(driverData.aadhaar_document) && driverData.aadhaar_document.length > 0) {
    const file = driverData.aadhaar_document;
    const { path } = await uploadDriverFile(file, {
      userId, driverKey, filename: `${safeName("aadhaar")}.${file.name.split('.').pop()}`,
    });
    uploadedPaths.aadhar_doc_url = path;
  }

  // Police document
  if (Array.isArray(driverData.police_document) && driverData.police_document.length > 0) {
    const file = driverData.police_document;
    const { path } = await uploadDriverFile(file, {
      userId, driverKey, filename: `${safeName("police")}.${file.name.split('.').pop()}`,
    });
    uploadedPaths.police_doc_url = path;
  }

  // Medical document
  if (Array.isArray(driverData.medical_document) && driverData.medical_document.length > 0) {
    const file = driverData.medical_document;
    const { path } = await uploadDriverFile(file, {
      userId, driverKey, filename: `${safeName("medical")}.${file.name.split('.').pop()}`,
    });
    uploadedPaths.medical_doc_url = path;
  }

  // Other documents (handle as an array of objects with file_obj)
  if (Array.isArray(driverData.other_documents)) {
    const otherDocPaths: { name: string; file_path?: string; issue_date?: string; expiry_date?: string; cost?: number }[] = [];
    for (const doc of driverData.other_documents) {
      if (doc.file_obj instanceof File) {
        const file = doc.file_obj;
        const { path } = await uploadDriverFile(file, {
          userId, driverKey, filename: `${safeName(doc.name || "other-doc")}.${file.name.split('.').pop()}`,
        });
        otherDocPaths.push({
          name: doc.name,
          file_path: path,
          issue_date: doc.issue_date,
          expiry_date: doc.expiry_date,
          cost: doc.cost
        });
      } else if (doc.file_path) {
        // Keep existing paths if no new file is uploaded
        otherDocPaths.push(doc);
      }
    }
    uploadedPaths.other_documents = otherDocPaths;
  }

  return uploadedPaths;
}

/**
 * Uploads a vehicle document to Supabase Storage
 * @param file The file to upload
 * @param vehicleId The ID of the vehicle
 * @param docType The type of document (e.g., 'rc', 'insurance', 'fitness')
 * @returns The file path of the uploaded file (not the public URL)
 */
export const uploadVehicleDocument = async (
  file: File,
  vehicleId: string,
  docType: string
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension
  const fileExt = file.name.split(".").pop();
  // Create a unique filename
  const fileName = `${vehicleId}/${docType}_${Date.now()}.${fileExt}`;
  const filePath = fileName;


  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from("vehicle-docs")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Error uploading vehicle document:", uploadError);
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
      console.error("Error generating signed URL:", error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error in getSignedDocumentUrl:", error);
    throw error;
  }
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
    const { data, error } = await supabase.storage // Use the DRIVERS bucket constant
      .from(BUCKETS.DRIVERS)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error generating signed URL for driver document:", error);
      if (error.message.includes("bucket") || error.message.includes("not found")) {
        throw new Error("Storage bucket 'drivers' does not exist or is not accessible. Please create the bucket in Supabase Storage and configure proper RLS policies.");
      }
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error in getSignedDriverDocumentUrl:", error);
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
  try {
    // Check if the bucket exists by trying to list files
    try {
      await supabase.storage.from(bucketId).list("", { limit: 1 });
    } catch (error) {
      console.error(`Storage bucket '${bucketId}' may not exist:`, error);
      throw new Error(`Storage bucket '${bucketId}' does not exist or is not accessible. Please create the bucket in Supabase Storage and configure proper RLS policies.`);
    }

    const uploadedPaths: string[] = [];

    await Promise.all(
      files.map(async (file, i) => {
        const docName = pathPrefix.split("/").pop() || "document";
        const ext = file.name.split(".").pop();
        const filePath = `${pathPrefix}/${docName}_${i}.${ext}`;
        const { data, error } = await supabase.storage
          .from(bucketId)
          .upload(filePath, file, { upsert: true });
        if (error) {
          if (error.message.includes("bucket") || error.message.includes("not found")) {
            throw new Error(`Storage bucket '${bucketId}' does not exist or is not accessible. Please create the bucket in Supabase Storage and configure proper RLS policies.`);
          }
          throw error;
        }
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
    console.error("Error uploading files to Supabase:", error);
    if (error instanceof Error && error.message.includes("bucket")) {
      throw error; // Re-throw bucket-specific errors as-is
    }
    throw new Error("Failed to upload one or more files. Please try again or check your network/storage settings.");
  }
}