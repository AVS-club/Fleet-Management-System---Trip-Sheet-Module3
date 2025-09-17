import React from 'react';
import { cn } from '../../utils/cn';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  className
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };

  const responsiveClasses = [
    'grid',
    colClasses[cols.default || 1],
    cols.sm && `sm:${colClasses[cols.sm]}`,
    cols.md && `md:${colClasses[cols.md]}`,
    cols.lg && `lg:${colClasses[cols.lg]}`,
    cols.xl && `xl:${colClasses[cols.xl]}`,
    gapClasses[gap]
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(responsiveClasses, className)}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;
