import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'brand';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  rounded = 'brand',
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-700 
      hover:from-primary-700 hover:to-primary-800 
      dark:from-primary-600 dark:to-primary-700 
      dark:hover:from-primary-500 dark:hover:to-primary-600 
      text-white shadow-brand hover:shadow-brand-lg 
      border border-primary-700 dark:border-primary-600
      transform hover:scale-[1.02] active:scale-[0.98]
    `,
    secondary: `
      bg-gradient-to-r from-secondary-600 to-secondary-700 
      hover:from-secondary-700 hover:to-secondary-800 
      dark:from-secondary-600 dark:to-secondary-700 
      dark:hover:from-secondary-500 dark:hover:to-secondary-600 
      text-white shadow-brand hover:shadow-brand-lg
      border border-secondary-700 dark:border-secondary-600
      transform hover:scale-[1.02] active:scale-[0.98]
    `,
    outline: `
      border-2 border-gray-300 dark:border-gray-600 
      bg-white dark:bg-gray-800 
      text-gray-700 dark:text-gray-200 
      hover:bg-gray-50 dark:hover:bg-gray-750 
      hover:border-gray-400 dark:hover:border-gray-500
      shadow-sm hover:shadow-md
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 
      text-gray-700 dark:text-gray-200
      hover:shadow-sm
    `,
    danger: `
      bg-gradient-to-r from-error-500 to-error-600 
      hover:from-error-600 hover:to-error-700 
      dark:from-error-600 dark:to-error-700 
      dark:hover:from-error-500 dark:hover:to-error-600 
      text-white shadow-brand hover:shadow-brand-lg
      transform hover:scale-[1.02] active:scale-[0.98]
    `,
    warning: `
      bg-gradient-to-r from-warning-500 to-warning-600 
      hover:from-warning-600 hover:to-warning-700 
      dark:from-warning-600 dark:to-warning-700 
      dark:hover:from-warning-500 dark:hover:to-warning-600 
      text-white shadow-brand hover:shadow-brand-lg
      transform hover:scale-[1.02] active:scale-[0.98]
    `,
    success: `
      bg-gradient-to-r from-success-500 to-success-600 
      hover:from-success-600 hover:to-success-700 
      dark:from-success-600 dark:to-success-700 
      dark:hover:from-success-500 dark:hover:to-success-600 
      text-white shadow-brand hover:shadow-brand-lg
      transform hover:scale-[1.02] active:scale-[0.98]
    `,
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm gap-1.5',
    md: 'px-3 sm:px-4 py-2 text-sm gap-2',
    lg: 'px-5 sm:px-6 py-2.5 sm:py-3 text-base gap-2',
    xl: 'px-6 sm:px-8 py-3 sm:py-4 text-lg gap-2.5',
  };

  const roundedStyles = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
    brand: 'rounded-brand', // Custom 10px radius
  };

  const buttonClasses = cn(
    // Base styles with Rich SaaS Typography
    'inline-flex items-center justify-center font-sans font-semibold transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'focus:ring-primary-500 dark:focus:ring-primary-400 dark:focus:ring-offset-gray-900',
    'disabled:opacity-50 disabled:pointer-events-none disabled:transform-none',
    // Variant styles
    variants[variant],
    // Size styles
    sizes[size],
    // Rounded styles
    roundedStyles[rounded],
    // Full width
    fullWidth ? 'w-full' : '',
    // Custom classes
    className
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 text-current"
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
      
      {/* Left Icon */}
      {icon && iconPosition === 'left' && !isLoading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      
      {/* Button Text */}
      {children && <span>{children}</span>}
      
      {/* Right Icon */}
      {icon && iconPosition === 'right' && !isLoading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
};

export default Button;