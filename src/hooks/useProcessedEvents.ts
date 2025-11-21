/**
 * Custom hook for processing and managing AI Alerts events
 * Extracts complex logic from main component for better performance
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { 
  enrichEventsWithCache,
  createEventFilter,
  sortEventsEfficiently,
  paginateEvents,
  createDebouncedFilter,
  performanceMonitor,
  batchProcessEvents
} from '@/utils/aiAlertsOptimizer';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useProcessedEvents');

interface UseProcessedEventsOptions {
  heroFeedData?: any[];
  kpiCards?: any[];
  alerts?: any[];
  trips?: any[];
  vehicles?: any[];
  drivers?: any[];
  maintenanceTasks?: any[];
  selectedFilters?: string[];
  showFutureEvents?: boolean;
  pageSize?: number;
}

interface ProcessedEventsResult {
  events: any[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  setFilters: (filters: any) => void;
  isProcessing: boolean;
}

export function useProcessedEvents(options: UseProcessedEventsOptions): ProcessedEventsResult {
  const {
    heroFeedData = [],
    kpiCards = [],
    alerts = [],
    trips = [],
    vehicles = [],
    drivers = [],
    maintenanceTasks = [],
    selectedFilters = ['all'],
    showFutureEvents = false,
    pageSize = 50
  } = options;

  // State management
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedEvents, setProcessedEvents] = useState<any[]>([]);
  const [displayedEvents, setDisplayedEvents] = useState<any[]>([]);
  
  // Refs for optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create debounced filter function
  const debouncedFilter = useMemo(
    () => createDebouncedFilter(createEventFilter, 300),
    []
  );

  // Process and enrich events
  const processEvents = useCallback(async () => {
    performanceMonitor.mark('process-start');
    setIsProcessing(true);
    setError(null);

    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Enrich hero feed events
      const enrichedFeed = await batchProcessEvents(
        heroFeedData,
        (batch) => enrichEventsWithCache(batch, trips, vehicles, drivers, maintenanceTasks),
        100
      );

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Step 2: Merge different event sources
      let allEvents = [...enrichedFeed];

      // Add alerts if selected
      if (selectedFilters.includes('ai_alert') || selectedFilters.includes('all')) {
        const alertEvents = alerts.map(alert => ({
          id: alert.id,
          kind: 'ai_alert' as const,
          event_time: alert.created_at,
          priority: alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warn' : 'info',
          title: alert.title,
          description: alert.description,
          entity_json: alert,
          status: alert.status,
          metadata: alert.metadata || {},
          _source: 'alert'
        }));
        allEvents = [...allEvents, ...alertEvents];
      }

      // Add KPI cards if selected
      if (selectedFilters.includes('kpi') || selectedFilters.includes('all')) {
        const kpiEvents = kpiCards.map(kpi => ({
          id: kpi.id,
          kind: 'kpi' as const,
          event_time: kpi.computed_at,
          priority: 'info' as const,
          title: kpi.kpi_title,
          description: `${kpi.kpi_value_human} - ${kpi.kpi_payload.period || ''}`,
          entity_json: kpi.kpi_payload,
          status: 'active' as const,
          metadata: { theme: kpi.theme },
          kpi_data: kpi,
          _source: 'kpi'
        }));
        allEvents = [...allEvents, ...kpiEvents];
      }

      // Step 3: Filter future events if needed
      if (!showFutureEvents) {
        const now = new Date();
        allEvents = allEvents.filter(event => {
          const eventTime = new Date(event.event_time);
          
          // Special handling for documents
          if (event.kind === 'vehicle_doc') {
            if (eventTime > now) return false;
            
            const expiryDate = event.entity_json?.expiry_date ? new Date(event.entity_json.expiry_date) : null;
            if (expiryDate) {
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry > 90) return false; // Hide documents expiring in > 90 days
            }
          }
          
          return eventTime <= now || event.kind === 'kpi'; // Always show KPIs
        });
      }

      // Step 4: Apply user filters
      const filteredEvents = await debouncedFilter(allEvents, filters);

      // Step 5: Sort events
      const sortedEvents = sortEventsEfficiently(filteredEvents, 'event_time', 'desc');

      // Update processed events
      setProcessedEvents(sortedEvents);
      
      // Measure performance
      const duration = performanceMonitor.measure('process-events', 'process-start');
      logger.debug(`Events processed in ${duration.toFixed(2)}ms`);

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        logger.error('Error processing events:', err);
        setError(err);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    heroFeedData,
    kpiCards,
    alerts,
    trips,
    vehicles,
    drivers,
    maintenanceTasks,
    selectedFilters,
    showFutureEvents,
    filters,
    debouncedFilter
  ]);

  // Process events when dependencies change
  useEffect(() => {
    // Debounce processing to prevent excessive recalculations
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      processEvents();
    }, 100);

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [processEvents]);

  // Update displayed events based on pagination
  useEffect(() => {
    const paginated = paginateEvents(processedEvents, 0, pageSize * (currentPage + 1));
    setDisplayedEvents(paginated.items);
  }, [processedEvents, currentPage, pageSize]);

  // Load more function
  const loadMore = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  // Refresh function
  const refresh = useCallback(() => {
    setCurrentPage(0);
    setProcessedEvents([]);
    setDisplayedEvents([]);
    processEvents();
  }, [processEvents]);

  // Has more calculation
  const hasMore = useMemo(() => {
    return displayedEvents.length < processedEvents.length;
  }, [displayedEvents.length, processedEvents.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    events: displayedEvents,
    loading: isProcessing && displayedEvents.length === 0,
    error,
    totalCount: processedEvents.length,
    currentPage,
    hasMore,
    loadMore,
    refresh,
    setFilters,
    isProcessing
  };
}

/**
 * Hook for managing AI Alerts filters with debouncing
 */
export function useAIAlertsFilters(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setDebouncedFilters(initialFilters);
  }, [initialFilters]);

  // Debounce filter changes
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [filters]);

  return {
    filters,
    debouncedFilters,
    updateFilter,
    resetFilters
  };
}

/**
 * Hook for managing virtualized scroll state
 */
export function useVirtualScroll(
  containerRef: React.RefObject<HTMLElement>,
  itemHeight: number,
  buffer: number = 10
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: buffer });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const newScrollTop = container.scrollTop;
      setScrollTop(newScrollTop);

      const containerHeight = container.clientHeight;
      const start = Math.floor(newScrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = start + visibleCount + buffer;

      setVisibleRange({ start: Math.max(0, start - buffer), end });
    };

    // Initial calculation
    handleScroll();

    // Add scroll listener with passive flag for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, itemHeight, buffer]);

  return {
    scrollTop,
    visibleRange
  };
}
