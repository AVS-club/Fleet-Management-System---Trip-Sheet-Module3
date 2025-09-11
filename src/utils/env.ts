import { z } from 'zod';

// Combine environment variables from Vite and Node.js for flexibility
const rawEnv = {
  ...(typeof import.meta !== 'undefined' ? (import.meta as any).env : {})
} as Record<string, string | boolean | undefined>;

// Define schema for environment variables with development-friendly fallbacks
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url({ message: 'VITE_SUPABASE_URL must be a valid URL' }).optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required').optional(),
  VITE_GOOGLE_MAPS_API_KEY: z.string().min(1, 'VITE_GOOGLE_MAPS_API_KEY is required').optional(),
  MODE: z.string().optional(),
  DEV: z.union([z.boolean(), z.string()]).optional(),
});

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  const message = parsed.error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
  console.warn(`Environment variable validation warnings: ${message}`);
  console.warn('Using development fallbacks where possible...');
}

const data = parsed.success ? parsed.data : rawEnv;
const isDev = (data as any).MODE === 'development' || (data as any).DEV === true || (data as any).DEV === 'true';

const config = {
  supabaseUrl: data.VITE_SUPABASE_URL,
  supabaseAnonKey: data.VITE_SUPABASE_ANON_KEY,
  googleMapsApiKey: data.VITE_GOOGLE_MAPS_API_KEY,
  isDev,
};

const isValidUrl = (url: string | undefined): boolean => {
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
  isValidUrl(config.supabaseUrl as string);

export default config;
