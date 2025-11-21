/**
 * Custom hook for debounced search functionality
 * Improves performance by reducing unnecessary re-renders and searches
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDebouncedSearchOptions {
  minLength?: number;
  delay?: number;
  onSearch?: (value: string) => void;
}

export function useDebouncedSearch(
  initialValue: string = '',
  options: UseDebouncedSearchOptions = {}
) {
  const {
    minLength = 1, // Reduced from 4 to 1 character minimum
    delay = 300, // 300ms delay
    onSearch
  } = options;

  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounce the search value
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if below minimum length (unless it's empty for clearing)
    if (searchQuery.length > 0 && searchQuery.length < minLength) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedValue(searchQuery);
      setIsSearching(false);
      
      // Call onSearch callback if provided
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, delay);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, minLength, delay, onSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedValue('');
    setIsSearching(false);
    
    if (onSearch) {
      onSearch('');
    }
  }, [onSearch]);

  const forceSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setDebouncedValue(searchQuery);
    setIsSearching(false);
    
    if (onSearch) {
      onSearch(searchQuery);
    }
  }, [searchQuery, onSearch]);

  return {
    searchQuery,
    debouncedValue,
    isSearching,
    handleSearchChange,
    clearSearch,
    forceSearch
  };
}

export default useDebouncedSearch;
