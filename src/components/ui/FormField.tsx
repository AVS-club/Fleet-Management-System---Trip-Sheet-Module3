import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
  isPassword?: boolean;
  required?: boolean;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(({
  label,
  error,
  success,
  hint,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  showPasswordToggle = false,
  isPassword = false,
  required = false,
  className,
  type,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const inputType = isPassword && showPassword ? 'text' : type;

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-4 text-lg'
  };

  const variantClasses = {
    default: 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800',
    filled: 'border-0 bg-gray-100 dark:bg-gray-700',
    outlined: 'border-2 border-gray-300 dark:border-gray-600 bg-transparent'
  };

  const focusClasses = isFocused 
    ? 'ring-2 ring-primary-500 border-primary-500' 
    : '';

  const errorClasses = error 
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
    : '';

  const successClasses = success 
    ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
    : '';

  const inputClasses = cn(
    'w-full rounded-lg transition-all duration-200 focus:outline-none',
    sizeClasses[size],
    variantClasses[variant],
    focusClasses,
    errorClasses,
    successClasses,
    leftIcon && 'pl-10',
    (rightIcon || showPasswordToggle) && 'pr-10',
    className
  );

  const handlePasswordToggle = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400 dark:text-gray-500">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          className={inputClasses}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {(rightIcon || showPasswordToggle) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {showPasswordToggle ? (
              <button
                type="button"
                onClick={handlePasswordToggle}
                className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            ) : (
              <div className="h-5 w-5 text-gray-400 dark:text-gray-500">
                {rightIcon}
              </div>
            )}
          </div>
        )}
        
        {/* Status Icons */}
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
        
        {success && !error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        )}
      </div>
      
      {/* Messages */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
      
      {success && !error && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
          <CheckCircle className="h-4 w-4 mr-1" />
          {success}
        </p>
      )}
      
      {hint && !error && !success && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;
