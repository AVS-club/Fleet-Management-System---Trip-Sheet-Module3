/**
 * Centralized API Configuration
 * Handles all API endpoints and configuration with graceful fallbacks
 */

export interface ApiEndpointConfig {
  url: string;
  timeout: number;
  retryCount: number;
  fallbackMode: 'cache' | 'manual' | 'error';
}

export interface ApiConfig {
  driver: ApiEndpointConfig;
  vehicle: ApiEndpointConfig;
  challan: ApiEndpointConfig;
  supabase: {
    url: string;
    anonKey: string;
  };
  cache: {
    enabled: boolean;
    duration: number; // milliseconds
  };
}

/**
 * Get API configuration with environment variable fallbacks
 */
export function getApiConfig(): ApiConfig {
  const isProduction = window.location.hostname !== 'localhost';
  
  // Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // API timeout and retry configuration
  const apiTimeout = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10);
  const apiRetryCount = parseInt(import.meta.env.VITE_API_RETRY_COUNT || '3', 10);
  
  // Cache configuration
  const cacheEnabled = import.meta.env.VITE_ENABLE_API_CACHE !== 'false';
  const cacheDuration = parseInt(import.meta.env.VITE_CACHE_DURATION || '86400000', 10); // 24 hours
  
  // Fallback mode
  const fallbackMode = (import.meta.env.VITE_API_FALLBACK_MODE || 'cache') as 'cache' | 'manual' | 'error';
  
  return {
    driver: {
      url: import.meta.env.VITE_DL_PROXY_URL || 
        (isProduction
          ? `${supabaseUrl}/functions/v1/fetch-driver-details`
          : 'http://localhost:3001/api/fetch-dl-details'),
      timeout: apiTimeout,
      retryCount: apiRetryCount,
      fallbackMode,
    },
    vehicle: {
      url: import.meta.env.VITE_RC_PROXY_URL || 
        (isProduction
          ? `${supabaseUrl}/functions/v1/fetch-rc-details`
          : 'http://localhost:3001/api/fetch-rc-details'),
      timeout: apiTimeout,
      retryCount: apiRetryCount,
      fallbackMode,
    },
    challan: {
      url: isProduction
        ? `${supabaseUrl}/functions/v1/fetch-challan-info`
        : 'http://localhost:3001/api/fetch-challan-info',
      timeout: apiTimeout,
      retryCount: apiRetryCount,
      fallbackMode,
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    cache: {
      enabled: cacheEnabled,
      duration: cacheDuration,
    },
  };
}

/**
 * Get headers for API requests with proper authorization
 */
export function getApiHeaders(isProduction: boolean = window.location.hostname !== 'localhost'): Record<string, string> {
  const config = getApiConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization for production Edge Functions
  if (isProduction && config.supabase.anonKey) {
    headers['Authorization'] = `Bearer ${config.supabase.anonKey}`;
  }
  
  return headers;
}

/**
 * Validate API configuration on startup
 */
export function validateApiConfig(): { valid: boolean; errors: string[] } {
  const config = getApiConfig();
  const errors: string[] = [];
  
  if (!config.supabase.url) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  
  if (!config.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }
  
  if (!config.driver.url) {
    errors.push('Driver API URL is not configured');
  }
  
  if (!config.vehicle.url) {
    errors.push('Vehicle API URL is not configured');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

