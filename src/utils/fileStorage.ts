import { supabase } from './supabaseClient';

/**
 * Uploads a file to Supabase storage
 * @param file The file to upload
 * @param bucket The storage bucket name
 * @param path Optional path within the bucket
 * @returns The public URL of the uploaded file
 */
export const uploadFile = async (
  file: File,
  bucket: string,
  path: string = ''
): Promise<string | null> => {
  try {
    // Skip if file is not provided
    if (!file) return null;
    
    // Create a unique filename to prevent collisions
    const timestamp = new Date().getTime();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${file.name.split('.')[0].replace(/\s+/g, '_')}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return null;
  }
};

/**
 * Deletes a file from Supabase storage
 * @param url The public URL of the file to delete
 * @returns Boolean indicating success
 */
export const deleteFile = async (url: string): Promise<boolean> => {
  try {
    // Extract the path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').slice(3).join('/');
    
    // Extract bucket name from URL
    const bucketMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)/);
    const bucket = bucketMatch ? bucketMatch[1] : '';
    
    if (!bucket || !path) {
      console.error('Invalid URL format');
      return false;
    }
    
    // Delete file
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
};

/**
 * Uploads driver documents to Supabase storage
 * @param documents Object containing document files
 * @param driverId Driver ID for path organization
 * @returns Object with document URLs
 */
export const uploadDriverDocuments = async (
  documents: {
    photo?: File;
    license?: File;
    aadhar?: File;
    police?: File;
    bank?: File;
  },
  driverId: string
): Promise<{
  driver_photo_url?: string;
  license_doc_url?: string;
  aadhar_doc_url?: string;
  police_doc_url?: string;
  bank_doc_url?: string;
}> => {
  const bucket = 'driver_docs';
  const path = driverId;
  const urls: {
    driver_photo_url?: string;
    license_doc_url?: string;
    aadhar_doc_url?: string;
    police_doc_url?: string;
    bank_doc_url?: string;
  } = {};
  
  // Upload each document if present
  if (documents.photo) {
    urls.driver_photo_url = await uploadFile(documents.photo, bucket, `${path}/photo`);
  }
  
  if (documents.license) {
    urls.license_doc_url = await uploadFile(documents.license, bucket, `${path}/license`);
  }
  
  if (documents.aadhar) {
    urls.aadhar_doc_url = await uploadFile(documents.aadhar, bucket, `${path}/aadhar`);
  }
  
  if (documents.police) {
    urls.police_doc_url = await uploadFile(documents.police, bucket, `${path}/police`);
  }
  
  if (documents.bank) {
    urls.bank_doc_url = await uploadFile(documents.bank, bucket, `${path}/bank`);
  }
  
  return urls;
};

export default {
  uploadFile,
  deleteFile,
  uploadDriverDocuments
};