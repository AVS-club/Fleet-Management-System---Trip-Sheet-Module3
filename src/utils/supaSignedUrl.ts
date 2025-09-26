import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const sb = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a signed URL for a storage file
 * @param path - The file path in storage
 * @param bucket - The storage bucket name (default: "vehicle-docs")
 * @param seconds - URL expiry time in seconds (default: 86400 = 24 hours)
 * @returns The signed URL string
 */
export async function signedUrlFromPath(
  path: string,
  bucket = "vehicle-docs",
  seconds = 86400
): Promise<string> {
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(path, seconds);
  
  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
  
  if (!data?.signedUrl) {
    throw new Error('Failed to generate signed URL');
  }
  
  return data.signedUrl;
}
