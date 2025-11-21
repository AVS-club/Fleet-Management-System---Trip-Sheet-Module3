/**
 * Error Boundary for AI Alerts Module
 * Provides graceful error handling and recovery options
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Activity, Zap } from 'lucide-react';
import { createLogger } from '@/utils/logger';
import { cleanupOptimizer } from '@/utils/aiAlertsOptimizer';

const logger = createLogger('AIAlertsErrorBoundary');

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorCount: number;
  isRecovering: boolean;
}

class AIAlertsErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true,
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error('AI Alerts error caught:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.retryCount,
    });

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Report to parent if handler provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error for debugging
    this.storeErrorForDebugging(error, errorInfo);
    
    // Cleanup any hanging resources
    this.performCleanup();
  }

  performCleanup = () => {
    try {
      // Clean up ONLY AI Alerts optimizer caches
      cleanupOptimizer();
      
      // DO NOT clear all timeouts - this was breaking other components
      // Only clear caches related to AI Alerts
      
      logger.info('AI Alerts cleanup performed after error');
    } catch (cleanupError) {
      logger.error('Error during cleanup:', cleanupError);
    }
  };

  storeErrorForDebugging = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.retryCount,
      };

      // Store in localStorage for debugging
      const existingLogs = JSON.parse(localStorage.getItem('aiAlertsErrors') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last 5 errors
      if (existingLogs.length > 5) {
        existingLogs.shift();
      }
      
      localStorage.setItem('aiAlertsErrors', JSON.stringify(existingLogs));
    } catch (e) {
      logger.error('Failed to store error log:', e);
    }
  };

  handleReset = async () => {
    this.setState({ isRecovering: true });
    
    // Perform cleanup
    this.performCleanup();
    
    // Small delay to show recovery state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isRecovering: false,
    });
    
    this.retryCount++;
    
    if (this.retryCount > this.maxRetries) {
      logger.warn('Max retries reached, consider refreshing page');
    }
  };

  handleRefresh = () => {
    // Clear error logs before refresh
    localStorage.removeItem('aiAlertsErrors');
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

  getErrorMessage = (): string => {
    const error = this.state.error;
    if (!error) return 'An unknown error occurred';

    // Provide user-friendly messages for common errors
    if (error.message.includes('Network')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (error.message.includes('Permission')) {
      return 'You don\'t have permission to access this data.';
    }
    if (error.message.includes('timeout')) {
      return 'The request took too long to complete. Please try again.';
    }
    if (error.message.includes('memory')) {
      return 'Too much data to process. Try applying filters to reduce the data.';
    }
    
    return error.message;
  };

  render() {
    if (this.state.hasError) {
      const isRetryable = this.retryCount < this.maxRetries;
      
      return (
        <div className="min-h-[600px] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Error Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 p-6">
                <div className="flex items-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mr-4">
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                      AI Alerts Error
                      {this.state.isRecovering && (
                        <span className="text-sm bg-white/20 px-2 py-1 rounded-full flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Recovering...
                        </span>
                      )}
                    </h1>
                    <p className="text-red-100 mt-1">
                      Something went wrong while processing AI alerts
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Content */}
              <div className="p-6 space-y-4">
                {/* Error Message */}
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                  <div className="flex items-start">
                    <Activity className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Error Details:
                      </p>
                      <p className="text-red-600 dark:text-red-300 mt-1">
                        {this.getErrorMessage()}
                      </p>
                      {this.retryCount > 0 && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                          Retry attempt {this.retryCount} of {this.maxRetries}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Fix Suggestions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <Zap className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Quick Fixes:
                      </p>
                      <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1 list-disc list-inside">
                        <li>Clear your browser cache and cookies</li>
                        <li>Check your internet connection</li>
                        <li>Try reducing the date range or filters</li>
                        <li>Refresh the page to start fresh</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Technical Details Toggle */}
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
                    {/* Error Message */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Error Message:
                      </p>
                      <code className="text-xs text-red-600 dark:text-red-400 block bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                        {this.state.error?.toString()}
                      </code>
                    </div>

                    {/* Stack Trace */}
                    {this.state.error?.stack && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Stack Trace:
                        </p>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-32">
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
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    {/* Error Count */}
                    {this.state.errorCount > 1 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        This error has occurred {this.state.errorCount} times in this session
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  {isRetryable && (
                    <button
                      onClick={this.handleReset}
                      disabled={this.state.isRecovering}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${this.state.isRecovering ? 'animate-spin' : ''}`} />
                      {this.state.isRecovering ? 'Recovering...' : 'Try Again'}
                    </button>
                  )}

                  <button
                    onClick={this.handleRefresh}
                    className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all transform hover:scale-105"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all transform hover:scale-105"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </button>
                </div>

                {/* Support Info */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    If this problem persists, please contact support with error ID:
                  </p>
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300 mt-1 inline-block">
                    {`AI-${Date.now().toString(36).toUpperCase()}`}
                  </code>
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

export default AIAlertsErrorBoundary;
