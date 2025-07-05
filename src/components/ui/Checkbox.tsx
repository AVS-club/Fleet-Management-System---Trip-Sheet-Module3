import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  labelPlacement?: 'start' | 'end';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    label, 
    helperText, 
    error, 
    className, 
    labelPlacement = 'end',
    id,
    ...props 
  }, ref) => {
    // Generate unique ID for checkbox if none provided
    const checkboxId = id || `checkbox-${React.useId()}`;

    return (
      <div className="form-group">
        <div className={clsx(
          "flex items-center",
          labelPlacement === 'start' ? 'flex-row-reverse justify-end' : 'flex-row'
        )}>
          <input
            id={checkboxId}
            type="checkbox"
            ref={ref}
            className={cn(
                "h-4 w-4 text-primary-600 dark:text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded transition-colors",
                error && "border-error-500 dark:border-error-400 focus:ring-error-200 dark:focus:ring-error-800",
                className
            )}
            {...props}
          />
          
          {label && (
            <label 
              htmlFor={checkboxId}
              className={clsx(
                "text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300",
                labelPlacement === 'start' ? 'mr-2' : 'ml-2'
              )}
            >
              {label}
            </label>
          )}
        </div>
        
        {(helperText || error) && (
          <p className={clsx(
            "mt-1 text-xs sm:text-sm ml-6",
            error ? "text-error-500 dark:text-error-400" : "text-gray-500 dark:text-gray-400"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;