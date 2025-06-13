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
        <h1 className="text-3xl font-bold text-gray-800 mb-3">धर्मो रक्षति रक्षितः</h1>
        <p className="text-lg text-gray-600 mb-8">Greatness is in protecting what is right</p>
        
        <div className="flex items-center justify-center mb-8">
          <Truck className="h-16 w-16 text-primary-600" />
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