/**
 * API Response Caching Service
 * Provides localStorage-based caching with encryption for API responses
 */

import { getApiConfig } from '../config/apiConfig';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = 'api_cache_';

/**
 * Simple encryption/obfuscation for cached data
 * Note: This is basic obfuscation, not cryptographic encryption
 */
function encodeData(data: string): string {
  return btoa(encodeURIComponent(data));
}

function decodeData(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return '';
  }
}

/**
 * Generate cache key from endpoint and params
 */
export function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${CACHE_PREFIX}${endpoint}_${sortedParams}`;
}

/**
 * Set cache entry
 */
export function setCacheEntry<T>(key: string, data: T, duration?: number): void {
  const config = getApiConfig();
  const cacheDuration = duration || config.cache.duration;
  
  if (!config.cache.enabled) {
    return;
  }
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + cacheDuration,
  };
  
  try {
    const serialized = JSON.stringify(entry);
    const encoded = encodeData(serialized);
    localStorage.setItem(key, encoded);
  } catch (error) {
    console.error('Failed to cache data:', error);
  }
}

/**
 * Get cache entry
 */
export function getCacheEntry<T>(key: string): T | null {
  const config = getApiConfig();
  
  if (!config.cache.enabled) {
    return null;
  }
  
  try {
    const encoded = localStorage.getItem(key);
    if (!encoded) {
      return null;
    }
    
    const serialized = decodeData(encoded);
    if (!serialized) {
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(serialized);
    
    // Check if cache has expired
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Failed to retrieve cached data:', error);
    return null;
  }
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear cache entry:', error);
  }
}

/**
 * Clear all API cache entries
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  totalSize: number;
  entries: Array<{ key: string; size: number; age: number }>;
} {
  const stats = {
    totalEntries: 0,
    totalSize: 0,
    entries: [] as Array<{ key: string; size: number; age: number }>,
  };
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const value = localStorage.getItem(key) || '';
        const size = value.length;
        
        try {
          const decoded = decodeData(value);
          const entry: CacheEntry<any> = JSON.parse(decoded);
          const age = Date.now() - entry.timestamp;
          
          stats.totalEntries++;
          stats.totalSize += size;
          stats.entries.push({ key, size, age });
        } catch {
          // Invalid entry, skip
        }
      }
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
  }
  
  return stats;
}

/**
 * Clean up expired cache entries
 */
export function cleanupExpiredCache(): number {
  let cleaned = 0;
  
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (!value) return;
        
        try {
          const decoded = decodeData(value);
          const entry: CacheEntry<any> = JSON.parse(decoded);
          
          if (Date.now() > entry.expiresAt) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch {
          // Invalid entry, remove it
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  }
  
  return cleaned;
}

