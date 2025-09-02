import { z } from 'zod';

// Combine environment variables from Vite and Node.js for flexibility
const rawEnv = {
  ...(typeof import.meta !== 'undefined' ? (import.meta as any).env : {})
} as Record<string, string | boolean | undefined>;

// Define schema for required environment variables
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url({ message: 'VITE_SUPABASE_URL must be a valid URL' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_GOOGLE_MAPS_API_KEY: z.string().min(1, 'VITE_GOOGLE_MAPS_API_KEY is required'),
  MODE: z.string().optional(),
  DEV: z.union([z.boolean(), z.string()]).optional(),
});

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  const message = parsed.error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
  throw new Error(`Invalid or missing environment variables: ${message}`);
}

const data = parsed.data;
const isDev = data.MODE === 'development' || data.DEV === true || data.DEV === 'true';

export const config = {
  supabaseUrl: data.VITE_SUPABASE_URL,
  supabaseAnonKey: data.VITE_SUPABASE_ANON_KEY,
  googleMapsApiKey: data.VITE_GOOGLE_MAPS_API_KEY,
  isDev,
};

export const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isSupabaseConfigured =
  !!config.supabaseUrl &&
  !!config.supabaseAnonKey &&
  config.supabaseUrl !== 'your_project_url' &&
  config.supabaseAnonKey !== 'your_anon_key' &&
  isValidUrl(config.supabaseUrl);

export default config;
