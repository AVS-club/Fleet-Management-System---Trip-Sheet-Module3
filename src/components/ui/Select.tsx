import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  isPrefilledByTemplate?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
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
    isPrefilledByTemplate = false,
    ...props 
  }, ref) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const selectId = id || `select-${useId()}`;

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg'
    };

    return (
      <div className={cn("form-group", fullWidth && "w-full")}>
        {label && (
          <label 
            htmlFor={selectId} 
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
        
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
                "block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 appearance-none pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                error && "border-error-500 dark:border-error-500 focus:ring-error-200 dark:focus:ring-error-800 focus:border-error-500 dark:focus:border-error-500",
                sizeClasses[size],
                className
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        
        {(helperText || error) && (
          <p className={cn(
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

export default Select;