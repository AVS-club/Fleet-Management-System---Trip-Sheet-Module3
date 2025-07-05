import React, { useState, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  options: MultiSelectOption[];
  size?: "sm" | "md" | "lg";
  value?: string[];
  onChange?: (value: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

const sizeClasses = {
  sm: "px-2 py-1 text-sm",
  md: "px-3 py-2",
  lg: "px-4 py-3 text-lg",
};

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  helperText,
  error,
  fullWidth = true,
  options = [],
  size = "md",
  value = [],
  onChange,
  required,
  disabled,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = (option: MultiSelectOption) => {
    if (option.disabled) return;
    if (value.includes(option.value)) {
      onChange?.(value.filter((v) => v !== option.value));
    } else {
      onChange?.([...value, option.value]);
    }
  };

  const handleRemove = (optionValue: string) => {
    onChange?.(value.filter((v) => v !== optionValue));
  };

  return (
    <div
      className={cn("form-group", fullWidth && "w-full")}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && (
            <span className="text-error-500 dark:text-error-400 ml-1">*</span>
          )}
        </label>
      )}

      <div
        className={cn(
          "form-group", 
          fullWidth && "w-full",
            "relative min-h-[2.5rem] flex flex-wrap items-center gap-1 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer transition-colors duration-200 p-2 pr-10",
            error
              ? "border-error-500 dark:border-error-500"
              : "border-gray-300 dark:border-gray-600 focus-within:border-primary-400 dark:focus-within:border-primary-500",
            sizeClasses[size],
            disabled && "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
        )}
        onClick={() => !disabled && setOpen((o) => !o)}
        id={id}
      >
        {/* Chips for selected */}
        {value.length === 0 && (
          <span className="text-gray-400 select-none">Select...</span>
        )}
        {value
          .map((val) => options.find((o) => o.value === val))
          .filter(Boolean)
          .map((option) => (
            <span
              key={option!.value}
              className={cn("flex items-center bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 rounded px-2 py-1 text-xs mr-1 mb-1")}
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(option!.value);
              }}
            >
              {option!.label}
              <X className="ml-1 h-4 w-4 cursor-pointer" />
            </span>
          ))}
        <span className="ml-auto flex items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </span>
        {/* Dropdown */}
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.length === 0 && (
              <div className="p-2 text-gray-400 text-sm">No options</div>
            )}
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-center px-3 py-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900",
                  option.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option);
                }}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  readOnly
                  className="mr-2 accent-primary-600 h-4 w-4"
                  tabIndex={-1}
                  disabled={option.disabled}
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {(helperText || error) && (
        <p
          className={cn(
            "mt-1 text-sm",
            error
              ? "text-error-500 dark:text-error-400"
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default MultiSelect;