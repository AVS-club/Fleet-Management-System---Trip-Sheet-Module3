import React from 'react';
import { cn } from '../../utils/cn';

interface MobileFormProps {
  children: React.ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent) => void;
}

interface MobileFormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

interface MobileFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

const MobileForm: React.FC<MobileFormProps> = ({
  children,
  className,
  onSubmit
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('space-y-6', className)}
    >
      {children}
    </form>
  );
};

const MobileFormSection: React.FC<MobileFormSectionProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

const MobileFormField: React.FC<MobileFormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div>
        {children}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};

const MobileFormActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
};

export { MobileForm, MobileFormSection, MobileFormField, MobileFormActions };
