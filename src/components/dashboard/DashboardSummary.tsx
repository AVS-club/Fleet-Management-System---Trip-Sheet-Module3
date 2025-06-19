import React from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

interface DashboardSummaryProps {
  earliestTripDate?: Date;
  latestTripDate?: Date;
  vehicleCount: number;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  earliestTripDate,
  latestTripDate,
  vehicleCount
}) => {
  if (!earliestTripDate || !latestTripDate) {
    return null;
  }

  return (
    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-md">
      <Calendar className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
      <span>
        Tracking from: {format(earliestTripDate, 'dd MMM yyyy')} to {format(latestTripDate, 'dd MMM yyyy')} 
        across {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
      </span>
    </div>
  );
};

export default DashboardSummary;