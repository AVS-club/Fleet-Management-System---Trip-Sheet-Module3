import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import Select from './Select';
import Input from './Input';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export type DateRangeFilterType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

interface DateRangeFilterProps {
  value: DateRangeFilterType;
  onChange: (value: DateRangeFilterType) => void;
  customDateRange: { start: string; end: string };
  onCustomDateRangeChange: (range: { start: string; end: string }) => void;
  className?: string;
  compact?: boolean;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  customDateRange,
  onCustomDateRangeChange,
  className = '',
  compact = false
}) => {
  const [showCustom, setShowCustom] = useState(value === 'custom');

  useEffect(() => {
    setShowCustom(value === 'custom');
  }, [value]);

  const handleDateRangeChange = (newValue: DateRangeFilterType) => {
    onChange(newValue);
    
    // Set default custom date range when switching to custom
    if (newValue === 'custom' && !customDateRange.start) {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      
      onCustomDateRangeChange({
        start: format(thirtyDaysAgo, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      });
    }
  };

  // Format date range for display
  const getDateRangeText = () => {
    const now = new Date();
    
    switch (value) {
      case 'today':
        return format(now, 'dd MMM yyyy');
      case 'yesterday':
        return format(subDays(now, 1), 'dd MMM yyyy');
      case 'thisWeek':
        return `This Week (${format(now, 'dd MMM')})`;
      case 'lastWeek':
        return `Last Week`;
      case 'thisMonth':
        return `${format(now, 'MMMM yyyy')}`;
      case 'lastMonth':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        return format(lastMonth, 'MMMM yyyy');
      case 'thisYear':
        return format(now, 'yyyy');
      case 'lastYear':
        return `${now.getFullYear() - 1}`;
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          return `${format(new Date(customDateRange.start), 'dd MMM yyyy')} - ${format(new Date(customDateRange.end), 'dd MMM yyyy')}`;
        }
        return 'Custom Range';
      default:
        return 'Select Date Range';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-500 mr-2" />
          <h3 className="text-sm font-medium text-gray-700">Date Range</h3>
        </div>
        {compact && (
          <div className="text-xs text-gray-500">
            {getDateRangeText()}
          </div>
        )}
      </div>
      
      <div className="flex flex-col space-y-3">
        <Select
          options={[
            { value: 'today', label: 'Today' },
            { value: 'yesterday', label: 'Yesterday' },
            { value: 'thisWeek', label: 'This Week' },
            { value: 'lastWeek', label: 'Last Week' },
            { value: 'thisMonth', label: 'This Month' },
            { value: 'lastMonth', label: 'Last Month' },
            { value: 'thisYear', label: 'This Year' },
            { value: 'lastYear', label: 'Last Year' },
            { value: 'custom', label: 'Custom Range' }
          ]}
          value={value}
          onChange={(e) => handleDateRangeChange(e.target.value as DateRangeFilterType)}
          className="w-full"
        />
        
        {showCustom && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              label={compact ? undefined : "Start Date"}
              value={customDateRange.start}
              onChange={(e) => onCustomDateRangeChange({ ...customDateRange, start: e.target.value })}
            />
            <Input
              type="date"
              label={compact ? undefined : "End Date"}
              value={customDateRange.end}
              onChange={(e) => onCustomDateRangeChange({ ...customDateRange, end: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DateRangeFilter;