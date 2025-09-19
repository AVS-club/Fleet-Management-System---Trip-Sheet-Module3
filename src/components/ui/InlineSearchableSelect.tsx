import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Search, Check, Loader2 } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

interface InlineSearchableSelectProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: React.ReactNode;
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  error?: string;
  clearable?: boolean;
  searchPlaceholder?: string;
  loading?: boolean;
  renderOption?: (option: Option) => React.ReactNode;
  customHeader?: React.ReactNode;
  className?: string;
}

const InlineSearchableSelect: React.FC<InlineSearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  required = false,
  multiple = false,
  disabled = false,
  error,
  clearable = true,
  searchPlaceholder = 'Search...',
  loading = false,
  renderOption,
  customHeader,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option => {
      // Skip group headers
      if (option.isGroupHeader) return true;
      
      // Search in label and any string properties
      return Object.entries(option).some(([key, val]) => {
        if (typeof val === 'string') {
          return val.toLowerCase().includes(query);
        }
        return false;
      });
    });
  }, [options, searchQuery]);

  // Get selected labels for display
  const getSelectedDisplay = () => {
    if (multiple) {
      const values = value as string[];
      if (!values || values.length === 0) return placeholder;
      
      const selectedOptions = options.filter(o => values.includes(o.value));
      if (selectedOptions.length === 0) return placeholder;
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      
      return `${selectedOptions.length} selected`;
    } else {
      const selectedOption = options.find(o => o.value === value);
      return selectedOption ? selectedOption.label : placeholder;
    }
  };

  // Handle option selection
  const handleSelect = (optionValue: string, option: Option) => {
    if (option.isGroupHeader || option.disabled) return;
    
    if (multiple) {
      const values = (value as string[]) || [];
      const newValues = values.includes(optionValue)
        ? values.filter(v => v !== optionValue)
        : [...values, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const navigableOptions = filteredOptions.filter(o => !o.isGroupHeader && !o.disabled);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const currentIndex = navigableOptions.findIndex(o => 
            filteredOptions.indexOf(o) === prev
          );
          const nextIndex = currentIndex < navigableOptions.length - 1 ? currentIndex + 1 : currentIndex;
          return filteredOptions.indexOf(navigableOptions[nextIndex]);
        });
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const currentIndex = navigableOptions.findIndex(o => 
            filteredOptions.indexOf(o) === prev
          );
          const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
          return filteredOptions.indexOf(navigableOptions[nextIndex]);
        });
        break;
      
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          const option = filteredOptions[highlightedIndex];
          if (!option.isGroupHeader && !option.disabled) {
            handleSelect(option.value, option);
          }
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const options = optionsRef.current.querySelectorAll('[data-option-index]');
      const highlighted = options[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return (value as string[])?.includes(optionValue) || false;
    }
    return value === optionValue;
  };

  return (
    <div className={`${className}`} ref={dropdownRef}>
      {label && (
        <div className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </div>
      )}

      <div className="relative">
        {/* Main selector */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          tabIndex={disabled ? -1 : 0}
          className={`
            min-h-[42px] px-3 py-2 border rounded-lg bg-white cursor-pointer
            transition-all duration-150
            ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'hover:border-primary-400'}
            ${isOpen ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-300'}
            ${error ? 'border-red-500' : ''}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`
              flex-1 truncate
              ${!value || (Array.isArray(value) && value.length === 0) ? 'text-gray-400' : 'text-gray-900'}
            `}>
              {getSelectedDisplay()}
            </span>
            
            <div className="flex items-center gap-1">
              {clearable && value && (Array.isArray(value) ? value.length > 0 : true) && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              <ChevronDown className={`
                h-4 w-4 text-gray-400 transition-transform
                ${isOpen ? 'rotate-180' : ''}
              `} />
            </div>
          </div>
        </div>

        {/* Dropdown with inline search */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            {/* Custom Header */}
            {customHeader}
            
            {/* Inline Search Bar */}
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md 
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options List */}
            <div ref={optionsRef} className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-600 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Loading...</p>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const selected = isSelected(option.value);
                  const highlighted = index === highlightedIndex;
                  
                  // Custom render if provided
                  if (renderOption) {
                    return (
                      <div
                        key={option.value}
                        data-option-index={index}
                        className={`
                          cursor-pointer transition-colors
                          ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                          ${highlighted ? 'bg-gray-50' : ''}
                          ${selected && !option.isGroupHeader ? 'bg-primary-50' : ''}
                          ${!option.disabled && !option.isGroupHeader && !highlighted ? 'hover:bg-gray-50' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(option.value, option);
                        }}
                        onMouseEnter={() => !option.isGroupHeader && setHighlightedIndex(index)}
                      >
                        {renderOption(option)}
                      </div>
                    );
                  }
                  
                  // Default render
                  if (option.isGroupHeader) {
                    return (
                      <div 
                        key={option.value}
                        className="px-3 py-2 bg-gray-50 border-t border-gray-200 sticky top-0"
                      >
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {option.label}
                        </span>
                      </div>
                    );
                  }
                  
                  return (
                    <div
                      key={option.value}
                      data-option-index={index}
                      className={`
                        px-3 py-2 cursor-pointer transition-colors
                        ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${highlighted ? 'bg-gray-50' : ''}
                        ${selected ? 'bg-primary-50' : ''}
                        ${!option.disabled && !highlighted && !selected ? 'hover:bg-gray-50' : ''}
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(option.value, option);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {option.label}
                          </div>
                        </div>
                        
                        {selected && (
                          <Check className="h-4 w-4 text-primary-600 ml-2" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with count */}
            {multiple && filteredOptions.length > 0 && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                {(value as string[])?.length || 0} of {options.filter(o => !o.isGroupHeader).length} selected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default InlineSearchableSelect;
