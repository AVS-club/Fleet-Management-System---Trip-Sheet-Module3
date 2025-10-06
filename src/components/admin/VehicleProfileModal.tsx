import React from 'react';
import { Vehicle, Driver } from '@/types';
import { X, Truck, User, FileText, PenTool as Tool, Calendar, Tag as TagIcon } from 'lucide-react';
import { getDriver } from '../../utils/storage';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';

interface VehicleProfileModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleProfileModal: React.FC<VehicleProfileModalProps> = ({ vehicle, onClose }) => {
  const assignedDriver = vehicle.primaryDriverId ? getDriver(vehicle.primaryDriverId) : undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center w-full sm:w-auto">
                <div className="bg-primary-100 rounded-lg p-1.5 sm:p-2">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">{vehicle.registration_number}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none mt-1 sm:mt-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900">Vehicle Details</h4>
                <dl className="mt-1 sm:mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs sm:text-sm text-gray-500">Type</dt>
                    <dd className="text-xs sm:text-sm font-medium capitalize">{vehicle.type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-gray-500">Year</dt>
                    <dd className="text-xs sm:text-sm font-medium">{vehicle.year}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-gray-500">Fuel Type</dt>
                    <dd className="text-xs sm:text-sm font-medium capitalize">{vehicle.fuel_type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm text-gray-500">Current Odometer</dt>
                    <dd className="text-xs sm:text-sm font-medium">{vehicle.current_odometer.toLocaleString()} km</dd>
                  </div>
                </dl>
              </div>

              {assignedDriver && (
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900">Associated Driver</h4>
                  <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg flex items-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">{assignedDriver.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{assignedDriver.licenseNumber}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Tags */}
              {vehicle.tags && vehicle.tags.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Vehicle Tags
                  </h4>
                  <div className="mt-1 sm:mt-2">
                    <VehicleTagBadges 
                      tags={vehicle.tags} 
                      readOnly 
                      size="sm"
                      maxDisplay={3}
                    />
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900">Documents</h4>
                <div className="mt-1 sm:mt-2 space-y-1 sm:space-y-2">
                  {vehicle.rcCopy && (
                    <div className="flex items-center p-1.5 sm:p-2 bg-gray-50 rounded-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <span className="ml-2 text-xs sm:text-sm text-gray-900">RC Copy</span>
                    </div>
                  )}
                  {vehicle.insuranceDocument && (
                    <div className="flex items-center p-1.5 sm:p-2 bg-gray-50 rounded-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <span className="ml-2 text-xs sm:text-sm text-gray-900">Insurance Document</span>
                    </div>
                  )}
                  {vehicle.permitDocument && (
                    <div className="flex items-center p-1.5 sm:p-2 bg-gray-50 rounded-lg">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <span className="ml-2 text-xs sm:text-sm text-gray-900">Permit Document</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900">Maintenance Summary</h4>
                <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Tool className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <span className="ml-2 text-xs sm:text-sm text-gray-900">Last Service</span>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500">2 months ago</span>
                  </div>
                  <div className="mt-1 sm:mt-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <span className="ml-2 text-xs sm:text-sm text-gray-900">Next Service Due</span>
                    </div>
                    <span className="text-xs sm:text-sm text-warning-600">In 500 km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleProfileModal;