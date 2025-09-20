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
    selectedColor: 'bg-green-200 text-green-800 border-green-300'
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
    selectedColor: 'bg-yellow-200 text-yellow-800 border-yellow-300'
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
    selectedColor: 'bg-orange-200 text-orange-800 border-orange-300'
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
    selectedColor: 'bg-red-200 text-red-800 border-red-300'
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
              'px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
              'transform hover:scale-105 active:scale-95',
              value === option.value 
                ? option.selectedColor 
                : option.color,
              error && 'animate-shake'
            )}
          >
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
