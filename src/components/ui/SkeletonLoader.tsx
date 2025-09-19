import React from 'react';
import { ANIMATIONS } from '@/utils/animations';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  lines = 3, 
  className = '',
  height = 'md'
}) => {
  const heightClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
  };

  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`
              bg-gray-200 rounded-lg
              ${heightClasses[height]}
              ${index === lines - 1 ? 'w-3/4' : 'w-full'}
            `}
            style={{
              animationDelay: ANIMATIONS.createStaggerDelay(index, 100),
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Specialized skeleton loaders for specific components
export const VehicleSkeletonLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-10 bg-gray-200 rounded-lg mb-2" />
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg" />
      ))}
    </div>
  </div>
);

export const VendorSkeletonLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ServiceGroupSkeletonLoader: React.FC = () => (
  <div className="animate-pulse">
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded-lg" />
        <div className="h-10 bg-gray-200 rounded-lg" />
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  </div>
);

export default SkeletonLoader;
