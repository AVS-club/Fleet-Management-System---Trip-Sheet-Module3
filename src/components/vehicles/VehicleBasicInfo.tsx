import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Vehicle } from '../../types';
import { Truck, Calendar, Gauge, Fuel } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';

const VehicleBasicInfo: React.FC = () => {
  const { register, formState: { errors } } = useFormContext<Vehicle>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Registration Number */}
        <div>
          <Input
            label="Registration Number"
            {...register('registration_number', { 
              required: 'Registration number is required',
              pattern: {
                value: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
                message: 'Invalid registration number format'
              }
            })}
            error={errors.registration_number?.message}
            placeholder="e.g., KA01AB1234"
          />
        </div>

        {/* Vehicle Type */}
        <div>
          <Select
            label="Vehicle Type"
            {...register('type', { required: 'Vehicle type is required' })}
            error={errors.type?.message}
          >
            <option value="">Select vehicle type</option>
            <option value="truck">Truck</option>
            <option value="bus">Bus</option>
            <option value="van">Van</option>
            <option value="car">Car</option>
          </Select>
        </div>

        {/* Make */}
        <div>
          <Input
            label="Make"
            {...register('make', { required: 'Make is required' })}
            error={errors.make?.message}
            placeholder="e.g., Tata, Ashok Leyland"
          />
        </div>

        {/* Model */}
        <div>
          <Input
            label="Model"
            {...register('model', { required: 'Model is required' })}
            error={errors.model?.message}
            placeholder="e.g., Ace, 407"
          />
        </div>

        {/* Year */}
        <div>
          <Input
            label="Manufacturing Year"
            type="number"
            {...register('year', { 
              required: 'Year is required',
              min: { value: 1990, message: 'Year must be 1990 or later' },
              max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' }
            })}
            error={errors.year?.message}
            placeholder="2020"
          />
        </div>

        {/* Fuel Type */}
        <div>
          <Select
            label="Fuel Type"
            {...register('fuel_type', { required: 'Fuel type is required' })}
            error={errors.fuel_type?.message}
          >
            <option value="">Select fuel type</option>
            <option value="diesel">Diesel</option>
            <option value="petrol">Petrol</option>
            <option value="cng">CNG</option>
            <option value="electric">Electric</option>
          </Select>
        </div>

        {/* Current Odometer */}
        <div>
          <Input
            label="Current Odometer Reading"
            type="number"
            {...register('current_odometer', { 
              required: 'Current odometer reading is required',
              min: { value: 0, message: 'Odometer reading cannot be negative' }
            })}
            error={errors.current_odometer?.message}
            placeholder="0"
          />
        </div>

        {/* Status */}
        <div>
          <Select
            label="Status"
            {...register('status', { required: 'Status is required' })}
            error={errors.status?.message}
          >
            <option value="">Select status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="retired">Retired</option>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default VehicleBasicInfo;
