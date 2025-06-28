import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Search, ChevronDown, ChevronUp, Check } from 'lucide-react';

export interface SearchableSelectProps {
  label?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  helperText,
  required,
  disabled,
  className,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="form-group">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-error-500 dark:text-error-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <div
          className={twMerge(
            clsx(
              "flex items-center justify-between px-3 py-2 pr-10 border rounded-md bg-white dark:bg-gray-800 cursor-pointer",
              error ? "border-error-500 dark:border-error-500" : "border-gray-300 dark:border-gray-600",
              disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary-500 dark:hover:border-primary-400",
              sizeClasses[size],
              className
            )
          )}
          onClick={handleToggleDropdown}
        >
          <span className={value ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
            {value || placeholder}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 relative">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full pl-8 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    className={clsx(
                      "px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                      option === value ? "bg-primary-50 dark:bg-primary-900/30" : ""
                    )}
                    onClick={() => handleSelectOption(option)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={option === value ? "font-medium text-primary-600 dark:text-primary-400" : ""}>
                        {option}
                      </span>
                      {option === value && <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(helperText || error) && (
        <p className={clsx(
          "mt-1 text-xs sm:text-sm",
          error ? "text-error-500 dark:text-error-400" : "text-gray-500 dark:text-gray-400"
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default SearchableSelect;