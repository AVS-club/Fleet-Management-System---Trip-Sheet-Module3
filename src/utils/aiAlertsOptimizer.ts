/**
 * AI Alerts Optimizer Service
 * Centralizes data fetching, caching, and processing for improved performance
 */

import { AIAlert, Vehicle, Driver, Trip } from '@/types';
import { createLogger } from './logger';

const logger = createLogger('aiAlertsOptimizer');

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 50; // Process events in batches
const VIRTUAL_SCROLL_BUFFER = 10; // Items to render outside viewport

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxAge: number;

  constructor(maxAge: number = CACHE_DURATION) {
    this.maxAge = maxAge;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// Global caches for different data types
const eventCache = new DataCache<any[]>();
const processedEventCache = new DataCache<any[]>();
const filterResultCache = new DataCache<any[]>();

/**
 * Batch process events to prevent UI blocking
 */
export async function batchProcessEvents<T>(
  items: T[],
  processor: (batch: T[]) => Promise<any> | any,
  batchSize: number = BATCH_SIZE
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Yield to main thread between batches
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const batchResult = await processor(batch);
    results.push(...(Array.isArray(batchResult) ? batchResult : [batchResult]));
  }
  
  return results;
}

/**
 * Debounced filter function to prevent excessive recalculations
 */
export function createDebouncedFilter<T>(
  filterFn: (items: T[], filters: any) => T[],
  delay: number = 300
): (items: T[], filters: any) => Promise<T[]> {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastResult: T[] = [];

  return (items: T[], filters: any): Promise<T[]> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Return cached result immediately for UI responsiveness
      if (lastResult.length > 0) {
        resolve(lastResult);
      }

      timeoutId = setTimeout(async () => {
        const cacheKey = JSON.stringify({ items: items.length, filters });
        const cached = filterResultCache.get(cacheKey);
        
        if (cached) {
          lastResult = cached;
          resolve(cached);
          return;
        }

        const result = await batchProcessEvents(
          [items],
          (batch) => filterFn(batch[0], filters),
          1
        );
        
        lastResult = result[0] || [];
        filterResultCache.set(cacheKey, lastResult);
        resolve(lastResult);
      }, delay);
    });
  };
}

/**
 * Optimize event enrichment with caching
 */
export function enrichEventsWithCache(
  events: any[],
  trips: Trip[],
  vehicles: Vehicle[],
  drivers: Driver[],
  maintenanceTasks: any[]
): any[] {
  const cacheKey = `enrich_${events.length}_${trips.length}_${vehicles.length}`;
  const cached = processedEventCache.get(cacheKey);
  
  if (cached) {
    logger.debug('Returning cached enriched events');
    return cached;
  }

  // Create lookup maps for O(1) access
  const tripMap = new Map(trips.map(t => [t.id, t]));
  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
  const driverMap = new Map(drivers.map(d => [d.id, d]));
  const maintenanceMap = new Map(maintenanceTasks.map(m => [m.id, m]));

  const enriched = events.map(event => {
    try {
      // Skip if already enriched
      if (event._enriched) return event;

      let enrichedEvent = { ...event, _enriched: true };

      // Enrich based on event type
      switch (event.kind) {
        case 'trip':
          const tripId = event.entity_json?.id || event.entity_json?.trip_id;
          if (tripId && tripMap.has(tripId)) {
            enrichedEvent.entity_json = tripMap.get(tripId);
          }
          break;
          
        case 'maintenance':
          const taskId = event.entity_json?.id || event.entity_json?.task_id;
          if (taskId && maintenanceMap.has(taskId)) {
            enrichedEvent.entity_json = maintenanceMap.get(taskId);
          }
          break;
          
        case 'vehicle_doc':
          const vehicleId = event.entity_json?.vehicle_id;
          if (vehicleId && vehicleMap.has(vehicleId)) {
            enrichedEvent.vehicle_data = vehicleMap.get(vehicleId);
          }
          break;
      }

      return enrichedEvent;
    } catch (error) {
      logger.error('Error enriching event:', error);
      return event;
    }
  });

  processedEventCache.set(cacheKey, enriched);
  return enriched;
}

