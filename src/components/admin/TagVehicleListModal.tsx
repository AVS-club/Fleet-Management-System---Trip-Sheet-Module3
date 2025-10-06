import React, { useState, useEffect } from 'react';
import { X, Truck, User } from 'lucide-react';
import Button from '../ui/Button';
import { Vehicle } from '../../types';
import { getVehiclesWithTag } from '../../utils/api/tags';
import LoadingScreen from '../LoadingScreen';

interface TagVehicleListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagId: string;
  tagName: string;
  tagColor: string;
}

const TagVehicleListModal: React.FC<TagVehicleListModalProps> = ({
  isOpen,
  onClose,
  tagId,
  tagName,
  tagColor
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && tagId) {
      loadVehicles();
    }
  }, [isOpen, tagId]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await getVehiclesWithTag(tagId);
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tagColor }}
                />
                <h3 className="text-lg font-medium text-gray-900">
                  {tagName} — Vehicles ({vehicles.length})
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Vehicle List */}
            <div className="mt-4">
              {loading ? (
                <div className="py-12">
                  <LoadingScreen isLoading={true} />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No vehicles with this tag</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Truck className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {vehicle.registration_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                      </div>
                      
                      {vehicle.primary_driver && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <User className="h-4 w-4" />
                          <span>{vehicle.primary_driver.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagVehicleListModal;
