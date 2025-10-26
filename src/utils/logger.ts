/**
 * Development-only logging utility
 * Automatically disabled in production builds
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Log informational messages (only in development)
 */
export const log = (...args: any[]): void => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Log warning messages (only in development)
 */
export const warn = (...args: any[]): void => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * Log error messages (always logged, even in production)
 * Use sparingly - only for critical errors that need monitoring
 */
export const error = (...args: any[]): void => {
  console.error(...args);
};

/**
 * Log debug messages with a prefix (only in development)
 */
export const debug = (context: string, ...args: any[]): void => {
  if (isDevelopment) {
    console.debug(`[DEBUG:${context}]`, ...args);
  }
};

/**
 * Create a namespaced logger for a specific module
 * @example
 * const logger = createLogger('VehicleForm');
 * logger.info('Form submitted');
 * logger.error('Validation failed');
 */
export const createLogger = (namespace: string) => ({
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[${namespace}]`, ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[${namespace}]`, ...args);
    }
  },
  error: (...args: any[]) => {
    console.error(`[${namespace}]`, ...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[${namespace}:DEBUG]`, ...args);
    }
  }
});

export default {
  log,
  warn,
  error,
  debug,
  createLogger
};
