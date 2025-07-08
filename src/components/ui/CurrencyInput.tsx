import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

interface CurrencyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = true,
      className,
      size = 'md',
      required,
      id,
      type = 'number',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || `currency-input-${generatedId}`;

    const sizeClasses: Record<string, string> = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2',
      lg: 'px-4 py-3 text-lg'
    };

    const prefixPadding: Record<string, string> = {
      sm: 'pl-7',
      md: 'pl-9',
      lg: 'pl-10'
    };

    return (
      <div className={cn('form-group', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && (
              <span className="text-error-500 dark:text-error-400 ml-1">*</span>
            )}
          </label>
        )}
        <div className={cn('relative', fullWidth && 'w-full')}>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
            ₹
          </div>
          <input
            id={inputId}
            ref={ref}
            type={type}
            inputMode="decimal"
            className={cn(
              'block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
              error &&
                'border-error-500 dark:border-error-500 focus:ring-error-200 dark:focus:ring-error-800 focus:border-error-500 dark:focus:border-error-500',
              prefixPadding[size],
              sizeClasses[size],
              className
            )}
            {...props}
          />
        </div>
        {(helperText || error) && (
          <p
            className={cn(
              'mt-1 text-sm',
              error ? 'text-error-500 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

export default CurrencyInput;
