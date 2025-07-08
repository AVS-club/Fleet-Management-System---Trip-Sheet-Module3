import React, { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  required?: boolean;
}

const sizeClasses = {
  sm: "px-2 py-1 text-sm",
  md: "px-3 py-2",
  lg: "px-4 py-3 text-lg",
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      fullWidth = true,
      className,
      size = "md",
      required,
      id,
      ...props
    },
    ref
  ) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const textareaId = id || `textarea-${useId()}`;

    return (
      <div className={cn("form-group", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
            {required && (
              <span className="text-error-500 dark:text-error-400 ml-1">*</span>
            )}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-400 dark:focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:ring-opacity-50 transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            error &&
              "border-error-500 dark:border-error-500 focus:ring-error-200 dark:focus:ring-error-800 focus:border-error-500 dark:focus:border-error-500",
            sizeClasses[size],
            className
          )}
          {...props}
        />

        {(helperText || error) && (
          <p className={cn(
              "mt-1 text-xs sm:text-sm",
              error
                ? "text-error-500 dark:text-error-400"
                : "text-gray-500 dark:text-gray-400"
            )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;