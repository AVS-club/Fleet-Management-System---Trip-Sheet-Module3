import { supabase } from './supabaseClient';

/**
 * Uploads a vehicle document to Supabase Storage
 * @param file The file to upload
 * @param vehicleId The ID of the vehicle
 * @param docType The type of document (e.g., 'rc', 'insurance', 'fitness')
 * @returns The public URL of the uploaded file
 */
export const uploadVehicleDocument = async (
  file: File,
  vehicleId: string,
  docType: string
): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Get file extension
  const fileExt = file.name.split('.').pop();
  // Create a unique filename
  const fileName = `${vehicleId}/${docType}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from('vehicle-docs')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    console.error('Error uploading vehicle document:', uploadError);
    throw new Error(`Error uploading document: ${uploadError.message}`);
  }

  // Get the public URL
  const { data } = supabase.storage
    .from('vehicle-docs')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Uploads a driver document to Supabase Storage
 * @param file The file to upload
 * @param driverId The ID of the driver
 * @param docType The type of document (e.g., 'license', 'photo')
 * @returns The public URL of the uploaded file
 */
export const uploadDriverDocument = async (
  file: File,
  driverId: string,
  docType: string
): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Get file extension
  const fileExt = file.name.split('.').pop();
  // Create a unique filename
  const fileName = `${driverId}/${docType}_${Date.now()}.${fileExt}`;
  const filePath = fileName;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from('drivers')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

  if (uploadError) {
    console.error('Error uploading driver document:', uploadError);
    throw new Error(`Error uploading document: ${uploadError.message}`);
  }

  // Get the public URL
  const { data } = supabase.storage
    .from('drivers')
    .getPublicUrl(filePath);

  return data.publicUrl;
};