import React from 'react';
import { X, Medal } from 'lucide-react';

interface TopDriver {
  id: string;
  name: string;
  mileage: number;
}

interface TopDriversModalProps {
  isOpen: boolean;
  onClose: () => void;
  topDrivers: TopDriver[];
}

const TopDriversModal: React.FC<TopDriversModalProps> = ({
  isOpen,
  onClose,
  topDrivers
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Medal className="h-5 w-5 text-yellow-500 mr-2" />
            Top Drivers by Performance
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {topDrivers.length > 0 ? (
            <ol className="space-y-3">
              {topDrivers.map((driver, index) => (
                <li key={driver.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-bold text-lg text-gray-500 mr-4">{index + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{driver.name}</p>
                    <p className="text-primary-600 font-medium">{driver.mileage.toFixed(2)} km/L</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-center py-6 text-gray-500">No driver performance data available.</p>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Performance is calculated based on average fuel efficiency (km/L) from trips this month.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TopDriversModal;