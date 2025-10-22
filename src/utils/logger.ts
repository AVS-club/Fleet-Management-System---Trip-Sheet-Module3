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
    logger.debug(...args);
  }
};

/**
 * Log warning messages (only in development)
 */
export const warn = (...args: any[]): void => {
  if (isDevelopment) {
    logger.warn(...args);
  }
};

/**
 * Log error messages (always logged, even in production)
 * Use sparingly - only for critical errors that need monitoring
 */
export const error = (...args: any[]): void => {
  logger.error(...args);
};

/**
 * Log debug messages with a prefix (only in development)
 */
export const debug = (context: string, ...args: any[]): void => {
  if (isDevelopment) {
    logger.debug(`[DEBUG:${context}]`, ...args);
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
      logger.debug(`[${namespace}]`, ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      logger.warn(`[${namespace}]`, ...args);
    }
  },
  error: (...args: any[]) => {
    logger.error(`[${namespace}]`, ...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      logger.debug(`[${namespace}:DEBUG]`, ...args);
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
