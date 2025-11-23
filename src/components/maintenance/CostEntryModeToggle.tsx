import React, { useState, useEffect } from 'react';
import { DollarSign, Table } from 'lucide-react';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CostEntryModeToggle');

export type CostEntryMode = 'quick' | 'detailed';

interface CostEntryModeToggleProps {
  value: CostEntryMode;
  onChange: (mode: CostEntryMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Simplified toggle component for switching between quick and detailed cost entry
 * Saves preference to localStorage
 */
const CostEntryModeToggle: React.FC<CostEntryModeToggleProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const STORAGE_KEY = 'maintenance_cost_entry_mode_preference';

  // Load saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['quick', 'detailed'].includes(saved)) {
        logger.debug(`Loaded saved cost entry mode preference: ${saved}`);
      }
    } catch (error) {
      logger.warn('Could not load cost entry mode preference:', error);
    }
  }, []);

  // Handle mode change
  const handleModeChange = (newMode: CostEntryMode) => {
    if (disabled) return;

    onChange(newMode);
    
    // Save preference to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
      logger.debug(`Saved cost entry mode preference: ${newMode}`);
    } catch (error) {
      logger.warn('Could not save cost entry mode preference:', error);
    }
  };

  return (
    <div className={`inline-flex rounded-lg border border-gray-300 bg-white shadow-sm ${className}`}>
      {/* Quick Mode */}
      <button
        type="button"
        onClick={() => handleModeChange('quick')}
        disabled={disabled}
        className={`
          px-3 py-2 text-xs font-medium rounded-l-lg transition-colors
          flex items-center space-x-1.5
          ${
            value === 'quick'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          border-r border-gray-300
        `}
        title="Quick Entry - Just enter total amount"
      >
        <DollarSign className="h-3.5 w-3.5" />
        <span>Quick</span>
      </button>

      {/* Detailed Mode (Grid with line items) */}
      <button
        type="button"
        onClick={() => handleModeChange('detailed')}
        disabled={disabled}
        className={`
          px-3 py-2 text-xs font-medium rounded-r-lg transition-colors
          flex items-center space-x-1.5
          ${
            value === 'detailed'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Detailed - Break down cost into line items"
      >
        <Table className="h-3.5 w-3.5" />
        <span>Detailed</span>
      </button>
    </div>
  );
};

/**
 * Get the default cost entry mode
 */
export const getDefaultCostEntryMode = (): CostEntryMode => {
  // Check localStorage first
  try {
    const saved = localStorage.getItem('maintenance_cost_entry_mode_preference');
    if (saved && ['quick', 'detailed'].includes(saved)) {
      return saved as CostEntryMode;
    }
  } catch (error) {
    logger.warn('Could not load saved preference:', error);
  }

  // Default to quick for everyone
  return 'quick';
};

export default CostEntryModeToggle;

