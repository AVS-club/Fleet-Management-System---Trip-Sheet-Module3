import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  threshold?: number
}

/**
 * Custom hook for implementing infinite scroll functionality
 * Uses Intersection Observer API for efficient scroll detection
 */
export function useInfiniteScroll({
  loading,
  hasMore,
  onLoadMore,
  threshold = 100
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver>()
  
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return
    
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore()
      }
    }, {
      rootMargin: `${threshold}px`
    })
    
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, onLoadMore, threshold])
  
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])
  
  return lastElementRef
}
