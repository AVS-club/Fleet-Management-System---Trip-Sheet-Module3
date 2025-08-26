```tsx
import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode; // Watermark icon
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  icon,
  onClick,
  children,
  className,
  ...props
}) => {
  const clickableProps = onClick
    ? {
        onClick,
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      className={cn(
        'group h-32 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition relative overflow-hidden',
        onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400' : '',
        className
      )}
      {...clickableProps}
      {...props}
    >
      {/* Watermark Icon */}
      {icon && (
        <div className="absolute right-3 top-3 opacity-10 text-gray-900 dark:text-gray-100">
          {React.cloneElement(icon as React.ReactElement, { className: 'h-8 w-8' })}
        </div>
      )}

      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <div className="mt-2 text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </div>
  );
};

export default Card;
```