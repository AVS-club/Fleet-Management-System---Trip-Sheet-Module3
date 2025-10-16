// Mobile-specific utility functions for trip management

// Detect mobile device
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

// Detect iOS device
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
};

// Detect Android device
export const isAndroidDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent);
};

// Get device pixel ratio
export const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
};

// Check if device supports touch
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get viewport dimensions
export const getViewportDimensions = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

// Check if keyboard is open (iOS specific)
let iosViewportBaseline: number | null = null;

export const isKeyboardOpen = (): boolean => {
  if (typeof window === 'undefined' || !isIOSDevice()) return false;

  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  if (iosViewportBaseline === null) {
    iosViewportBaseline = viewportHeight;
    return false;
  }

  return viewportHeight < iosViewportBaseline * 0.75;
};
// Debounce function for mobile performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Smooth scroll to element
export const smoothScrollTo = (element: HTMLElement, offset: number = 0): void => {
  if (typeof window === 'undefined') return;
  
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
};

// Scroll to input when focused (mobile keyboard handling)
export const scrollToInput = (inputElement: HTMLElement): void => {
  if (!isMobileDevice()) return;
  
  setTimeout(() => {
    const rect = inputElement.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    
    if (!isVisible) {
      smoothScrollTo(inputElement, 100);
    }
  }, 300); // Delay to allow keyboard to open
};

// Prevent zoom on input focus (iOS)
export const preventZoomOnFocus = (): void => {
  if (!isIOSDevice()) return;
  
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const fontSize = window.getComputedStyle(input).fontSize;
    if (parseInt(fontSize) < 16) {
      (input as HTMLElement).style.fontSize = '16px';
    }
  });
};

// Haptic feedback
export const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light'): void => {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  
  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30]
  };
  
  navigator.vibrate(patterns[type]);
};

// Format phone number for mobile display
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

// Format currency for mobile display
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date for mobile display
export const formatDateForMobile = (date: Date | string): string => {
  const d = new Date(date);
  
  // Guard for invalid Date inputs
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  
  // Create start-of-day for both dates (set hours/minutes/seconds/ms to 0)
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Compute difference in days based on calendar midnights
  const diffTime = startOfToday.getTime() - startOfDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7 && diffDays > 0) {
    return `${diffDays} days ago`;
  }
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// Generate mobile-friendly file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate file for mobile upload
export const validateMobileFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only images and PDF files are allowed' };
  }
  
  return { valid: true };
};

// Compress image for mobile upload
export const compressImageForMobile = (
  file: File,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Get mobile-optimized image URL
export const getMobileImageUrl = (url: string, width?: number): string => {
  if (!url) return url;
  
  const targetWidth = width || (isMobileDevice() ? 400 : 800);
  
  // If using Cloudinary
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${targetWidth},q_auto,f_auto/`);
  }
  
  // If using other CDNs, you can add more conditions here
  return url;
};

// Check network connection
export const getNetworkInfo = () => {
  if (typeof navigator === 'undefined') {
    return { type: 'unknown', effectiveType: 'unknown' };
  }
  
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  if (connection) {
    return {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0
    };
  }
  
  return { type: 'unknown', effectiveType: 'unknown' };
};

// Check if device is low-end
export const isLowEndDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  const memory = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const connection = getNetworkInfo();
  
  return memory <= 2 || 
         cores <= 2 || 
         connection.effectiveType === 'slow-2g' || 
         connection.effectiveType === '2g';
};

// Mobile-specific storage utilities
export const mobileStorage = {
  // Use localStorage with fallback
  setItem: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  getItem: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : (defaultValue ?? null);
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return defaultValue ?? null;
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

// Mobile form utilities
export const mobileFormUtils = {
  // Auto-focus next input
  focusNextInput: (currentInput: HTMLInputElement): void => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')) as HTMLElement[];
    const currentIndex = inputs.indexOf(currentInput);
    
    if (currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus();
    } else {
      currentInput.blur(); // Hide keyboard on last field
    }
  },
  
  // Select all text in input
  selectAllText: (input: HTMLInputElement): void => {
    input.select();
    input.setSelectionRange(0, input.value.length);
  },
  
  // Format input value
  formatInputValue: (value: string, type: 'phone' | 'currency' | 'number'): string => {
    switch (type) {
      case 'phone':
        return formatPhoneNumber(value);
      case 'currency':
        return value.replace(/[^\d.]/g, '');
      case 'number':
        return value.replace(/[^\d]/g, '');
      default:
        return value;
    }
  }
};

// Mobile gesture utilities
export const mobileGestures = {
  // Detect swipe direction
  getSwipeDirection: (startX: number, startY: number, endX: number, endY: number): 'left' | 'right' | 'up' | 'down' | null => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        return deltaX > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        return deltaY > 0 ? 'down' : 'up';
      }
    }
    
    return null;
  },
  
  // Detect tap vs long press
  detectTapType: (startTime: number, endTime: number): 'tap' | 'longpress' => {
    const duration = endTime - startTime;
    return duration > 500 ? 'longpress' : 'tap';
  }
};



// Export all utilities
export default {
  isMobileDevice,
  isIOSDevice,
  isAndroidDevice,
  getDevicePixelRatio,
  isTouchDevice,
  getViewportDimensions,
  isKeyboardOpen,
  debounce,
  throttle,
  smoothScrollTo,
  scrollToInput,
  preventZoomOnFocus,
  triggerHapticFeedback,
  formatPhoneNumber,
  formatCurrency,
  formatDateForMobile,
  formatFileSize,
  validateMobileFile,
  compressImageForMobile,
  getMobileImageUrl,
  getNetworkInfo,
  isLowEndDevice,
  mobileStorage,
  mobileFormUtils,
  mobileGestures
};
