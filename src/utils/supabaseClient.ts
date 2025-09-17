import { createClient } from "@supabase/supabase-js";
import config, { isSupabaseConfigured } from "./env";
import { createMockClient } from "./supabase/mockClient";
import { toast } from "react-toastify";

// Load required environment variables from central config
const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

// Check if the environment variables are properly set
const isConfigured = isSupabaseConfigured;

// Track connection status
let connectionStatus: 'unknown' | 'connected' | 'failed' = 'unknown';
let corsErrorShown = false;

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
    const client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
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

    // Add global error handler for auth failures
    client.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT' && connectionStatus === 'failed') {
        // Don't show multiple error messages
        return;
      }
    });

    return client;
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    connectionStatus = 'failed';
    return createMockClient() as any;
  }
};

export const supabase = createSupabaseClient();

// Enhanced connection test with better error handling
const performConnectionTest = async (): Promise<boolean> => {
  try {
    // Test with a very short timeout to fail fast
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey as string,
        'Authorization': `Bearer ${supabaseAnonKey as string}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 404; // 404 is OK, means server is reachable
  } catch (error) {
    return false;
  }
};

// Helper function to check if Supabase is accessible with more comprehensive testing
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isConfigured) {
    connectionStatus = 'failed';
    return false;
  }

  try {
    // First, test basic connectivity
    const canConnect = await performConnectionTest();
    if (!canConnect) {
      connectionStatus = 'failed';
      if (!corsErrorShown) {
        corsErrorShown = true;
        showCorsError();
      }
      return false;
    }

    // Test 1: Try a simple auth check first (most basic connection test)
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 8000)
    );
    
    const { error: authError } = await Promise.race([sessionPromise, timeoutPromise]) as any;
    
    if (authError) {
      console.error("Supabase connection test failed (auth):", authError.message);
      connectionStatus = 'failed';
      
      // Check if it's a CORS error specifically
      if (authError.message.includes('Failed to fetch') || 
          authError.message.includes('CORS') ||
          authError.message.includes('Network request failed')) {
        if (!corsErrorShown) {
          corsErrorShown = true;
          showCorsError();
        }
        throw new Error('CORS_ERROR');
      }
      
      return false;
    }

    // Test 2: Try a simple count query with timeout
    const queryTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), 10000)
    );
    
    const queryPromise = supabase
      .from("vehicles")
      .select("count", { count: "exact", head: true });
    
    const { error: countError } = await Promise.race([queryPromise, queryTimeoutPromise]) as any;

    if (countError) {
      console.error("Supabase connection test failed (count query):", countError.message);
      connectionStatus = 'failed';
      
      // Check if it's a CORS error specifically
      if (countError.message.includes('Failed to fetch') || 
          countError.message.includes('CORS') ||
          countError.message.includes('Network request failed')) {
        if (!corsErrorShown) {
          corsErrorShown = true;
          showCorsError();
        }
        throw new Error('CORS_ERROR');
      }
      
      return false;
    }

    connectionStatus = 'connected';
    if (config.isDev) console.log("Supabase connection test passed (database query)");
    return true;
  } catch (error) {
    console.error("Supabase connection test error:", error);
    connectionStatus = 'failed';
    
    // Handle CORS-specific errors
    if (error instanceof Error && error.message === 'CORS_ERROR') {
      if (!corsErrorShown) {
        corsErrorShown = true;
        showCorsError();
      }
      throw new Error(`CORS configuration required. Please add your domain to Supabase CORS settings:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API → CORS
4. Add these URLs to allowed origins:
   - ${window.location.origin}
   - http://localhost:5173
   - https://localhost:5173
   - http://localhost:5000
   - https://localhost:5000
5. Save the changes and wait 1-2 minutes for them to take effect
6. Reload this page

Current origin: ${window.location.origin}`);
    }
    
    // Handle timeout errors
    if (error instanceof Error && (error.message === 'REQUEST_TIMEOUT' || error.message === 'AUTH_TIMEOUT')) {
      if (!corsErrorShown) {
        corsErrorShown = true;
        showCorsError();
      }
      throw new Error('Connection timeout. Please check your internet connection and Supabase project status.');
    }
    
    // Handle abort errors (from our timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      if (!corsErrorShown) {
        corsErrorShown = true;
        showCorsError();
      }
      return false;
    }

    // Check if it's a network error specifically
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      if (!corsErrorShown) {
        corsErrorShown = true;
        showCorsError();
      }
      throw new Error(`Network connection failed. This is likely a CORS issue.

Please configure CORS in your Supabase project:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API → CORS
4. Add ${window.location.origin} to allowed origins
   Also add: http://localhost:5000, https://localhost:5000
5. Save and reload this page

If the issue persists, check:
- Your internet connection
- Supabase project status
- Firewall/proxy settings`);
    }

    return false;
  }
};

// Show CORS error with user-friendly message
const showCorsError = () => {
  const message = `🔧 Supabase Connection Issue

Please configure CORS in your Supabase project:

1. Go to https://supabase.com/dashboard
2. Select your project  
3. Navigate to Settings → API → CORS
4. Add these URLs to allowed origins:
   • ${window.location.origin}
   • http://localhost:5000
   • https://localhost:5000
   • http://localhost:5173
   • https://localhost:5173
5. Save and wait 1-2 minutes
6. Reload this page

The app will use offline mode until connected.`;

  console.error(message);
  
  // Show toast notification if available
  if (typeof toast !== 'undefined') {
    toast.error("Supabase connection failed. Check console for CORS setup instructions.", {
      position: "top-right",
      autoClose: 10000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }
};

// Export connection status checker
export const getConnectionStatus = () => connectionStatus;

// Reset CORS error flag (useful for retry scenarios)
export const resetCorsErrorFlag = () => {
  corsErrorShown = false;
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

