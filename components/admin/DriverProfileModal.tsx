import React from 'react';
import { Driver, Vehicle } from '../../types';
import { X, User, Truck, FileText, Calendar } from 'lucide-react';
import { getVehicle } from '../../utils/storage';

interface DriverProfileModalProps {
  driver: Driver;
  onClose: () => void;
}

const DriverProfileModal: React.FC<DriverProfileModalProps> = ({ driver, onClose }) => {
  const primaryVehicle = driver.primaryVehicleId ? getVehicle(driver.primaryVehicleId) : undefined;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className="bg-primary-100 rounded-lg p-2">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{driver.name}</h3>
                  <p className="text-sm text-gray-500">{driver.licenseNumber}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Driver Details</h4>
                <dl className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Experience</dt>
                    <dd className="text-sm font-medium text-gray-900">{driver.experience} years</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Join Date</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(driver.joinDate).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Contact</dt>
                    <dd className="text-sm font-medium text-gray-900">{driver.contactNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Email</dt>
                    <dd className="text-sm font-medium text-gray-900">{driver.email || '-'}</dd>
                  </div>
                </dl>
              </div>

              {primaryVehicle && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Primary Vehicle</h4>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{primaryVehicle.registrationNumber}</p>
                      <p className="text-sm text-gray-500">
                        {primaryVehicle.make} {primaryVehicle.model}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-900">Documents</h4>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-900">Driver's License</span>
                    <span className="ml-auto text-sm text-gray-500">Valid till 2025</span>
                  </div>
                  <div className="flex items-center p-2 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="ml-2 text-sm text-gray-900">Aadhar Card</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <span className="ml-2 text-sm text-gray-900">Last Trip</span>
                      <span className="ml-auto text-sm text-gray-500">2 days ago</span>
                    </div>
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

export default DriverProfileModal;