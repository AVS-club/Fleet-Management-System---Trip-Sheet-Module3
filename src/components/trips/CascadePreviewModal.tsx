import React from 'react';
import Button from '../ui/Button';
import { X } from 'lucide-react';

interface CascadePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  affectedTrips: Array<{
    trip_serial_number: string;
    current_start_km: number;
    new_start_km: number;
  }>;
  loading: boolean;
}

export const CascadePreviewModal: React.FC<CascadePreviewModalProps> = ({
  isOpen,
  onClose,
  onApply,
  affectedTrips,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cascade Correction Preview
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Changing this trip's End KM will affect the following subsequent trips. 
            Their Start KM values will be automatically adjusted to maintain odometer continuity.
          </p>
          
          {affectedTrips.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No subsequent trips will be affected.
            </p>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Affected Trips ({affectedTrips.length}):
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {affectedTrips.map((trip, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {trip.trip_serial_number}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">
                        {trip.current_start_km} km
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {trip.new_start_km} km
                      </span>
                      <span className="text-xs text-gray-400">
                        ({trip.new_start_km > trip.current_start_km ? '+' : ''}
                        {trip.new_start_km - trip.current_start_km})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={loading || affectedTrips.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Applying...' : 'Apply Corrections'}
          </Button>
        </div>
      </div>
    </div>
  );
};