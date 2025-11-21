/**
 * Error Boundary Component for Maintenance Module
 * Catches and handles errors gracefully to prevent crashes
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MaintenanceErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorCount: number;
}

class MaintenanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and external service
    logger.error('Maintenance module error caught by boundary:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if configured)
    this.reportErrorToService(error, errorInfo);
  }

  reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // This would send to your error monitoring service (Sentry, etc.)
    // For now, just log locally
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('maintenanceErrors') || '[]');
      existingErrors.push(errorReport);
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.shift();
      }
      localStorage.setItem('maintenanceErrors', JSON.stringify(existingErrors));
    } catch (e) {
      logger.error('Failed to store error report:', e);
    }
  };

  handleReset = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });

    // Optionally clear the error log if too many errors
    if (this.state.errorCount > 5) {
      logger.warn('Multiple errors detected, consider refreshing the page');
    }
  };

  handleRefreshPage = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
              {/* Error Header */}
              <div className="bg-red-500 dark:bg-red-600 p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-white mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Maintenance Module Error
                    </h1>
                    <p className="text-red-100 mt-1">
                      Something went wrong while loading the maintenance module
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Content */}
              <div className="p-6 space-y-4">
                {/* Error Message */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error Message:
                  </p>
                  <p className="text-red-600 dark:text-red-300 mt-1 font-mono text-sm">
                    {this.state.error?.message || 'Unknown error occurred'}
                  </p>
                </div>

                {/* Error Details Toggle */}
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {this.state.showDetails ? (
                    <ChevronUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 mr-1" />
                  )}
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                </button>

                {/* Technical Details */}
                {this.state.showDetails && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                    {/* Stack Trace */}
                    {this.state.error?.stack && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Stack Trace:
                        </p>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component Stack */}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Component Stack:
                        </p>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {/* Error Count */}
                    {this.state.errorCount > 1 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        This error has occurred {this.state.errorCount} times
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>

                  <button
                    onClick={this.handleRefreshPage}
                    className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    If this problem persists, please contact support with the error details above.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Error ID: {Date.now().toString(36).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MaintenanceErrorBoundary;
