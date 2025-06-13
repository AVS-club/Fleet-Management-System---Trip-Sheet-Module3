import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = true,
  ...props 
}) => {
  return (
    <div 
      className={twMerge(
        clsx(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden",
          hover && "hover:shadow-md transition-shadow duration-200",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

export const CardHeader: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={clsx("px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700", className)}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={clsx("px-4 py-5 sm:p-6", className)}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={clsx("px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700", className)}>
      {children}
    </div>
  );
};