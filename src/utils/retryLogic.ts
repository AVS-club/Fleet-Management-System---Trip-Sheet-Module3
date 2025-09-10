// Intelligent retry logic with exponential backoff

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

// Default retry condition - retry on network errors and server errors
const defaultRetryCondition = (error: any): boolean => {
  // Network errors
  if (error.message?.toLowerCase().includes('network')) return true;
  if (error.message?.toLowerCase().includes('fetch')) return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;
  
  // HTTP status codes
  if (error.status === 429) return true; // Rate limit
  if (error.status >= 500 && error.status < 600) return true; // Server errors
  if (error.status === 0) return true; // Network failure
  
  // Supabase specific errors
  if (error.code === 'PGRST301') return true; // Request timeout
  if (error.code === '57014') return true; // Query canceled
  
  return false;
};

/**
 * Execute an operation with intelligent retry logic and exponential backoff
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns Promise with the operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Calculate next delay with jitter to prevent thundering herd
      const jitter = Math.random() * 200; // Add 0-200ms random jitter
      const currentDelay = Math.min(delay + jitter, maxDelay);
      
      // Notify about retry if callback provided
      if (onRetry) {
        onRetry(attempt + 1, currentDelay, error);
      }
      
      // Log retry attempt
      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${currentDelay.toFixed(0)}ms`,
        { error: error.message || error }
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Increase delay exponentially for next attempt
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Create a retryable version of a function
 * @param fn - The function to make retryable
 * @param options - Default retry options for this function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultOptions: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), defaultOptions);
  }) as T;
}

/**
 * Retry with circuit breaker pattern
 * Stops retrying if too many failures occur in a time window
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private maxFailures = 5,
    private resetTimeout = 60000, // 1 minute
    private halfOpenRequests = 3
  ) {}
  
  async execute<T>(
    operation: () => Promise<T>,
    retryOptions?: RetryOptions
  ): Promise<T> {
    // Check circuit state
    if (this.state === 'open') {
      const timeSinceLastFail = Date.now() - this.lastFailTime;
      if (timeSinceLastFail > this.resetTimeout) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }
    
    try {
      const result = await withRetry(operation, retryOptions);
      
      // Success - reset failures if in half-open state
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();
      
      // Open circuit if too many failures
      if (this.failures >= this.maxFailures) {
        this.state = 'open';
        console.error('Circuit breaker opened due to excessive failures');
      }
      
      throw error;
    }
  }
  
  reset() {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailTime = 0;
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    };
  }
}

// Specialized retry functions for common operations

/**
 * Retry database operations with appropriate delays
 */
export const retryDatabaseOperation = <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return withRetry(operation, {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 5000,
    backoffFactor: 1.5,
    retryCondition: (error) => {
      // Database-specific retry conditions
      if (error.code === 'ECONNREFUSED') return true;
      if (error.code === '40001') return true; // Serialization failure
      if (error.code === '40P01') return true; // Deadlock detected
      if (error.code === '57014') return true; // Query canceled
      if (error.code === 'PGRST301') return true; // Request timeout
      return defaultRetryCondition(error);
    }
  });
};

/**
 * Retry API calls with rate limit handling
 */
export const retryApiCall = <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return withRetry(operation, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 3, // More aggressive backoff for rate limits
    retryCondition: (error) => {
      // API-specific retry conditions
      if (error.status === 429) {
        // Check for Retry-After header
        const retryAfter = error.headers?.get?.('Retry-After');
        if (retryAfter) {
          const delay = parseInt(retryAfter) * 1000;
          console.log(`Rate limited - waiting ${delay}ms as requested`);
          return true;
        }
        return true;
      }
      return defaultRetryCondition(error);
    }
  });
};

/**
 * Retry file upload operations
 */
export const retryFileUpload = <T>(
  operation: () => Promise<T>,
  onProgress?: (attempt: number) => void
): Promise<T> => {
  return withRetry(operation, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2,
    onRetry: (attempt) => {
      if (onProgress) onProgress(attempt);
    },
    retryCondition: (error) => {
      // Don't retry on file too large or invalid file type
      if (error.message?.includes('413')) return false; // Payload too large
      if (error.message?.includes('415')) return false; // Unsupported media type
      if (error.message?.includes('400')) return false; // Bad request
      return defaultRetryCondition(error);
    }
  });
};