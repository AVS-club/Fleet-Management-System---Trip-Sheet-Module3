import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white shadow-sm',
    secondary: 'bg-secondary-600 hover:bg-secondary-700 dark:bg-secondary-700 dark:hover:bg-secondary-600 text-white shadow-sm',
    outline: 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200',
    danger: 'bg-error-500 hover:bg-error-600 dark:bg-error-600 dark:hover:bg-error-500 text-white shadow-sm',
    warning: 'bg-warning-500 hover:bg-warning-600 dark:bg-warning-600 dark:hover:bg-warning-500 text-white shadow-sm',
  };

  const sizes = {
    sm: 'px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs rounded-md',
    md: 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md',
    lg: 'px-6 py-3 text-base rounded-lg',
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 dark:focus:ring-offset-gray-900 disabled:opacity-60 disabled:pointer-events-none',
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {icon && iconPosition === 'left' && !isLoading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};

export default Button;