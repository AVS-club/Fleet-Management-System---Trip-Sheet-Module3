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
    color: 'priority-button low',
    selectedColor: 'priority-button low active'
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'priority-button medium',
    selectedColor: 'priority-button medium active'
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'priority-button high',
    selectedColor: 'priority-button high active'
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    color: 'priority-button critical',
    selectedColor: 'priority-button critical active'
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
      <label className="form-label block text-gray-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Priority
          {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      </label>
      
      <div className="priority-buttons">
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              value === option.value ? option.selectedColor : option.color,
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
        <p className="text-red-500 text-small animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default PriorityButtonSelector;
