import React, { useState } from 'react';
import { Calendar, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';

interface MaintenanceDashboardFiltersProps {
  dateRangeFilter: string;
  onDateRangeFilterChange: (filter: string) => void;
  customDateRange: { start: string; end: string };
  onCustomDateRangeChange: (range: { start: string; end: string }) => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
}

const MaintenanceDashboardFilters: React.FC<MaintenanceDashboardFiltersProps> = ({
  dateRangeFilter,
  onDateRangeFilterChange,
  customDateRange,
  onCustomDateRangeChange,
  onExportPDF,
  onExportCSV
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="flex items-center">
              <Select
                options={[
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'last7Days', label: 'Last 7 Days' },
                  { value: 'thisMonth', label: 'This Month' },
                  { value: 'lastMonth', label: 'Last Month' },
                  { value: 'thisYear', label: 'This Year' },
                  { value: 'lastYear', label: 'Last Year' },
                  { value: 'custom', label: 'Custom Range' },
                ]}
                value={dateRangeFilter}
                onChange={(e) => onDateRangeFilterChange(e.target.value)}
                className="w-full"
              />
              <button 
                className="ml-2 text-gray-500 hover:text-gray-700"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          {(dateRangeFilter === 'custom' || isExpanded) && (
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
              <div className="w-full sm:w-auto">
                <Input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => onCustomDateRangeChange({ 
                    ...customDateRange, 
                    start: e.target.value 
                  })}
                  label="Start Date"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
              <span className="hidden sm:block mx-1 mb-2">to</span>
              <div className="w-full sm:w-auto">
                <Input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => onCustomDateRangeChange({ 
                    ...customDateRange, 
                    end: e.target.value 
                  })}
                  label="End Date"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCSV}
            icon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPDF}
            icon={<Download className="h-4 w-4" />}
          >
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboardFilters;