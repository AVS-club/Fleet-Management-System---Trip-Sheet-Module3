import React from 'react';
import { Truck } from 'lucide-react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      style={{ transition: 'opacity 1s' }}
    >
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/assets/logo.png"
            alt="Auto Vital Solution Logo"
            className="h-24 w-auto object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Auto Vital Solution</h1>
        <p className="text-lg text-gray-600 mb-6">Intelligent Fleet Management</p>
        
        <div className="flex items-center justify-center mb-8">
          <Truck className="h-12 w-12 text-primary-600" />
        </div>
        
        <div className="flex space-x-2 justify-center">
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;