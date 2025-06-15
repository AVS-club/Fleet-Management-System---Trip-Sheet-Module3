import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if the environment variables are properly set
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isConfigured = supabaseUrl && 
                    supabaseAnonKey && 
                    supabaseUrl !== 'your_project_url' && 
                    supabaseAnonKey !== 'your_anon_key' &&
                    isValidUrl(supabaseUrl);

// Create a mock client if Supabase is not configured
const createMockClient = () => ({
  from: () => ({
    select: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
    insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
  }),
  auth: {
    signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: new Error('Supabase not configured') }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') })
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } })
    })
  }
});

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as any;

export const isSupabaseConfigured = isConfigured;