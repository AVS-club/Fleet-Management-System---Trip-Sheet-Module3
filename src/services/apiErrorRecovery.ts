/**
 * API Error Recovery Service
 * Implements graceful degradation strategies when APIs fail
 */

import { toast } from 'react-hot-toast';
import { getCacheEntry } from './apiCache';
import { getApiConfig } from '../config/apiConfig';
import type { ApiResponse } from './apiService';

export type FallbackStrategy = 'cache' | 'manual' | 'error';

export interface RecoveryOptions {
  fallbackStrategy?: FallbackStrategy;
  showUserMessage?: boolean;
  cacheKey?: string;
}

/**
 * Handle API error with graceful degradation
 */
export async function handleApiError<T>(
  error: Error | string,
  options: RecoveryOptions = {}
): Promise<ApiResponse<T>> {
  const config = getApiConfig();
  const strategy = options.fallbackStrategy || config.driver.fallbackMode;
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  console.error('API Error:', errorMessage);
  
  // Try to recover based on strategy
  switch (strategy) {
    case 'cache':
      return await recoverFromCache<T>(errorMessage, options);
      
    case 'manual':
      return await recoverWithManualEntry<T>(errorMessage, options);
      
    case 'error':
    default:
      return failWithError<T>(errorMessage, options);
  }
}

/**
 * Attempt to recover from cached data
 */
async function recoverFromCache<T>(
  error: string,
  options: RecoveryOptions
): Promise<ApiResponse<T>> {
  if (!options.cacheKey) {
    return failWithError<T>('No cache key provided for recovery', options);
  }
  
  const cached = getCacheEntry<T>(options.cacheKey);
  
  if (cached) {
    if (options.showUserMessage !== false) {
      toast.success('Using cached data due to API unavailability', {
        duration: 4000,
        icon: '💾',
      });
    }
    
    console.log('Recovered from cache:', options.cacheKey);
    
    return {
      success: true,
      data: cached,
      cached: true,
      timestamp: Date.now(),
    };
  }
  
  // No cache available, try manual entry
  return recoverWithManualEntry<T>(error, options);
}

/**
 * Allow manual data entry as fallback
 */
async function recoverWithManualEntry<T>(
  error: string,
  options: RecoveryOptions
): Promise<ApiResponse<T>> {
  if (options.showUserMessage !== false) {
    toast.error('API unavailable. Please enter data manually.', {
      duration: 6000,
      icon: '✏️',
    });
  }
  
  console.log('Falling back to manual entry');
  
  return {
    success: false,
    error: `${error} - Manual entry required`,
  };
}

/**
 * Fail with error message
 */
function failWithError<T>(error: string, options: RecoveryOptions): ApiResponse<T> {
  if (options.showUserMessage !== false) {
    toast.error(`API Error: ${error}`, {
      duration: 5000,
    });
  }
  
  return {
    success: false,
    error,
  };
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Network errors are recoverable
  if (errorMessage.includes('NetworkError') || 
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('timeout')) {
    return true;
  }
  
  // 5xx server errors are recoverable
  if (errorMessage.includes('500') || 
      errorMessage.includes('502') || 
      errorMessage.includes('503') ||
      errorMessage.includes('504')) {
    return true;
  }
  
  // Authentication errors are not recoverable
  if (errorMessage.includes('401') || errorMessage.includes('403')) {
    return false;
  }
  
  return true;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (errorMessage.includes('timeout')) {
    return 'Request timed out. The server is taking too long to respond.';
  }
  
  if (errorMessage.includes('500')) {
    return 'Server error. The external API is experiencing issues. Please try again later.';
  }
  
  if (errorMessage.includes('502') || errorMessage.includes('503')) {
    return 'Service temporarily unavailable. Please try again in a few minutes.';
  }
  
  if (errorMessage.includes('401')) {
    return 'Authentication failed. Please check your API credentials.';
  }
  
  if (errorMessage.includes('403')) {
    return 'Access denied. You do not have permission to access this resource.';
  }
  
  if (errorMessage.includes('400')) {
    return 'Invalid request. Please check the input data and try again.';
  }
  
  return errorMessage || 'An unexpected error occurred. Please try again.';
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-recoverable errors
      if (!isRecoverableError(error as Error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // Add jitter
      const totalDelay = Math.min(delay + jitter, 10000); // Max 10 seconds
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${totalDelay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError || new Error('Operation failed after all retries');
}

/**
 * Circuit breaker pattern for API calls
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 60 seconds
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        console.log('Circuit breaker: half-open, attempting request');
      } else {
        throw new Error('Circuit breaker is open. Service temporarily unavailable.');
      }
    }
    
    try {
      const result = await operation();
      
      // Success - reset or close circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        console.log('Circuit breaker: closed');
      }
      
      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        console.error('Circuit breaker: opened due to repeated failures');
      }
      
      throw error;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
  
  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

// Global circuit breakers for each API
export const driverApiCircuitBreaker = new CircuitBreaker();
export const vehicleApiCircuitBreaker = new CircuitBreaker();
export const challanApiCircuitBreaker = new CircuitBreaker();

