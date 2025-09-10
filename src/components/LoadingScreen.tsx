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
          
          <div className="relative bg-white p-4 rounded-2xl shadow-lg border border-gray-200">
            <img
              src="/assets/AVS-LOGO-512x512-new.png"
              alt="Auto Vital Solution"
              className="h-20 w-20 object-contain"
              onError={(e) => {
                // Fallback to icon if logo doesn't load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Truck className="hidden h-20 w-20 text-primary-600" />
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
        
        {/* Professional Loading Indicator */}
        <div className="flex flex-col items-center space-y-6">
          {/* Animated Progress Bar */}
          <div className="relative w-64">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 rounded-full animate-[slideProgress_1.5s_ease-in-out_infinite]"></div>
            </div>
            <div className="absolute -top-0.5 left-0 right-0 h-2.5 bg-gradient-to-r from-transparent via-primary-400/30 to-transparent rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"></div>
          </div>
          
          {/* Elegant Loading Dots */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite_0.2s]"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite_0.4s]"></div>
          </div>
          
          {/* Status Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Initializing Fleet Management System
          </p>
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
          @keyframes slideProgress {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(200%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          @keyframes shimmer {
            0%, 100% {
              opacity: 0;
              transform: translateX(-100%);
            }
            50% {
              opacity: 1;
              transform: translateX(100%);
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            50% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `
      }} />
    </div>
  );
};

export default LoadingScreen;