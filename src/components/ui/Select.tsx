import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    helperText, 
    error, 
    fullWidth = true, 
    className,
    options = [],
    size = 'md',
    required,
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${React.useId()}`;

    const sizeClasses = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg'
    };

    return (
      <div className={clsx("form-group", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={selectId} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                "block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-200 focus:ring-opacity-50 transition-colors duration-200 appearance-none pr-8",
                error && "border-error-500 focus:ring-error-200 focus:border-error-500",
                sizeClasses[size],
                className
              )
            )}
            {...props}
          >
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <ChevronDown className="h-4 w-4" />
          </div>
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

Select.displayName = 'Select';

export default Select;