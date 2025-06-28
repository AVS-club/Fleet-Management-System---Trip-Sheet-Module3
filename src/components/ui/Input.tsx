import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
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
    ...props 
  }, ref) => {
    const inputId = id || `input-${React.useId()}`;

    const sizeClasses = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg'
    };

    const iconSizeClasses = {
      sm: iconPosition === 'left' ? 'pl-8' : 'pr-8',
      md: iconPosition === 'left' ? 'pl-10' : 'pr-10',
      lg: iconPosition === 'left' ? 'pl-12' : 'pr-12'
    };

    const iconContainerClasses = {
      sm: 'w-8',
      md: 'w-10',
      lg: 'w-12'
    };

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
          {icon && iconPosition === 'left' && (
            <div className={`absolute inset-y-0 left-0 flex items-center justify-center ${iconContainerClasses[size]} pointer-events-none text-gray-400 dark:text-gray-500`}>
              {icon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                "block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                error && "border-error-500 dark:border-error-500 focus:ring-error-200 dark:focus:ring-error-800 focus:border-error-500 dark:focus:border-error-500",
                icon && iconSizeClasses[size],
                sizeClasses[size],
                className
              )
            )}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div className={`absolute inset-y-0 right-0 flex items-center justify-center ${iconContainerClasses[size]} pointer-events-none text-gray-400 dark:text-gray-500`}>
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