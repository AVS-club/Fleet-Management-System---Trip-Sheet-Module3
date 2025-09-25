import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

interface DropdownOption {
  id: string | number;
  label: string;
  value: string;
  subtitle?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'available' | 'on-trip';
  icon?: LucideIcon;
}

interface EnhancedInputProps {
  // Basic input props
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  
  // Enhanced features
  icon?: LucideIcon;
  isVehicle?: boolean; // Special styling for vehicle numbers
  showCheckmark?: boolean;
  
  // Dropdown functionality
  isDropdown?: boolean;
  dropdownOptions?: DropdownOption[];
  onDropdownSelect?: (option: DropdownOption) => void;
  dropdownSearchable?: boolean;
  dropdownPlaceholder?: string;
  
  // Styling
  className?: string;
  containerClassName?: string;
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  error,
  icon: Icon,
  isVehicle = false,
  showCheckmark = true,
  isDropdown = false,
  dropdownOptions = [],
  onDropdownSelect,
  dropdownSearchable = true,
  dropdownPlaceholder = 'Search...',
  className = '',
  containerClassName = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasValue = value && value.trim().length > 0;
  
  // Filter options based on input value
  const filteredOptions = dropdownOptions.filter(option =>
    option.label.toLowerCase().includes(value.toLowerCase()) ||
    option.value.toLowerCase().includes(value.toLowerCase()) ||
    (option.subtitle && option.subtitle.toLowerCase().includes(value.toLowerCase()))
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdown || !isDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleDropdownSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = isVehicle ? e.target.value.toUpperCase() : e.target.value;
    onChange(newValue);
    
    // Open dropdown when typing if there are options to show
    if (isDropdown && !isDropdownOpen && newValue.length > 0 && filteredOptions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleDropdownSelect = (option: DropdownOption) => {
    onChange(option.value);
    onDropdownSelect?.(option);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    // Focus back on input after selection
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    // Open dropdown on focus if there are options
    if (isDropdown && filteredOptions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
  };

  const getInputClasses = () => {
    const baseClasses = 'input-enhanced';
    const vehicleClasses = isVehicle ? 'input-vehicle' : '';
    const errorClasses = error ? 'border-red-500 dark:border-red-400' : '';
    const disabledClasses = disabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-900';
    const focusClasses = isFocused ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-300 dark:border-gray-600';
    
    return `
      ${baseClasses}
      ${vehicleClasses}
      ${errorClasses || focusClasses}
      ${disabledClasses}
      ${className}
      w-full px-3 py-2 border rounded-lg transition-all duration-200
      ${Icon ? 'pl-10' : 'pl-3'}
      ${isDropdown ? 'pr-10' : showCheckmark && hasValue ? 'pr-10' : 'pr-3'}
      focus:outline-none
      ${isVehicle && hasValue ? 'font-semibold tracking-wider uppercase text-lg' : ''}
    `.trim();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'on-trip':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className={`relative ${containerClassName}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Animated Icon */}
        {Icon && (
          <Icon 
            className={`
              absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500
              ${isVehicle && isFocused ? 'animate-bounce' : ''}
              transition-all duration-300
            `}
          />
        )}

        {/* Main Input Field - FIXED to accept typing */}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || (isVehicle ? 'TYPE VEHICLE NUMBER...' : 'Type here...')}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={getInputClasses()}
        />

        {/* Checkmark or Dropdown Arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {showCheckmark && hasValue && !isDropdown && (
            <Check className="h-5 w-5 text-green-500 animate-in fade-in zoom-in duration-200" />
          )}
          
          {isDropdown && (
            <ChevronDown 
              className={`
                h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200
                ${isDropdownOpen ? 'rotate-180' : ''}
              `}
            />
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown Options - Only show when open and has filtered options */}
      {isDropdown && isDropdownOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={option.id}
              onClick={() => handleDropdownSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                px-4 py-3 cursor-pointer transition-colors duration-150
                ${highlightedIndex === index ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                ${value === option.value ? 'bg-primary-100 dark:bg-primary-900/30' : ''}
                border-b border-gray-100 dark:border-gray-700 last:border-b-0
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </div>
                  {option.subtitle && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.subtitle}
                    </div>
                  )}
                </div>
                {option.status && (
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full ml-2
                    ${getStatusColor(option.status)}
                  `}>
                    {option.status.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedInput;