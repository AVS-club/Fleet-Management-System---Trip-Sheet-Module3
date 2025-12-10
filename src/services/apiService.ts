/**
 * Centralized API Service
 * Handles all external API calls with retry logic, caching, and error recovery
 */

import { getApiConfig, getApiHeaders } from '../config/apiConfig';
import { 
  validateApiResponse, 
  ApiResponseWrapper,
  DriverApiResponseSchema,
  VehicleApiResponseSchema,
  ChallanApiResponseSchema,
  DriverApiResponse,
  VehicleApiResponse,
  ChallanApiResponse,
} from './apiValidation';
import { 
  generateCacheKey, 
  getCacheEntry, 
  setCacheEntry, 
  clearCacheEntry 
} from './apiCache';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  useCache?: boolean;
  cacheDuration?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp?: number;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Generic API call with retry logic
 */
async function callApiWithRetry<T>(
  url: string,
  options: ApiRequestOptions,
  validator?: (data: unknown) => { success: boolean; data?: T; error?: string }
): Promise<ApiResponse<T>> {
  const config = getApiConfig();
  const maxRetries = options.retryCount ?? config.driver.retryCount;
  const timeout = options.timeout ?? config.driver.timeout;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add delay before retry (exponential backoff)
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await sleep(delay);
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
      }
      
      const headers = {
        ...getApiHeaders(),
        ...options.headers,
      };
      
      const fetchOptions: RequestInit = {
        method: options.method || 'POST',
        headers,
      };
      
      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }
      
      const response = await fetchWithTimeout(url, fetchOptions, timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Validate response if validator provided
      if (validator) {
        const validation = validator(result.data || result);
        if (!validation.success) {
          console.warn('API response validation failed:', validation.error);
          // Continue with unvalidated data but log warning
        }
      }
      
      return {
        success: true,
        data: result.data || result,
        timestamp: Date.now(),
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`API call attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          // Authentication errors shouldn't be retried
          break;
        }
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'API call failed after all retries',
  };
}

/**
 * Make API call with caching support
 */
async function makeApiCall<T>(
  endpoint: string,
  params: Record<string, any>,
  options: ApiRequestOptions = {},
  validator?: (data: unknown) => { success: boolean; data?: T; error?: string }
): Promise<ApiResponse<T>> {
  const config = getApiConfig();
  const useCache = options.useCache ?? config.cache.enabled;
  
  // Check cache first
  if (useCache) {
    const cacheKey = generateCacheKey(endpoint, params);
    const cached = getCacheEntry<T>(cacheKey);
    
    if (cached) {
      console.log('Cache hit for:', endpoint);
      return {
        success: true,
        data: cached,
        cached: true,
        timestamp: Date.now(),
      };
    }
  }
  
  // Make API call
  const result = await callApiWithRetry<T>(endpoint, options, validator);
  
  // Cache successful responses
  if (result.success && result.data && useCache) {
    const cacheKey = generateCacheKey(endpoint, params);
    setCacheEntry(cacheKey, result.data, options.cacheDuration);
  }
  
  return result;
}

/**
 * Fetch driver details from DL API
 */
export async function fetchDriverDetails(
  licenseNumber: string,
  dob: string,
  options: Partial<ApiRequestOptions> = {}
): Promise<ApiResponse<DriverApiResponse>> {
  const config = getApiConfig();
  
  console.log('Fetching driver details:', { licenseNumber, dob });
  
  return makeApiCall<DriverApiResponse>(
    config.driver.url,
    { dl_no: licenseNumber, dob },
    {
      method: 'POST',
      body: { dl_no: licenseNumber, dob },
      useCache: true,
      ...options,
    },
    (data) => validateApiResponse(data, DriverApiResponseSchema)
  );
}

/**
 * Fetch vehicle details from RC API
 */
export async function fetchVehicleDetails(
  registrationNumber: string,
  options: Partial<ApiRequestOptions> = {}
): Promise<ApiResponse<VehicleApiResponse>> {
  const config = getApiConfig();
  
  console.log('Fetching vehicle details:', { registrationNumber });
  
  return makeApiCall<VehicleApiResponse>(
    config.vehicle.url,
    { registration_number: registrationNumber },
    {
      method: 'POST',
      body: { registration_number: registrationNumber },
      useCache: true,
      ...options,
    },
    (data) => validateApiResponse(data, VehicleApiResponseSchema)
  );
}

/**
 * Fetch challan information
 */
export async function fetchChallanInfo(
  vehicleId: string,
  chassis: string,
  engineNo: string,
  options: Partial<ApiRequestOptions> = {}
): Promise<ApiResponse<ChallanApiResponse>> {
  const config = getApiConfig();
  
  console.log('Fetching challan info:', { vehicleId, chassis, engineNo });
  
  return makeApiCall<ChallanApiResponse>(
    config.challan.url,
    { vehicleId, chassis, engine_no: engineNo },
    {
      method: 'POST',
      body: { vehicleId, chassis, engine_no: engineNo },
      useCache: true,
      cacheDuration: 3600000, // 1 hour for challan data
      ...options,
    },
    (data) => validateApiResponse(data, ChallanApiResponseSchema)
  );
}

/**
 * Clear cache for specific API call
 */
export function clearApiCache(endpoint: string, params: Record<string, any>): void {
  const cacheKey = generateCacheKey(endpoint, params);
  clearCacheEntry(cacheKey);
}

/**
 * Force refresh (bypass cache)
 */
export async function forceRefreshDriverDetails(
  licenseNumber: string,
  dob: string
): Promise<ApiResponse<DriverApiResponse>> {
  const config = getApiConfig();
  clearApiCache(config.driver.url, { dl_no: licenseNumber, dob });
  return fetchDriverDetails(licenseNumber, dob, { useCache: false });
}

export async function forceRefreshVehicleDetails(
  registrationNumber: string
): Promise<ApiResponse<VehicleApiResponse>> {
  const config = getApiConfig();
  clearApiCache(config.vehicle.url, { registration_number: registrationNumber });
  return fetchVehicleDetails(registrationNumber, { useCache: false });
}

