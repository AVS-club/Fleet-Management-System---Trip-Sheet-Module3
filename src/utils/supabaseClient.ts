import { createClient } from "@supabase/supabase-js";
import config, { isSupabaseConfigured } from "./env";
import { createMockClient } from "./supabase/mockClient";

// Load required environment variables from central config
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

// Check if the environment variables are properly set
const isConfigured = isSupabaseConfigured;

// Create the Supabase client with enhanced error handling
const createSupabaseClient = () => {
  if (!isConfigured) {
    console.error("Supabase is not properly configured. Using mock client.");
    console.error("Environment variables:", {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? "Present" : "Missing",
    });
    console.error("Please ensure you have copied .env.example to .env and filled in your actual Supabase credentials");
    return createMockClient() as any;
  }

  try {
    // Create the client with standard configuration
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "X-Client-Info": "vehicle-management-system",
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    return client;
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    return createMockClient() as any;
  }
};

export const supabase = createSupabaseClient();
const isSupabaseConfigured = isConfigured;

// Helper function to check if Supabase is accessible with more comprehensive testing
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isConfigured) {
    return false;
  }

  try {
    // Test 1: Try a simple auth check first (most basic connection test)
    const { error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error("Supabase connection test failed (auth):", authError.message);
      
      // Check if it's a CORS error specifically
      if (authError.message.includes('Failed to fetch') || 
          authError.message.includes('CORS') ||
          authError.message.includes('Network request failed')) {
        throw new Error('CORS_ERROR');
      }
      
      return false;
    }

    // Test 2: Try a simple count query with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 10000)
    );
    
    const queryPromise = supabase
      .from("vehicles")
      .select("count", { count: "exact", head: true });
    
    const { error: countError } = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (countError) {
      console.error("Supabase connection test failed (count query):", countError.message);
      
      // Check if it's a CORS error specifically
      if (countError.message.includes('Failed to fetch') || 
          countError.message.includes('CORS') ||
          countError.message.includes('Network request failed')) {
        throw new Error('CORS_ERROR');
      }
      
      return false;
    }

    if (config.isDev) console.log("Supabase connection test passed (database query)");
    return true;
  } catch (error) {
    console.error("Supabase connection test error:", error);
    
    // Handle CORS-specific errors
    if (error instanceof Error && error.message === 'CORS_ERROR') {
      throw new Error(`CORS configuration required. Please add your domain to Supabase CORS settings:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API → CORS
4. Add these URLs to allowed origins:
   - ${window.location.origin}
   - http://localhost:5173
   - https://localhost:5173
5. Save the changes and wait 1-2 minutes for them to take effect
6. Reload this page

Current origin: ${window.location.origin}`);
    }
    
    if (config.isDev) console.log("Supabase connection test passed (auth check)");
    
    // Handle timeout errors
    if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') {
      throw new Error('Connection timeout. Please check your internet connection and Supabase project status.');
    }

    // Check if it's a network error specifically
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(`Network connection failed. This is likely a CORS issue.

Please configure CORS in your Supabase project:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API → CORS
4. Add ${window.location.origin} to allowed origins
5. Save and reload this page

If the issue persists, check:
- Your internet connection
- Supabase project status
- Firewall/proxy settings`);
    }

    return false;
  }
};

// Helper function to check if an error is a network/connectivity issue
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || '';
  const errorCode = error.code || '';
  
  return (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('CORS') ||
    errorMessage.includes('ERR_NETWORK') ||
    errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
    errorCode === 'NETWORK_ERROR' ||
    error.name === 'TypeError' && errorMessage.includes('fetch')
  );
};

// Helper function to handle network errors gracefully
export const handleNetworkError = (error: any, fallbackData: any = null) => {
  if (isNetworkError(error)) {
    if (config.isDev) console.warn('Network connectivity issue detected. Using fallback data or retrying...');
    return { data: fallbackData, error: null };
  }
  return { data: null, error };
};