import React from 'react';
import { Truck } from 'lucide-react';
import { useTheme } from '../utils/themeContext';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const { theme } = useTheme();
  
  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 transition-opacity"
      style={{ transition: 'opacity 1s' }}
    >
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/assets/logo.png"
            alt="Auto Vital Solution Logo"
            className="h-24 w-auto object-contain"
            onError={(e) => {
              // Fallback to Pexels image if local logo fails
              (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg?auto=compress&cs=tinysrgb&w=96&h=96&fit=crop';
            }}
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Auto Vital Solution</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">Intelligent Fleet Management</p>
        
        <div className="flex items-center justify-center mb-8">
          <Truck className={`h-12 w-12 ${theme === 'dark' ? 'text-primary-400' : 'text-primary-600'}`} />
        </div>
        
        <div className="flex space-x-2 justify-center">
          <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-primary-400' : 'bg-primary-600'} rounded-full animate-bounce [animation-delay:-0.3s]`}></div>
          <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-primary-400' : 'bg-primary-600'} rounded-full animate-bounce [animation-delay:-0.15s]`}></div>
          <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-primary-400' : 'bg-primary-600'} rounded-full animate-bounce`}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;