import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, LANGUAGES, LanguageCode } from '../../utils/languageContext';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'minimal' | 'full';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '',
  variant = 'full' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, setLanguage } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center ${
          variant === 'minimal'
          ? 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md px-2 py-1'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="h-4 w-4 mr-1" />
        <span className={variant === 'minimal' ? 'sr-only' : ''}>
          {LANGUAGES[currentLanguage]}
        </span>
        <ChevronDown className="h-3 w-3 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg border dark:border-gray-700 focus:outline-none">
          <div className="py-1">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <button
                key={code}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  currentLanguage === code
                    ? 'bg-gray-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  setLanguage(code as LanguageCode);
                  setIsOpen(false);
                }}
              >
                <Check 
                  className={`h-4 w-4 mr-2 ${
                    currentLanguage === code 
                      ? 'opacity-100 text-primary-600 dark:text-primary-400' 
                      : 'opacity-0'
                  }`} 
                />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;