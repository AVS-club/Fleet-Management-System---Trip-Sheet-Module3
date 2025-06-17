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

// Create a comprehensive mock client if Supabase is not configured
const createMockClient = () => {
  const mockError = new Error('Supabase not configured. Please check your environment variables.');
  
  // Create a chainable query builder mock
  const createQueryBuilder = () => {
    const queryBuilder = {
      select: () => queryBuilder,
      insert: () => queryBuilder,
      update: () => queryBuilder,
      delete: () => queryBuilder,
      upsert: () => queryBuilder,
      order: () => queryBuilder,
      eq: () => queryBuilder,
      neq: () => queryBuilder,
      gt: () => queryBuilder,
      gte: () => queryBuilder,
      lt: () => queryBuilder,
      lte: () => queryBuilder,
      like: () => queryBuilder,
      ilike: () => queryBuilder,
      is: () => queryBuilder,
      in: () => queryBuilder,
      contains: () => queryBuilder,
      containedBy: () => queryBuilder,
      rangeGt: () => queryBuilder,
      rangeGte: () => queryBuilder,
      rangeLt: () => queryBuilder,
      rangeLte: () => queryBuilder,
      rangeAdjacent: () => queryBuilder,
      overlaps: () => queryBuilder,
      textSearch: () => queryBuilder,
      match: () => queryBuilder,
      not: () => queryBuilder,
      or: () => queryBuilder,
      filter: () => queryBuilder,
      limit: () => queryBuilder,
      range: () => queryBuilder,
      abortSignal: () => queryBuilder,
      single: () => Promise.resolve({ data: null, error: mockError }),
      maybeSingle: () => Promise.resolve({ data: null, error: mockError }),
      csv: () => Promise.resolve({ data: '', error: mockError }),
      geojson: () => Promise.resolve({ data: null, error: mockError }),
      explain: () => Promise.resolve({ data: null, error: mockError }),
      rollback: () => Promise.resolve({ data: null, error: mockError }),
      returns: () => queryBuilder,
      then: (resolve: any) => resolve({ data: [], error: mockError }),
      catch: (reject: any) => reject(mockError)
    };
    return queryBuilder;
  };

  return {
    from: () => createQueryBuilder(),
    auth: {
      signUp: () => Promise.resolve({ data: null, error: mockError }),
      signInWithPassword: () => Promise.resolve({ data: null, error: mockError }),
      signOut: () => Promise.resolve({ error: mockError }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: mockError }),
      getSession: () => Promise.resolve({ data: { session: null }, error: mockError }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: mockError }),
      updateUser: () => Promise.resolve({ data: null, error: mockError }),
      setSession: () => Promise.resolve({ data: { session: null }, error: mockError }),
      exchangeCodeForSession: () => Promise.resolve({ data: { session: null }, error: mockError }),
      mfa: {
        enroll: () => Promise.resolve({ data: null, error: mockError }),
        challenge: () => Promise.resolve({ data: null, error: mockError }),
        verify: () => Promise.resolve({ data: null, error: mockError }),
        challengeAndVerify: () => Promise.resolve({ data: null, error: mockError }),
        unenroll: () => Promise.resolve({ data: null, error: mockError }),
        getAuthenticatorAssuranceLevel: () => Promise.resolve({ data: null, error: mockError })
      }
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: mockError }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        download: () => Promise.resolve({ data: null, error: mockError }),
        list: () => Promise.resolve({ data: [], error: mockError }),
        remove: () => Promise.resolve({ data: null, error: mockError }),
        move: () => Promise.resolve({ data: null, error: mockError }),
        copy: () => Promise.resolve({ data: null, error: mockError }),
        createSignedUrl: () => Promise.resolve({ data: null, error: mockError }),
        createSignedUrls: () => Promise.resolve({ data: [], error: mockError }),
        createSignedUploadUrl: () => Promise.resolve({ data: null, error: mockError }),
        updateFileOptions: () => Promise.resolve({ data: null, error: mockError })
      })
    },
    realtime: {
      channel: () => ({
        on: () => ({}),
        subscribe: () => Promise.resolve('ok'),
        unsubscribe: () => Promise.resolve('ok'),
        send: () => Promise.resolve('ok')
      }),
      removeChannel: () => Promise.resolve('ok'),
      removeAllChannels: () => Promise.resolve('ok'),
      getChannels: () => []
    },
    rpc: () => Promise.resolve({ data: null, error: mockError }),
    channel: () => ({
      on: () => ({}),
      subscribe: () => Promise.resolve('ok'),
      unsubscribe: () => Promise.resolve('ok'),
      send: () => Promise.resolve('ok')
    }),
    removeChannel: () => Promise.resolve('ok'),
    removeAllChannels: () => Promise.resolve('ok'),
    getChannels: () => []
  };
};

// Create the Supabase client with enhanced error handling
const createSupabaseClient = () => {
  if (!isConfigured) {
    console.warn('Supabase is not properly configured. Using mock client.');
    return createMockClient() as any;
  }

  try {
    // Create the client with additional options for better error handling
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'vehicle-management-system'
        },
        // Add custom fetch function to handle network errors gracefully
        fetch: async (url, options = {}) => {
          try {
            const response = await fetch(url, {
              ...options,
              headers: {
                ...options.headers,
              }
            });
            
            // Check if the response is ok
            if (!response.ok) {
              // Log the error for debugging
              console.error(`Supabase API error: ${response.status} ${response.statusText}`);
              
              // If it's a 401, it might be an auth issue
              if (response.status === 401) {
                console.error('Authentication error. Please check your Supabase anon key.');
              }
              
              // If it's a 404, the resource might not exist
              if (response.status === 404) {
                console.error('Resource not found. Please check your Supabase project URL.');
              }
            }
            
            return response;
          } catch (error) {
            // Handle network errors
            console.error('Network error when connecting to Supabase:', error);
            
            // Check if it's a fetch error (network issue)
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              console.error('Failed to connect to Supabase. Please check:');
              console.error('1. Your internet connection');
              console.error('2. Supabase project URL:', supabaseUrl);
              console.error('3. Supabase project status');
              
              // Create a response-like object for the error
              throw new Error(`Network error: Unable to connect to Supabase at ${supabaseUrl}. Please check your connection and Supabase project status.`);
            }
            
            throw error;
          }
        }
      }
    });

    return client;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return createMockClient() as any;
  }
};

export const supabase = createSupabaseClient();
export const isSupabaseConfigured = isConfigured;

// Helper function to check if Supabase is accessible
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isConfigured) {
    return false;
  }

  try {
    // Try a simple query to test the connection
    const { error } = await supabase.from('vehicles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Log configuration status on startup
if (typeof window !== 'undefined') {
  console.log('Supabase configuration status:', {
    configured: isConfigured,
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey
  });
}