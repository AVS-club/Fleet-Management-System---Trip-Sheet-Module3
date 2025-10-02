interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly STORAGE_PREFIX = 'fleet_cache_';

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    // Store in memory
    this.cache.set(key, entry);
    
    // Store in sessionStorage for persistence
    try {
      sessionStorage.setItem(
        `${this.STORAGE_PREFIX}${key}`, 
        JSON.stringify(entry)
      );
    } catch (error) {
      console.warn('Failed to store cache in sessionStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    // Try memory first
    let entry = this.cache.get(key);
    
    // If not in memory, try sessionStorage
    if (!entry) {
      try {
        const stored = sessionStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
        if (stored) {
          entry = JSON.parse(stored);
          // Restore to memory
          this.cache.set(key, entry);
        }
      } catch (error) {
        console.warn('Failed to retrieve cache from sessionStorage:', error);
      }
    }

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
    // Clear sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear sessionStorage cache:', error);
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
    try {
      sessionStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to delete cache from sessionStorage:', error);
    }
  }
}

export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  VEHICLES: 'vehicles',
  DRIVERS: 'drivers',
  TRIPS: 'trips',
  VEHICLE_STATS: 'vehicle_stats',
} as const;
