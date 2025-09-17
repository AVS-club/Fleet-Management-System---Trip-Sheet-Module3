import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animated = true
}) => {
  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700',
    animated && 'animate-pulse'
  );

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
    card: 'rounded-lg'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClasses,
              variantClasses[variant],
              index === lines - 1 ? 'w-3/4' : 'w-full'
            )}
            style={index === lines - 1 ? { ...style, width: '75%' } : style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={style}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 space-y-4', className)}>
    <SkeletonLoader variant="rectangular" height={20} width="60%" />
    <SkeletonLoader variant="text" lines={3} />
    <div className="flex space-x-2">
      <SkeletonLoader variant="rectangular" height={32} width={80} />
      <SkeletonLoader variant="rectangular" height={32} width={100} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className 
}) => (
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonLoader key={index} variant="rectangular" height={16} width="20%" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLoader key={colIndex} variant="rectangular" height={16} width="20%" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className 
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        <SkeletonLoader variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="rectangular" height={16} width="40%" />
          <SkeletonLoader variant="rectangular" height={12} width="60%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="space-y-2">
      <SkeletonLoader variant="rectangular" height={32} width="40%" />
      <SkeletonLoader variant="rectangular" height={16} width="60%" />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
    
    {/* Table */}
    <SkeletonTable />
  </div>
);

export default SkeletonLoader;
