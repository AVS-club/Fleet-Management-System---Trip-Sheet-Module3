import React from 'react';
import { cn } from '../../utils/cn';

const MobileNavSkeleton: React.FC = () => {
  // Show skeleton only for non-permission restricted items
  const baseItems = ['vehicles', 'drivers', 'trips', 'maintenance'];
  
  return (
    <div className="py-4">
      {baseItems.map((item, index) => (
        <div
          key={item}
          className="w-full flex items-center gap-3 px-4 py-3 animate-pulse"
        >
          {/* Icon skeleton */}
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
          {/* Label skeleton */}
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
};

export default MobileNavSkeleton;
