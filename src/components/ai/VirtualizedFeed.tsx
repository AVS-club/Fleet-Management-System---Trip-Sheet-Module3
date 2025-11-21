/**
 * Virtualized Feed Component
 * Efficiently renders large lists of feed items using virtual scrolling
 */

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useVirtualScroll } from '@/hooks/useProcessedEvents';
import { Loader2, ChevronDown } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VirtualizedFeed');

interface VirtualizedFeedProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight?: number | ((index: number) => number);
  buffer?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * Memoized feed item wrapper for better performance
 */
const FeedItem = memo(({ 
  item, 
  index, 
  renderItem, 
  style 
}: {
  item: any;
  index: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  style: React.CSSProperties;
}) => {
  return (
    <div style={style} className="feed-item">
      {renderItem(item, index)}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.index === nextProps.index &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  );
});

FeedItem.displayName = 'FeedItem';

const VirtualizedFeed: React.FC<VirtualizedFeedProps> = ({
  items,
  renderItem,
  itemHeight = 150,
  buffer = 5,
  onLoadMore,
  hasMore = false,
  loading = false,
  emptyMessage = 'No items to display',
  className = '',
  containerClassName = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [dynamicHeights, setDynamicHeights] = useState<Map<number, number>>(new Map());
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Calculate item height
  const getItemHeight = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    return dynamicHeights.get(index) || itemHeight;
  }, [itemHeight, dynamicHeights]);

  // Calculate total height
  const totalHeight = React.useMemo(() => {
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [items.length, getItemHeight]);

  // Use virtual scroll hook
  const { scrollTop, visibleRange } = useVirtualScroll(
    containerRef,
    typeof itemHeight === 'number' ? itemHeight : 150,
    buffer
  );

  // Calculate visible items and their positions
  const visibleItems = React.useMemo(() => {
    const result: Array<{ item: any; index: number; top: number; height: number }> = [];
    let accumulatedHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      
      if (i >= visibleRange.start && i <= visibleRange.end) {
        result.push({
          item: items[i],
          index: i,
          top: accumulatedHeight,
          height
        });
      }
      
      accumulatedHeight += height;
      
      // Early exit if we've passed the visible range
      if (i > visibleRange.end) break;
    }

    return result;
  }, [items, visibleRange, getItemHeight]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          logger.debug('Loading more items...');
          
          // Call load more with error handling
          Promise.resolve(onLoadMore()).finally(() => {
            setIsLoadingMore(false);
          });
        }
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, hasMore, loading, isLoadingMore]);

  // Measure item heights dynamically if needed
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    const measuredHeight = element.getBoundingClientRect().height;
    setDynamicHeights(prev => {
      const next = new Map(prev);
      if (next.get(index) !== measuredHeight) {
        next.set(index, measuredHeight);
        return next;
      }
      return prev;
    });
  }, []);

  // Handle scroll to top
  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Render loading state
  if (loading && items.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading feed items...</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!loading && items.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${containerClassName}`}>
      {/* Scroll to top button */}
      {scrollTop > 500 && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 z-30 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-3 shadow-lg transition-all transform hover:scale-110"
          aria-label="Scroll to top"
        >
          <ChevronDown className="h-5 w-5 rotate-180" />
        </button>
      )}

      {/* Virtual scroll container */}
      <div
        ref={containerRef}
        className={`overflow-y-auto ${className}`}
        style={{
          height: '100%',
          position: 'relative'
        }}
      >
        {/* Virtual spacer to maintain scroll position */}
        <div 
          style={{ 
            height: totalHeight,
            position: 'relative'
          }}
        >
          {/* Render visible items */}
          {visibleItems.map(({ item, index, top, height }) => (
            <FeedItem
              key={item.id || `item-${index}`}
              item={item}
              index={index}
              renderItem={renderItem}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height,
                willChange: 'transform'
              }}
            />
          ))}
        </div>

        {/* Load more trigger */}
        {hasMore && (
          <div 
            ref={loadMoreRef}
            className="py-8 text-center"
          >
            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Loading more items...
                </span>
              </div>
            ) : (
              <button
                onClick={() => onLoadMore?.()}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              >
                Load More
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(VirtualizedFeed);

/**
 * Utility component for measuring dynamic item heights
 */
export const MeasuredItem: React.FC<{
  index: number;
  onMeasure: (index: number, height: number) => void;
  children: React.ReactNode;
}> = memo(({ index, onMeasure, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const height = ref.current.getBoundingClientRect().height;
      onMeasure(index, height);
    }
  }, [index, onMeasure, children]);

  return <div ref={ref}>{children}</div>;
});

MeasuredItem.displayName = 'MeasuredItem';
