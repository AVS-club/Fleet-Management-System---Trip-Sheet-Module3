import React from 'react';
import { cn } from '../../utils/cn';

interface NavSkeletonProps {
  className?: string;
  isMobile?: boolean;
}

const NavSkeleton: React.FC<NavSkeletonProps> = ({ className, isMobile = false }) => {
  // Show skeleton only for non-permission restricted items
  const baseItems = ['vehicles', 'drivers', 'trips', 'maintenance'];
  
  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 px-2", className)}>
      {baseItems.map((item, index) => (
        <div key={item} className="relative group animate-pulse">
          <div className="relative flex flex-col items-center justify-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2">
            {/* Icon skeleton */}
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            {/* Label skeleton */}
            <div className="mt-0.5 h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default NavSkeleton;
