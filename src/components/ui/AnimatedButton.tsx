import React from 'react';
import { Loader2 } from 'lucide-react';
import { ANIMATIONS } from '@/utils/animations';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  success?: boolean;
  error?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  isLoading = false,
  variant = 'primary',
  size = 'md',
  children,
  success = false,
  error = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    relative inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${ANIMATIONS.CLASSES.HOVER_LIFT}
    active:scale-95
  `;

  const variantClasses = {
    primary: `
      bg-primary-600 text-white
      hover:bg-primary-700 hover:shadow-lg
      focus:ring-primary-500
      ${success ? 'animate-success-pulse bg-green-600' : ''}
      ${error ? 'animate-error-pulse bg-red-600' : ''}
    `,
    secondary: `
      bg-gray-600 text-white
      hover:bg-gray-700 hover:shadow-lg
      focus:ring-gray-500
    `,
    outline: `
      border-2 border-primary-600 text-primary-600
      hover:bg-primary-50 hover:border-primary-700
      focus:ring-primary-500
      bg-transparent
    `,
    ghost: `
      text-primary-600
      hover:bg-primary-50
      focus:ring-primary-500
      bg-transparent
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700 hover:shadow-lg
      focus:ring-red-500
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isLoading ? 'cursor-wait' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      
      <span className={`transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
    </button>
  );
};

export default AnimatedButton;
