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
      sm: 'pl-7',
      md: 'pl-9',
      lg: 'pl-11'
    };

    return (
      <div className={clsx("form-group", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className={clsx("relative", fullWidth && "w-full")}>
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                "block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 transition-colors duration-200",
                error && "border-error-500 focus:ring-error-200 focus:border-error-500",
                icon && iconPosition === 'left' && iconSizeClasses[size],
                icon && iconPosition === 'right' && "pr-9",
                sizeClasses[size],
                className
              )
            )}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
              {icon}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <p className={clsx(
            "mt-1 text-sm",
            error ? "text-error-500" : "text-gray-500"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;