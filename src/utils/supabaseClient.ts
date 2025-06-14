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
  const mockError = new Error('Supabase not configured');
  
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

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as any;

export const isSupabaseConfigured = isConfigured;