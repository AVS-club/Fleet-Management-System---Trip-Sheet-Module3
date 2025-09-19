import React, { useState } from 'react';
import EnhancedInput from '../ui/EnhancedInput';
import { Truck, User, MapPin, Package, Calendar } from 'lucide-react';

const EnhancedSelectionDemo: React.FC = () => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driver, setDriver] = useState('');
  const [destination, setDestination] = useState('');
  const [material, setMaterial] = useState('');
  const [date, setDate] = useState('');

  const vehicles = [
    { id: 1, label: 'CG04QE5604', value: 'CG04QE5604', subtitle: 'Ashok Leyland Indra V30', status: 'active' },
    { id: 2, label: 'CG04NJ9478', value: 'CG04NJ9478', subtitle: 'Tata Ace Gold', status: 'active' },
    { id: 3, label: 'CG04KL3421', value: 'CG04KL3421', subtitle: 'Mahindra Bolero Pickup', status: 'maintenance' },
  ];

  const drivers = [
    { id: 1, label: 'LOMASH SAHU', value: 'LOMASH SAHU', subtitle: 'DL-1420110012345', status: 'available' },
    { id: 2, label: 'RAJESH KUMAR', value: 'RAJESH KUMAR', subtitle: 'DL-1520110054321', status: 'available' },
    { id: 3, label: 'AMIT SHARMA', value: 'AMIT SHARMA', subtitle: 'DL-1320110098765', status: 'on-trip' },
  ];

  const destinations = [
    { id: 1, label: 'Raipur City', value: 'Raipur City', subtitle: 'Chhattisgarh', status: 'active' },
    { id: 2, label: 'Bilaspur City', value: 'Bilaspur City', subtitle: 'Chhattisgarh', status: 'active' },
    { id: 3, label: 'Rajnandgaon City', value: 'Rajnandgaon City', subtitle: 'Chhattisgarh', status: 'active' },
  ];

  const materials = [
    { id: 1, label: 'Cement', value: 'Cement', subtitle: 'Construction Material', status: 'active' },
    { id: 2, label: 'Steel Rods', value: 'Steel Rods', subtitle: 'Construction Material', status: 'active' },
    { id: 3, label: 'Sand', value: 'Sand', subtitle: 'Construction Material', status: 'active' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Enhanced Selection States Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Smart visual feedback for form inputs without taking extra space
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Trip Form with Enhanced States
            </h2>
            
            <div className="space-y-4">
              <EnhancedInput
                label="Vehicle Number"
                required
                icon={Truck}
                isVehicle
                value={vehicleNumber}
                onChange={setVehicleNumber}
                placeholder="Enter vehicle number..."
                isDropdown
                dropdownOptions={vehicles}
                onDropdownSelect={(option) => setVehicleNumber(option.value)}
                dropdownSearchable
                dropdownPlaceholder="Search vehicles..."
              />

              <EnhancedInput
                label="Driver"
                required
                icon={User}
                value={driver}
                onChange={setDriver}
                placeholder="Select driver..."
                isDropdown
                dropdownOptions={drivers}
                onDropdownSelect={(option) => setDriver(option.value)}
                dropdownSearchable
                dropdownPlaceholder="Search drivers..."
              />

              <EnhancedInput
                label="Destination"
                icon={MapPin}
                value={destination}
                onChange={setDestination}
                placeholder="Enter destination..."
                isDropdown
                dropdownOptions={destinations}
                onDropdownSelect={(option) => setDestination(option.value)}
                dropdownSearchable
                dropdownPlaceholder="Search destinations..."
              />

              <EnhancedInput
                label="Material Type"
                icon={Package}
                value={material}
                onChange={setMaterial}
                placeholder="Select material..."
                isDropdown
                dropdownOptions={materials}
                onDropdownSelect={(option) => setMaterial(option.value)}
                dropdownSearchable
                dropdownPlaceholder="Search materials..."
              />

              <EnhancedInput
                label="Trip Date"
                type="date"
                icon={Calendar}
                value={date}
                onChange={setDate}
                placeholder="Select date..."
              />
            </div>
          </div>
        </div>

        {/* State Guide Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Selection State Guide
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-10 bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Empty State</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Default gray border</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-10 bg-gray-50 dark:bg-gray-800/70 border-2 border-gray-400 dark:border-gray-500 rounded-lg shadow-[0_0_0_4px_rgba(71,85,105,0.1)]"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hover State</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gray glow with subtle shadow</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-12 h-10 bg-white dark:bg-gray-800/80 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-[0_0_0_4px_rgba(59,130,246,0.15)] -translate-y-px"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Focus State</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Blue glow with slight lift</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative w-12 h-10 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/90 border-2 border-green-500/60 dark:border-green-400/60 rounded-lg">
                  <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-green-400 to-green-600 rounded-l-lg"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Locked In State</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Green border with left indicator</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              ✨ Smart Features
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">No Extra Space</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">All effects use shadows and borders</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Clear Visual States</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gray → Blue → Green progression</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Smart Icons</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Icons change color with state</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Micro-animations</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Smooth transitions & feedback</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Vehicle Number Special</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Uppercase, bold, extra spacing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSelectionDemo;
