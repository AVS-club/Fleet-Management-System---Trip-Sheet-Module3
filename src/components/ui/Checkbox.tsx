import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  labelPlacement?: 'start' | 'end';
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
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
            className={twMerge(
              clsx(
                "h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors",
                error && "border-error-500 focus:ring-error-200",
                className
              )
            )}
            {...props}
          />
          
          {label && (
            <label 
              htmlFor={checkboxId} 
              className={clsx(
                "text-sm font-medium text-gray-700",
                labelPlacement === 'start' ? 'mr-2' : 'ml-2'
              )}
            >
              {label}
            </label>
          )}
        </div>
        
        {(helperText || error) && (
          <p className={clsx(
            "mt-1 text-sm ml-6",
            error ? "form-error" : "text-gray-500"
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