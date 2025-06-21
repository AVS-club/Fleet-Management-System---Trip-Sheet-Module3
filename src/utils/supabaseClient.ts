import { createClient } from '@supabase/supabase-js';

// Simplified environment variable access for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if the environment variables are properly set
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
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
  // Add debugging information
  console.log('Supabase configuration check:', {
    supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    isConfigured,
    urlValid: isValidUrl(supabaseUrl)
  });

  if (!isConfigured) {
    console.warn('Supabase is not properly configured. Using mock client.');
    console.warn('Environment variables:', {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Present' : 'Missing'
    });
    return createMockClient() as any;
  }

  try {
    // Create the client with standard configuration
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'vehicle-management-system'
        }
      }
    });

    console.log('Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    return createMockClient() as any;
  }
};

export const supabase = createSupabaseClient();
export const isSupabaseConfigured = isConfigured;

// Helper function to check if Supabase is accessible with more comprehensive testing
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isConfigured) {
    return false;
  }

  try {
    // Test 1: Try a simple count query
    const { error: countError } = await supabase.from('vehicles').select('count', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Supabase connection test failed (count query):', countError.message);
      return false;
    }

    // Test 2: Try to actually fetch some data to test more comprehensive access
    const { error: selectError } = await supabase
      .from('vehicles')
      .select('id')
      .limit(1);
    
    if (selectError) {
      console.error('Supabase connection test failed (select query):', selectError.message);
      return false;
    }

    // Test 3: Check if we can access trips table (used by updateAllTripMileage)
    const { error: tripError } = await supabase
      .from('trips')
      .select('id')
      .limit(1);
    
    if (tripError) {
      console.error('Supabase connection test failed (trips query):', tripError.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    
    // Check if it's a network error specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Network connection failed. Please check your internet connection and Supabase URL.');
    }
    
    return false;
  }
};