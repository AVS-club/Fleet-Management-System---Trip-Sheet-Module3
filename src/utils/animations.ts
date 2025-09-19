/**
 * Animation utilities for enhanced UX
 * Provides smooth transitions and micro-interactions for the maintenance form
 */

// Animation duration constants
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 200,
  SLOW: 300,
  VERY_SLOW: 500,
} as const;

// Easing functions
export const EASING = {
  EASE_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  ELASTIC: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// Animation classes for Tailwind
export const ANIMATION_CLASSES = {
  // Smooth transitions
  TRANSITION_SMOOTH: 'transition-all duration-200 ease-out',
  TRANSITION_BOUNCE: 'transition-all duration-300 ease-bounce',
  TRANSITION_FADE: 'transition-opacity duration-150 ease-in-out',
  
  // Hover effects
  HOVER_LIFT: 'hover:-translate-y-0.5 hover:shadow-lg',
  HOVER_SCALE: 'hover:scale-105',
  HOVER_SLIDE: 'hover:translate-x-1',
  
  // Focus effects
  FOCUS_RING: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  FOCUS_SCALE: 'focus:scale-105',
  
  // Loading states
  LOADING_PULSE: 'animate-pulse',
  LOADING_SPIN: 'animate-spin',
  LOADING_BOUNCE: 'animate-bounce',
  
  // Error states
  ERROR_SHAKE: 'animate-shake',
  ERROR_PULSE: 'animate-pulse-red',
  
  // Success states
  SUCCESS_PULSE: 'animate-pulse-green',
  SUCCESS_SCALE: 'animate-scale-in',
} as const;

// Keyframe animations
export const KEYFRAMES = {
  slideDown: `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  
  slideUp: `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  
  slideLeft: `
    @keyframes slideLeft {
      from {
        opacity: 0;
        transform: translateX(10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,
  
  slideRight: `
    @keyframes slideRight {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,
  
  expandIn: `
    @keyframes expandIn {
      from {
        opacity: 0;
        transform: scale(0.95);
        max-height: 0;
      }
      to {
        opacity: 1;
        transform: scale(1);
        max-height: 800px;
      }
    }
  `,
  
  collapseOut: `
    @keyframes collapseOut {
      to {
        opacity: 0;
        transform: scale(0.95);
        max-height: 0;
        margin: 0;
        padding: 0;
      }
    }
  `,
  
  shake: `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
  `,
  
  successPulse: `
    @keyframes successPulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
  `,
  
  errorPulse: `
    @keyframes errorPulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  `,
  
  scaleIn: `
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  
  staggerIn: `
    @keyframes staggerIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
} as const;

// Animation utility functions
export const createStaggerDelay = (index: number, baseDelay: number = 50) => 
  `${index * baseDelay}ms`;

export const createAnimationStyle = (
  animation: string,
  duration: number = ANIMATION_DURATION.NORMAL,
  delay: string = '0ms',
  easing: string = EASING.EASE_OUT
) => ({
  animation: `${animation} ${duration}ms ${easing} ${delay} both`,
});

// Responsive animation utilities
export const RESPONSIVE_ANIMATIONS = {
  // Reduce animations on mobile for better performance
  mobile: `
    @media (max-width: 768px) {
      .animate-slide-down,
      .animate-slide-up,
      .animate-slide-left,
      .animate-slide-right {
        animation-duration: 100ms !important;
      }
      
      .hover\\:scale-105:hover {
        transform: scale(1.02) !important;
      }
      
      .hover\\:-translate-y-0\\.5:hover {
        transform: translateY(-2px) !important;
      }
    }
  `,
  
  // Respect user motion preferences
  reducedMotion: `
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      
      .animate-pulse,
      .animate-bounce,
      .animate-spin {
        animation: none !important;
      }
    }
  `,
} as const;

// Component-specific animation presets
export const COMPONENT_ANIMATIONS = {
  dropdown: {
    enter: 'animate-slide-down',
    exit: 'animate-slide-up',
    duration: ANIMATION_DURATION.FAST,
  },
  
  serviceGroup: {
    add: 'animate-expand-in',
    remove: 'animate-collapse-out',
    duration: ANIMATION_DURATION.NORMAL,
  },
  
  button: {
    hover: 'hover:scale-105 hover:shadow-lg',
    active: 'active:scale-95',
    loading: 'animate-pulse',
  },
  
  input: {
    focus: 'focus:ring-2 focus:ring-primary-500 focus:scale-105',
    error: 'animate-shake border-red-500',
    success: 'animate-success-pulse border-green-500',
  },
  
  toast: {
    enter: 'animate-slide-right',
    exit: 'animate-slide-right-reverse',
    duration: ANIMATION_DURATION.NORMAL,
  },
  
  skeleton: {
    loading: 'animate-pulse',
    duration: ANIMATION_DURATION.SLOW,
  },
} as const;

// Performance optimization utilities
export const PERFORMANCE_UTILS = {
  // Use transform and opacity for GPU acceleration
  gpuAccelerated: 'transform-gpu will-change-transform',
  
  // Optimize for 60fps
  smooth60fps: 'transition-transform duration-150 ease-out',
  
  // Reduce repaints
  noRepaint: 'will-change-auto',
} as const;

// Accessibility utilities
export const ACCESSIBILITY_UTILS = {
  // Respect reduced motion
  respectMotion: 'motion-reduce:animate-none motion-reduce:transition-none',
  
  // High contrast support
  highContrast: 'high-contrast:border-2 high-contrast:border-black',
  
  // Focus indicators
  focusVisible: 'focus-visible:ring-2 focus-visible:ring-primary-500',
} as const;

// Export all utilities as a single object for easy importing
export const ANIMATIONS = {
  DURATION: ANIMATION_DURATION,
  EASING: EASING,
  CLASSES: ANIMATION_CLASSES,
  KEYFRAMES: KEYFRAMES,
  RESPONSIVE: RESPONSIVE_ANIMATIONS,
  COMPONENTS: COMPONENT_ANIMATIONS,
  PERFORMANCE: PERFORMANCE_UTILS,
  ACCESSIBILITY: ACCESSIBILITY_UTILS,
  createStaggerDelay,
  createAnimationStyle,
} as const;

export default ANIMATIONS;
