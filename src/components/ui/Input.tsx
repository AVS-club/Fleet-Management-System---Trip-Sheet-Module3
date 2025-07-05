import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    helperText, 
    error, 
    fullWidth = true, 
    className, 
    icon, 
    iconPosition = 'left',
    size = 'md',
    required,
    id,
    type,
    ...props 
  }, ref) => {
    const inputId = id || `input-${React.useId()}`;

    const sizeClasses = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg'
    };

    const iconSizeClasses = {
      sm: 'pl-8',
      md: 'pl-11',
      lg: 'pl-12'
    };

    // Don't show icon for date inputs to avoid conflict with browser's date picker icon
    const shouldShowIcon = icon && type !== 'date';

    // Add additional padding for inputs with browser controls
    const needsRightPadding = type === 'number' || type === 'date' || type === 'time' || type === 'datetime-local';

    return (
      <div className={clsx("form-group", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-error-500 dark:text-error-400 ml-1">*</span>}
          </label>
        )}
        
        <div className={clsx("relative", fullWidth && "w-full")}>
          {shouldShowIcon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
                "block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                error && "border-error-500 dark:border-error-500 focus:ring-error-200 dark:focus:ring-error-800 focus:border-error-500 dark:focus:border-error-500",
                shouldShowIcon && iconPosition === 'left' && iconSizeClasses[size],
                shouldShowIcon && iconPosition === 'right' && "pr-14",
                needsRightPadding && "pr-14", // Increased right padding for browser controls
                sizeClasses[size],
                className
            )}
            {...props}
          />
          
          {shouldShowIcon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <p className={clsx(
            "mt-1 text-sm",
            error ? "text-error-500 dark:text-error-400" : "text-gray-500 dark:text-gray-400"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

export default Input;