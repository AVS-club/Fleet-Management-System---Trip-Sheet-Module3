import React from 'react';
import { cn } from '../../utils/cn';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  clickable?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = 'sm',
  onClick,
  clickable = false
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  const baseClasses = [
    'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
    paddingClasses[padding],
    shadowClasses[shadow],
    clickable && 'cursor-pointer hover:shadow-md transition-shadow',
    onClick && 'cursor-pointer hover:shadow-md transition-shadow'
  ].filter(Boolean).join(' ');

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn(baseClasses, className)}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Component>
  );
};

export default MobileCard;
