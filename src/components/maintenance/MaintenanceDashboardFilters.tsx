import React from 'react';
import { Calendar, Download } from 'lucide-react';
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
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-3 overflow-x-auto min-w-0">
          {/* Date Range Selector */}
          <div className="flex-shrink-0 w-40">
            <Select
              options={[
                { value: 'allTime', label: 'All Time' },
                { value: 'thisMonth', label: 'This Month' },
                { value: 'lastMonth', label: 'Last Month' },
                { value: 'thisYear', label: 'This Year' },
                { value: 'lastYear', label: 'Last Year' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              value={dateRangeFilter}
              onChange={(e) => onDateRangeFilterChange(e.target.value)}
              inputSize="sm"
            />
          </div>

          {/* Custom Date Inputs - Only show when Custom is selected */}
          {dateRangeFilter === 'custom' && (
            <>
              <div className="flex-shrink-0 w-36">
                <Input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => onCustomDateRangeChange({ 
                    ...customDateRange, 
                    start: e.target.value 
                  })}
                  inputSize="sm"
                  placeholder="Start Date"
                />
              </div>
              
              <span className="text-gray-400 text-sm flex-shrink-0">to</span>
              
              <div className="flex-shrink-0 w-36">
                <Input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => onCustomDateRangeChange({ 
                    ...customDateRange, 
                    end: e.target.value 
                  })}
                  inputSize="sm"
                  placeholder="End Date"
                />
              </div>
            </>
          )}

          {/* Spacer to push export buttons to the right */}
          <div className="flex-grow"></div>
          
          {/* Export Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              inputSize="sm"
              onClick={onExportCSV}
              icon={<Download className="h-4 w-4" />}
              title="Export CSV"
              className="px-2"
            >
              CSV
            </Button>
            <Button
              variant="outline"
              inputSize="sm"
              onClick={onExportPDF}
              icon={<Download className="h-4 w-4" />}
              title="Export PDF"
              className="px-2"
            >
              PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboardFilters;