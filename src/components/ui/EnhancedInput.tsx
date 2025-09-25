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
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasValue = value.trim().length > 0;
  const filteredOptions = dropdownOptions.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (option.subtitle && option.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = isVehicle ? e.target.value.toUpperCase() : e.target.value;
    onChange(newValue);
  };

  const handleDropdownSelect = (option: DropdownOption) => {
    onChange(option.value);
    onDropdownSelect?.(option);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const getInputClasses = () => {
    const baseClasses = 'input-enhanced';
    const vehicleClasses = isVehicle ? 'input-vehicle' : '';
    const errorClasses = error ? 'border-red-500 dark:border-red-400' : '';
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
    
    return `${baseClasses} ${vehicleClasses} ${errorClasses} ${disabledClasses} ${className}`.trim();
  };

  const getIconColor = () => {
    if (error) return 'text-red-500 dark:text-red-400';
    if (hasValue && !isFocused) return 'text-green-500 dark:text-green-400 scale-110';
    if (isFocused) return 'text-blue-500 dark:text-blue-400 scale-110';
    return 'text-gray-500 dark:text-gray-400';
  };

  const getStatusBadgeClasses = (status?: string) => {
    switch (status) {
      case 'active':
      case 'available':
        return 'bg-green-500/20 text-green-400';
      case 'inactive':
      case 'on-trip':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'maintenance':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className={`relative ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Icon */}
        {Icon && (
          <Icon className={`input-icon ${getIconColor()}`} />
        )}

        {/* Input Field */}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (isDropdown) setIsDropdownOpen(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay closing dropdown to allow for option selection
            setTimeout(() => setIsDropdownOpen(false), 200);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={getInputClasses()}
          data-has-value={hasValue}
        />

        {/* Check Mark */}
        {hasValue && showCheckmark && !error && (
          <Check className="input-check" />
        )}

        {/* Dropdown Arrow */}
        {isDropdown && (
          <ChevronDown 
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`} 
          />
        )}

        {/* Left Border Indicator */}
        {hasValue && !error && (
          <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-green-400 to-green-600 rounded-l-lg animate-slideIn" />
        )}

        {/* Error Indicator */}
        {error && (
          <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-red-400 to-red-600 rounded-l-lg" />
        )}
      </div>

      {/* Dropdown */}
      {isDropdown && isDropdownOpen && (
        <div ref={dropdownRef} className="dropdown-enhanced">
          {dropdownSearchable && (
            <div className="dropdown-search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dropdownPlaceholder}
                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm rounded border border-gray-300 dark:border-gray-600 focus:border-blue-400 focus:outline-none"
              />
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <div
                    key={option.id}
                    onClick={() => handleDropdownSelect(option)}
                    className="dropdown-item"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        {OptionIcon && (
                          <OptionIcon className="w-4 h-4 text-gray-400 mr-3" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {option.label}
                          </div>
                          {option.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {option.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      {option.status && (
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClasses(option.status)}`}>
                          {option.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                No options found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default EnhancedInput;