/**
 * Efficient event filtering with indexing
 */
export function createEventFilter(filters: any) {
  return (events: any[]): any[] => {
    if (!events || events.length === 0) return [];

    let filtered = [...events];

    // Apply filters sequentially for better performance
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(event => event.kind === filters.type);
    }

    if (filters.severity && filters.severity !== 'all') {
      filtered = filtered.filter(event => event.priority === filters.severity);
    }

    if (filters.vehicle && filters.vehicle !== 'all') {
      filtered = filtered.filter(event => 
        event.entity_json?.vehicle_id === filters.vehicle ||
        event.vehicle_id === filters.vehicle
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(event => event.status === filters.status);
    }

    return filtered;
  };
}

/**
 * Paginate events for virtual scrolling
 */
export function paginateEvents(
  events: any[],
  page: number,
  pageSize: number = BATCH_SIZE
): { items: any[]; hasMore: boolean; totalPages: number } {
  const start = page * pageSize;
  const end = start + pageSize;
  const items = events.slice(start, end);
  
  return {
    items,
    hasMore: end < events.length,
    totalPages: Math.ceil(events.length / pageSize)
  };
}

/**
 * Calculate virtual scroll indices
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  buffer: number = VIRTUAL_SCROLL_BUFFER
): { startIndex: number; endIndex: number } {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  const startIndex = Math.max(0, visibleStart - buffer);
  const endIndex = Math.min(totalItems - 1, visibleEnd + buffer);
  
  return { startIndex, endIndex };
}

/**
 * Memory-efficient event sorting
 */
export function sortEventsEfficiently(
  events: any[],
  sortField: string = 'event_time',
  sortOrder: 'asc' | 'desc' = 'desc'
): any[] {
  // Use native sort for better performance
  const sorted = [...events].sort((a, b) => {
    const aValue = a[sortField] || a.entity_json?.[sortField];
    const bValue = b[sortField] || b.entity_json?.[sortField];
    
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    let comparison = 0;
    
    if (typeof aValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (aValue instanceof Date || !isNaN(Date.parse(aValue))) {
      comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
    } else {
      comparison = aValue - bValue;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

/**
 * Group events by date for better UI organization
 */
export function groupEventsByDate(events: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  events.forEach(event => {
    const date = new Date(event.event_time);
    const dateKey = date.toLocaleDateString();
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    
    groups.get(dateKey)?.push(event);
  });
  
  return groups;
}

/**
 * Cleanup function to prevent memory leaks
 * ONLY clears AI Alerts specific caches, does not affect UI assets or other caches
 */
export function cleanupOptimizer(): void {
  // Only clear AI Alerts specific caches
  eventCache.clear();
  processedEventCache.clear();
  filterResultCache.clear();
  logger.debug('AI Alerts optimizer caches cleared (data caches only)');
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measures = new Map<string, number[]>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      logger.warn(`No start mark found for ${startMark}`);
      return 0;
    }

    const duration = performance.now() - start;
    
    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }
    
    this.measures.get(name)?.push(duration);
    
    // Keep only last 100 measurements
    const measurements = this.measures.get(name);
    if (measurements && measurements.length > 100) {
      measurements.shift();
    }
    
    return duration;
  }

  getAverageMeasure(name: string): number {
    const measurements = this.measures.get(name);
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((a, b) => a + b, 0);
    return sum / measurements.length;
  }

  logPerformance(): void {
    logger.debug('Performance Summary:');
    this.measures.forEach((measurements, name) => {
      const avg = this.getAverageMeasure(name);
      logger.debug(`  ${name}: ${avg.toFixed(2)}ms (${measurements.length} samples)`);
    });
  }

  reset(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Export cache instances for external use if needed
export { eventCache, processedEventCache, filterResultCache };
