import React from 'react';
import { Truck } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-opacity duration-500"
    >
      <div className="text-center animate-fade-in">
        {/* Logo Container with Animation */}
        <div className="relative flex justify-center mb-6">
          <div className="absolute inset-0 flex justify-center">
            <div className="h-32 w-32 bg-gradient-to-br from-primary-400/20 to-secondary-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
          </div>
          
          <div className="relative bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-brand-lg">
            <img
              src="/assets/AVS-LOGO-512x512-new.png"
              alt="Auto Vital Solution"
              className="h-20 w-20 object-contain animate-spin-slow"
              onError={(e) => {
                // Fallback to icon if logo doesn't load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Truck className="hidden h-20 w-20 text-primary-600 dark:text-primary-400 animate-spin-slow" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-400 dark:to-secondary-400 bg-clip-text text-transparent mb-2">
          Auto Vital Solution
        </h1>
        
        {/* Tagline */}
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 font-medium">
          Intelligent Fleet Management
        </p>
        
        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-4">
          {/* Progress Bar */}
          <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full animate-[slideRight_2s_ease-in-out_infinite]"></div>
          </div>
          
          {/* Loading Text */}
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading</span>
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Optional: Add tips or messages */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tip: Track your fleet performance in real-time
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideRight {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
        `
      }} />
    </div>
  );
};

export default LoadingScreen;