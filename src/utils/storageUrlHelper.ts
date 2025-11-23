/**
 * Storage URL Helper
 * Utilities for converting between public URLs and signed URLs for Supabase storage
 */

import { supabase } from './supabaseClient';
import { createLogger } from './logger';

const logger = createLogger('storageUrlHelper');

/**
 * Convert a public URL or existing signed URL to a fresh signed URL
 * This ensures files can be accessed even if the bucket isn't fully public
 * 
 * @param url - The public or existing signed URL
 * @param expiresIn - Expiry time in seconds (default: 1 year)
 * @returns A fresh signed URL or the original URL if conversion fails
 */
export const getAccessibleUrl = async (
  url: string,
  expiresIn: number = 365 * 24 * 60 * 60
): Promise<string> => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    // Extract the file path from the URL
    // Public URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    // Signed URL format: https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?token=...
    
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract bucket and file path
    let bucket: string | null = null;
    let filePath: string | null = null;
    
    // Match public URL pattern
    const publicMatch = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (publicMatch) {
      bucket = publicMatch[1];
      filePath = publicMatch[2];
    }
    
    // Match signed URL pattern
    const signedMatch = pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
    if (signedMatch) {
      bucket = signedMatch[1];
      filePath = signedMatch[2];
    }
    
    // If we couldn't extract bucket/path, return original URL
    if (!bucket || !filePath) {
      logger.debug('Could not parse URL, returning original:', url);
      return url;
    }
    
    // Generate a fresh signed URL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);
    
    if (error || !data) {
      logger.debug('Failed to generate signed URL, returning original:', error?.message);
      return url;
    }
    
    logger.debug('Generated fresh signed URL for:', filePath);
    return data.signedUrl;
  } catch (error) {
    logger.error('Error converting URL to signed URL:', error);
    return url; // Return original URL as fallback
  }
};

/**
 * Convert an array of URLs to accessible signed URLs
 * 
 * @param urls - Array of public or existing signed URLs
 * @param expiresIn - Expiry time in seconds (default: 1 year)
 * @returns Array of fresh signed URLs
 */
export const getAccessibleUrls = async (
  urls: string[],
  expiresIn: number = 365 * 24 * 60 * 60
): Promise<string[]> => {
  if (!urls || !Array.isArray(urls)) {
    return [];
  }
  
  const promises = urls.map(url => getAccessibleUrl(url, expiresIn));
  return Promise.all(promises);
};

