/**
 * Custom hook for proper cleanup of resources
 * Prevents memory leaks from uncleaned timers, subscriptions, and event listeners
 */

import { useEffect, useRef } from 'react';

interface CleanupManager {
  timers: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
  listeners: Array<{ target: EventTarget; type: string; listener: EventListener }>;
  subscriptions: Array<{ unsubscribe: () => void }>;
  abortControllers: Set<AbortController>;
}

export function useCleanup() {
  const cleanupRef = useRef<CleanupManager>({
    timers: new Set(),
    intervals: new Set(),
    listeners: [],
    subscriptions: [],
    abortControllers: new Set()
  });

  // Register a timeout
  const setTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = globalThis.setTimeout(() => {
      cleanupRef.current.timers.delete(timer);
      callback();
    }, delay);
    
    cleanupRef.current.timers.add(timer);
    return timer;
  };

  // Clear a timeout
  const clearTimeout = (timer: NodeJS.Timeout) => {
    globalThis.clearTimeout(timer);
    cleanupRef.current.timers.delete(timer);
  };

  // Register an interval
  const setInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = globalThis.setInterval(callback, delay);
    cleanupRef.current.intervals.add(interval);
    return interval;
  };

  // Clear an interval
  const clearInterval = (interval: NodeJS.Timeout) => {
    globalThis.clearInterval(interval);
    cleanupRef.current.intervals.delete(interval);
  };

  // Add event listener with automatic cleanup
  const addEventListener = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    target.addEventListener(type, listener, options);
    cleanupRef.current.listeners.push({ target, type, listener });
  };

  // Remove event listener
  const removeEventListener = (
    target: EventTarget,
    type: string,
    listener: EventListener
  ) => {
    target.removeEventListener(type, listener);
    cleanupRef.current.listeners = cleanupRef.current.listeners.filter(
      l => !(l.target === target && l.type === type && l.listener === listener)
    );
  };

  // Add subscription with automatic cleanup
  const addSubscription = (subscription: { unsubscribe: () => void }) => {
    cleanupRef.current.subscriptions.push(subscription);
    return subscription;
  };

  // Create abort controller with automatic cleanup
  const createAbortController = (): AbortController => {
    const controller = new AbortController();
    cleanupRef.current.abortControllers.add(controller);
    return controller;
  };

  // Cleanup all resources
  const cleanup = () => {
    // Clear all timers
    cleanupRef.current.timers.forEach(timer => {
      globalThis.clearTimeout(timer);
    });
    cleanupRef.current.timers.clear();

    // Clear all intervals
    cleanupRef.current.intervals.forEach(interval => {
      globalThis.clearInterval(interval);
    });
    cleanupRef.current.intervals.clear();

    // Remove all event listeners
    cleanupRef.current.listeners.forEach(({ target, type, listener }) => {
      target.removeEventListener(type, listener);
    });
    cleanupRef.current.listeners = [];

    // Unsubscribe all subscriptions
    cleanupRef.current.subscriptions.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    cleanupRef.current.subscriptions = [];

    // Abort all controllers
    cleanupRef.current.abortControllers.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    cleanupRef.current.abortControllers.clear();
  };

  // Automatic cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    addEventListener,
    removeEventListener,
    addSubscription,
    createAbortController,
    cleanup
  };
}

/**
 * Hook to track if component is mounted
 * Prevents setState on unmounted components
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}

/**
 * Safe setState that only updates if component is mounted
 */
export function useSafeState<T>(initialState: T | (() => T)) {
  const [state, setState] = React.useState(initialState);
  const isMounted = useIsMounted();

  const setSafeState = React.useCallback(
    (newState: React.SetStateAction<T>) => {
      if (isMounted.current) {
        setState(newState);
      }
    },
    [isMounted]
  );

  return [state, setSafeState] as const;
}

// Import React for useSafeState
import React from 'react';
