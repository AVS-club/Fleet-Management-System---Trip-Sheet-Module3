import React, { forwardRef, useId, useState } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  inputSize?: 'sm' | 'md' | 'lg';
  isPrefilledByTemplate?: boolean;
  hideIconWhenFocused?: boolean; // New prop to hide icon when focused or has content
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
    inputSize = 'md',
    required,
    id,
    type,
    isPrefilledByTemplate = false,
    hideIconWhenFocused = false,
    value,
    ...props 
  }, ref) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const inputId = id || `input-${useId()}`;
    const [isFocused, setIsFocused] = useState(false);

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg'
    };

    const iconSizeClasses = {
      sm: 'pl-9',
      md: 'pl-12',
      lg: 'pl-14'
    };

    // Don't show icon for date inputs to avoid conflict with browser's date picker icon
    const shouldShowIcon = icon && type !== 'date';
    
    // Hide icon when focused or has content (if hideIconWhenFocused is true)
    const hasValue = value !== undefined && value !== null && value.toString().length > 0;
    const shouldHideIcon = hideIconWhenFocused && (isFocused || hasValue);
    const finalShouldShowIcon = shouldShowIcon && !shouldHideIcon;

    // Add additional padding for inputs with browser controls
    const needsRightPadding = type === 'number' || type === 'date' || type === 'time' || type === 'datetime-local';

    return (
      <div className={cn("form-group", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && <span className="text-error-500 dark:text-error-400 ml-1">*</span>}
            {isPrefilledByTemplate && (
              <span className="text-xs text-blue-600 dark:text-blue-400 ml-2 font-normal">
                (from template)
              </span>
            )}
          </label>
        )}
        
        <div className={cn("relative", fullWidth && "w-full")}>
          {shouldShowIcon && iconPosition === 'left' && (
            <div className={cn(
              "absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500 transition-opacity duration-200",
              !finalShouldShowIcon && "opacity-0"
            )}>
              {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' })}
            </div>
          )}
          
          <input
            id={inputId}
            ref={ref}
            type={type}
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
                "block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                error && "border-error-500 dark:border-error-500 focus:ring-error-200 dark:focus:ring-error-800 focus:border-error-500 dark:focus:border-error-500",
                shouldShowIcon && iconPosition === 'left' && iconSizeClasses[inputSize], // Always reserve space if icon exists
                shouldShowIcon && iconPosition === 'right' && "pr-14",
                needsRightPadding && "pr-14",
                sizeClasses[inputSize],
                className
            )}
            {...props}
          />
          
          {finalShouldShowIcon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 dark:text-gray-500">
              {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' })}
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <div className="mt-1">
            {error && (
              <p className="text-xs text-error-500 dark:text-error-400">{error}</p>
            )}
            {helperText && !error && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
