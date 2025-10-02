import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PriorityButtonSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

const PRIORITY_OPTIONS = [
  { 
    value: 'low', 
    label: 'Low', 
    color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
    selectedColor: 'bg-green-600 text-white border-green-600 shadow-lg'
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
    selectedColor: 'bg-yellow-600 text-white border-yellow-600 shadow-lg'
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
    selectedColor: 'bg-orange-600 text-white border-orange-600 shadow-lg'
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    selectedColor: 'bg-red-600 text-white border-red-600 shadow-lg'
  },
];

const PriorityButtonSelector: React.FC<PriorityButtonSelectorProps> = ({
  value,
  onChange,
  error,
  required = false,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Priority
          {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      </label>
      
      <div className="flex gap-2">
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
              'transform hover:scale-105 active:scale-95',
              value === option.value 
                ? option.selectedColor + ' ring-2 ring-offset-2 ring-blue-500' 
                : option.color + ' hover:shadow-md',
              error && 'animate-shake'
            )}
          >
            {value === option.value && (
              <span className="mr-1">✓</span>
            )}
            {option.label}
          </button>
        ))}
      </div>
      
      {error && (
        <p className="text-red-500 text-sm animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default PriorityButtonSelector;
