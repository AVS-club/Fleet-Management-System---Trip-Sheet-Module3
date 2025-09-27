import { useEffect, useState, useCallback, useRef } from 'react';

// Mobile optimization hook for trip management
export const useMobileOptimization = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle viewport height changes (keyboard detection)
  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = viewportHeight - currentHeight;
      
      // If height decreased significantly, keyboard is likely open
      setIsKeyboardOpen(heightDifference > 150);
      setViewportHeight(currentHeight);
    };

    setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [viewportHeight]);

  // Prevent pull-to-refresh on mobile
  useEffect(() => {
    if (!isMobile) return;

    let touchStartYLocal = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartYLocal = e.touches[0]?.clientY ?? 0;
    };

    const preventPullToRefresh = (e: TouchEvent) => {
      const currentY = e.touches[0]?.clientY ?? 0;
      const isPullingDown = currentY > touchStartYLocal;

      if (window.scrollY <= 0 && isPullingDown) {
        e.preventDefault();
      }
    };

    document.body.addEventListener('touchstart', onTouchStart, { passive: true });
    document.body.addEventListener('touchmove', preventPullToRefresh, { passive: false });

    return () => {
    document.body.addEventListener('touchmove', preventPullToRefresh, { passive: false });

    return () => {
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', preventPullToRefresh);
    };
  }, [isMobile]);  // Handle touch events for better UX
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    
    // Detect scroll direction and state
    if (Math.abs(deltaY) > 10) {
      setIsScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set new timeout to detect end of scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    }
  }, [touchStartY]);

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 100);
  }, []);

  // Auto-scroll to focused input
  const scrollToInput = useCallback((inputElement: HTMLElement) => {
    if (!isMobile) return;

    setTimeout(() => {
      inputElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }, 300); // Delay to allow keyboard to open
  }, [isMobile]);

  // Haptic feedback (if supported)
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!isMobile || !('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };

    navigator.vibrate(patterns[type]);
  }, [isMobile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    isMobile,
    isKeyboardOpen,
    isScrolling,
    handleTouchStart,
    handleTouchMove,
    handleScroll,
    scrollToInput,
    triggerHaptic
  };
};

// Hook for mobile auto-complete functionality
export const useMobileAutoComplete = <T>(
  items: T[],
  searchKey: keyof T,
  debounceMs: number = 300
) => {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsLoading(true);
    
    debounceRef.current = setTimeout(() => {
      if (searchQuery.length < 2) {
        setFilteredItems([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      const filtered = items.filter(item => {
        const value = item[searchKey];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return false;
      });

      setFilteredItems(filtered);
      setIsOpen(filtered.length > 0);
      setIsLoading(false);
    }, debounceMs);
  }, [items, searchKey, debounceMs]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    search(value);
  }, [search]);

  const selectItem = useCallback((item: T) => {
    setQuery(String(item[searchKey]));
    setIsOpen(false);
    setFilteredItems([]);
  }, [searchKey]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    query,
    filteredItems,
    isOpen,
    isLoading,
    handleInputChange,
    selectItem,
    closeDropdown
  };
};

// Hook for mobile form validation
export const useMobileFormValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback((name: string, value: any, rules: any) => {
    const error = validateSingleField(value, rules);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    return !error;
  }, []);

  const validateForm = useCallback(async (data: any, validationRules: any) => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};

    try {
      for (const [field, rules] of Object.entries(validationRules)) {
        const value = data[field];
        const error = validateSingleField(value, rules);
        if (error) {
          newErrors[field] = error;
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValidating,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError
  };
};

// Helper function for field validation
const validateSingleField = (value: any, rules: any): string | null => {
  if (rules.required && (!value || value === '')) {
    return 'This field is required';
  }

  if (value && rules.min && value < rules.min) {
    return `Minimum value is ${rules.min}`;
  }

  if (value && rules.max && value > rules.max) {
    return `Maximum value is ${rules.max}`;
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    return `Minimum length is ${rules.minLength}`;
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    return `Maximum length is ${rules.maxLength}`;
  }

  return null;
};

// Hook for mobile performance optimization
export const useMobilePerformance = () => {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Detect low-end device
    const detectLowEndDevice = () => {
      const memory = (navigator as any).deviceMemory || 4;
      const cores = navigator.hardwareConcurrency || 4;
      const isLowEnd = memory <= 2 || cores <= 2;
      setIsLowEndDevice(isLowEnd);
    };

    // Detect connection type
    const detectConnection = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown');
      }
    };

    detectLowEndDevice();
    detectConnection();

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', detectConnection);
      return () => connection.removeEventListener('change', detectConnection);
    }
  }, []);

  // Optimize images for mobile
  const getOptimizedImageUrl = useCallback((url: string, width?: number) => {
    if (!url) return url;
    
    const isLowEnd = isLowEndDevice || connectionType === 'slow-2g' || connectionType === '2g';
    const targetWidth = width || (isLowEnd ? 300 : 600);
    
    // If using a CDN that supports image optimization
    if (url.includes('cloudinary.com') || url.includes('imgix.net')) {
      return `${url}?w=${targetWidth}&q=${isLowEnd ? 60 : 80}`;
    }
    
    return url;
  }, [isLowEndDevice, connectionType]);

  // Lazy load images
  const useLazyLoading = useCallback(() => {
    if (isLowEndDevice) {
      return true; // Always lazy load on low-end devices
    }
    
    return connectionType === 'slow-2g' || connectionType === '2g' || connectionType === '3g';
  }, [isLowEndDevice, connectionType]);

  return {
    isLowEndDevice,
    connectionType,
    getOptimizedImageUrl,
    useLazyLoading
  };
};

// Hook for mobile gestures
export const useMobileGestures = () => {
  const [gestureState, setGestureState] = useState({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isActive: false
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setGestureState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      isActive: true
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureState.isActive) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - gestureState.startX;
    const deltaY = touch.clientY - gestureState.startY;

    setGestureState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY
    }));
  }, [gestureState.isActive, gestureState.startX, gestureState.startY]);

  const handleTouchEnd = useCallback(() => {
    setGestureState(prev => ({
      ...prev,
      isActive: false
    }));
  }, []);

  return {
    gestureState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};
