/**
 * BasicInfoSection - Vehicle registration and basic details
 *
 * Handles:
 * - Registration number
 * - Make, Model, Year
 * - Color
 * - Engine & Chassis number
 * - Current odometer
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Vehicle } from '@/types';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { Truck, Calendar, Hash, Palette, Gauge } from 'lucide-react';

interface BasicInfoSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  disabled?: boolean;
}

const VEHICLE_MAKES = [
  'Tata', 'Ashok Leyland', 'Eicher', 'Mahindra', 'Bharat Benz',
  'Maruti Suzuki', 'Hyundai', 'Honda', 'Toyota', 'Ford', 'Other'
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => (CURRENT_YEAR - i).toString());

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formMethods,
  disabled = false
}) => {
  const { register, formState: { errors } } = formMethods;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Truck className="h-5 w-5 mr-2" />
        Basic Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Registration Number */}
        <Input
          label="Registration Number"
          placeholder="CG04AB1234"
          icon={<Truck className="h-4 w-4" />}
          hideIconWhenFocused={true}
          error={errors.registration_number?.message}
          required
          disabled={disabled}
          {...register('registration_number', {
            required: 'Registration number is required',
            pattern: {
              value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{1,4}$/i,
              message: 'Invalid registration number format'
            }
          })}
        />

        {/* Make */}
        <Select
          label="Make"
          options={VEHICLE_MAKES}
          error={errors.make?.message}
          required
          disabled={disabled}
          {...register('make', { required: 'Make is required' })}
        />

        {/* Model */}
        <Input
          label="Model"
          placeholder="e.g., LPT 1109"
          error={errors.model?.message}
          required
          disabled={disabled}
          {...register('model', { required: 'Model is required' })}
        />

        {/* Year */}
        <Select
          label="Year of Manufacture"
          options={YEARS}
          error={errors.year?.message}
          icon={<Calendar className="h-4 w-4" />}
          disabled={disabled}
          {...register('year')}
        />

        {/* Color */}
        <Input
          label="Color"
          placeholder="e.g., White"
          icon={<Palette className="h-4 w-4" />}
          hideIconWhenFocused={true}
          error={errors.color?.message}
          disabled={disabled}
          {...register('color')}
        />

        {/* Engine Number */}
        <Input
          label="Engine Number"
          placeholder="Enter engine number"
          icon={<Hash className="h-4 w-4" />}
          hideIconWhenFocused={true}
          error={errors.engine_number?.message}
          disabled={disabled}
          {...register('engine_number')}
        />

        {/* Chassis Number */}
        <Input
          label="Chassis Number"
          placeholder="Enter chassis number"
          icon={<Hash className="h-4 w-4" />}
          hideIconWhenFocused={true}
          error={errors.chassis_number?.message}
          disabled={disabled}
          {...register('chassis_number')}
        />

        {/* Current Odometer */}
        <Input
          label="Current Odometer (km)"
          type="number"
          placeholder="0"
          icon={<Gauge className="h-4 w-4" />}
          hideIconWhenFocused={true}
          error={errors.current_odometer?.message}
          disabled={disabled}
          {...register('current_odometer', {
            valueAsNumber: true,
            validate: (value) => {
              if (value && value < 0) return 'Odometer cannot be negative';
              return true;
            }
          })}
        />
      </div>
    </div>
  );
};
