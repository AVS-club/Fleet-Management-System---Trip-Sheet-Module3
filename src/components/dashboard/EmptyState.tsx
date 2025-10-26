import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, FileText, MapPin, Info } from 'lucide-react';
import Button from '../ui/Button';

interface EmptyStateProps {
  type: 'vehicles' | 'trips' | 'mileage' | 'generic';
  message?: string;
  showAction?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  type, 
  message, 
  showAction = true 
}) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (type) {
      case 'vehicles':
        return <Truck className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />;
      case 'trips':
        return <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />;
      case 'mileage':
        return <MapPin className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />;
      default:
        return <Info className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'vehicles':
        return "Start by adding your first vehicle to unlock insights and tracking features.";
      case 'trips':
        return "Record your first trip to begin tracking mileage, expenses, and performance.";
      case 'mileage':
        return "Insights will appear after trips with refueling are logged.";
      default:
        return "No data available yet. Start by adding some data to see insights.";
    }
  };

  const getActionButton = () => {
    if (!showAction) return null;
    
    switch (type) {
      case 'vehicles':
        return (
          <Button 
            onClick={() => navigate('/vehicles')}
            className="mt-4"
          >
            + Add Vehicle
          </Button>
        );
      case 'trips':
        return (
          <Button 
            onClick={() => navigate('/trips')}
            className="mt-4"
          >
            + Record Trip
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {getIcon()}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No {type === 'generic' ? 'data' : type} available
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        {message || getDefaultMessage()}
      </p>
      {getActionButton()}
    </div>
  );
};

export default EmptyState;