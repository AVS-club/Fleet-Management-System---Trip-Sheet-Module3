import { supabase } from "./supabaseClient";

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

  console.log(`Uploading ${docType} document for vehicle ${vehicleId}...`);

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

  console.log(`Successfully uploaded ${docType} document to path: ${filePath}`);

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
    console.log(`Generating signed URL for document: ${filePath}`);

    const { data, error } = await supabase.storage
      .from("vehicle-docs")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error generating signed URL:", error);
      throw error;
    }

    console.log(`Successfully generated signed URL for ${filePath}`);
    return data.signedUrl;
  } catch (error) {
    console.error("Error in getSignedDocumentUrl:", error);
    throw error;
  }
};

/**
 * Uploads a driver document to Supabase Storage
 * @param file The file to upload
 * @param driverId The ID of the driver
 * @param docType The type of document (e.g., 'license', 'photo')
 * @returns The file path of the uploaded file
 */
export const uploadDriverDocument = async (
  file: File,
  driverId: string,
  docType: string
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Get file extension
  const fileExt = file.name.split(".").pop();
  // Create a unique filename
  const fileName = `${driverId}/${docType}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from("drivers")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Error uploading driver document:", uploadError);
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
    const { data, error } = await supabase.storage
      .from("drivers")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Error generating signed URL for driver document:", error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error in getSignedDriverDocumentUrl:", error);
    throw error;
  }
};
