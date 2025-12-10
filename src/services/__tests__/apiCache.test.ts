/**
 * Unit tests for API cache service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCacheKey,
  setCacheEntry,
  getCacheEntry,
  clearCacheEntry,
  clearAllCache,
  getCacheStats,
  cleanupExpiredCache,
} from '../apiCache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Cache Key Generation', () => {
  it('should generate consistent cache keys', () => {
    const key1 = generateCacheKey('api/driver', { license: 'DL123', dob: '1992-03-02' });
    const key2 = generateCacheKey('api/driver', { license: 'DL123', dob: '1992-03-02' });
    
    expect(key1).toBe(key2);
  });
  
  it('should generate different keys for different parameters', () => {
    const key1 = generateCacheKey('api/driver', { license: 'DL123' });
    const key2 = generateCacheKey('api/driver', { license: 'DL456' });
    
    expect(key1).not.toBe(key2);
  });
  
  it('should generate keys independent of parameter order', () => {
    const key1 = generateCacheKey('api/driver', { a: '1', b: '2' });
    const key2 = generateCacheKey('api/driver', { b: '2', a: '1' });
    
    expect(key1).toBe(key2);
  });
});

describe('Cache Operations', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });
  
  it('should set and get cache entries', () => {
    const key = 'test_key';
    const data = { name: 'John Doe', license: 'DL123' };
    
    setCacheEntry(key, data);
    const retrieved = getCacheEntry<typeof data>(key);
    
    expect(retrieved).toEqual(data);
  });
  
  it('should return null for non-existent entries', () => {
    const retrieved = getCacheEntry('non_existent_key');
    expect(retrieved).toBeNull();
  });
  
  it('should clear specific cache entries', () => {
    const key = 'test_key';
    const data = { name: 'John Doe' };
    
    setCacheEntry(key, data);
    expect(getCacheEntry(key)).toEqual(data);
    
    clearCacheEntry(key);
    expect(getCacheEntry(key)).toBeNull();
  });
  
  it('should expire old cache entries', async () => {
    const key = 'test_key';
    const data = { name: 'John Doe' };
    
    // Set cache with very short duration (1ms)
    setCacheEntry(key, data, 1);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const retrieved = getCacheEntry(key);
    expect(retrieved).toBeNull();
  });
  
  it('should clear all cache entries', () => {
    setCacheEntry('api_cache_key1', { data: 'test1' });
    setCacheEntry('api_cache_key2', { data: 'test2' });
    localStorage.setItem('other_key', 'should not be cleared');
    
    clearAllCache();
    
    expect(getCacheEntry('api_cache_key1')).toBeNull();
    expect(getCacheEntry('api_cache_key2')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('should not be cleared');
  });
});

describe('Cache Statistics', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });
  
  it('should return cache statistics', () => {
    setCacheEntry('api_cache_test1', { data: 'test1' });
    setCacheEntry('api_cache_test2', { data: 'test2' });
    
    const stats = getCacheStats();
    
    expect(stats.totalEntries).toBe(2);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.entries).toHaveLength(2);
  });
  
  it('should clean up expired entries', async () => {
    // Add entry with short expiration
    setCacheEntry('api_cache_expired', { data: 'test' }, 1);
    
    // Add entry with long expiration
    setCacheEntry('api_cache_valid', { data: 'test' }, 10000);
    
    // Wait for first entry to expire
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const cleaned = cleanupExpiredCache();
    
    expect(cleaned).toBe(1);
    expect(getCacheEntry('api_cache_expired')).toBeNull();
    expect(getCacheEntry('api_cache_valid')).not.toBeNull();
  });
});

