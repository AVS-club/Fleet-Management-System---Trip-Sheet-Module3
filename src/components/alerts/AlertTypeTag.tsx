import React from 'react';
import { BarChart2, AlertTriangle, TrendingDown, Fuel, FileX } from 'lucide-react';

interface AlertTypeTagProps {
  type: string;
  className?: string;
}

const AlertTypeTag: React.FC<AlertTypeTagProps> = ({ type, className }) => {
  const getTypeInfo = (type: string): { 
    label: string; 
    icon: React.ReactNode; 
    colorClass: string;
  } => {
    switch (type) {
      case 'route_deviation':
        return { 
          label: 'Route Deviation', 
          icon: <TrendingDown className="h-3 w-3" />, 
          colorClass: 'bg-blue-100 text-blue-800' 
        };
      case 'fuel_anomaly':
        return { 
          label: 'Fuel Anomaly', 
          icon: <Fuel className="h-3 w-3" />, 
          colorClass: 'bg-amber-100 text-amber-800' 
        };
      case 'documentation':
        return { 
          label: 'Documentation', 
          icon: <FileX className="h-3 w-3" />, 
          colorClass: 'bg-purple-100 text-purple-800' 
        };
      case 'maintenance':
        return { 
          label: 'Maintenance', 
          icon: <AlertTriangle className="h-3 w-3" />, 
          colorClass: 'bg-red-100 text-red-800' 
        };
      default:
        return { 
          label: type.replace('_', ' '), 
          icon: <BarChart2 className="h-3 w-3" />, 
          colorClass: 'bg-gray-100 text-gray-800' 
        };
    }
  };

  const { label, icon, colorClass } = getTypeInfo(type);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {icon}
      <span className="ml-1 capitalize">{label}</span>
    </span>
  );
};

export default AlertTypeTag;