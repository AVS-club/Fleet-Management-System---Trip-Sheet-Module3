import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ 
    label, 
    helperText, 
    error, 
    className, 
    checked,
    disabled,
    onChange,
    icon,
    size = 'md',
    id,
    ...props 
  }, ref) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const switchId = id || `switch-${useId()}`;

    const sizeClasses = {
      sm: 'h-4 w-8',
      md: 'h-5 w-10',
      lg: 'h-6 w-12'
    };

    const thumbSizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    const translateClasses = {
      sm: 'translate-x-4',
      md: 'translate-x-5',
      lg: 'translate-x-6'
    };

    return (
      <div className="form-group">
        <div className="flex items-center">
          <div className="relative inline-block">
            <input
              ref={ref}
              id={switchId}
              type="checkbox"
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              className="sr-only"
              {...props}
            />

            <label
              htmlFor={switchId}
              className={cn(
                'block cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                sizeClasses[size],
                checked ? 'bg-primary-500' : 'bg-gray-300',
                disabled && 'opacity-50 cursor-not-allowed',
                error && 'ring-2 ring-error-500',
                className
              )}
            >
              <span 
                className={cn(
                  'absolute top-0.5 left-0.5 block rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out',
                  thumbSizeClasses[size],
                  checked ? translateClasses[size] : '',
                  disabled && 'opacity-75'
                )}
              >
                {icon && (
                  <span className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    'transition-opacity',
                    checked ? 'opacity-100' : 'opacity-0',
                    'text-primary-500',
                    'scale-75'
                  )}>
                    {icon}
                  </span>
                )}
              </span>
            </label>
          </div>

          {label && (
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
        </div>

        {(helperText || error) && (
          <p className={cn(
            'mt-1 text-sm ml-12',
            error ? 'text-error-500' : 'text-gray-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;