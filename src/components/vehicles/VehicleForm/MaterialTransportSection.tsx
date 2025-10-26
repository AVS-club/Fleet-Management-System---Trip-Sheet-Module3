/**
 * MaterialTransportSection - Material transport configuration
 *
 * Handles:
 * - Transport type selection
 * - Material type selection
 * - Vehicle capacity
 * - Carrying capacity
 * - Fuel type
 */

import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Vehicle } from '@/types';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { Package, Fuel, Weight } from 'lucide-react';
import { getMaterialTypes, MaterialType } from '../../../utils/materialTypes';

interface MaterialTransportSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  disabled?: boolean;
}

const TRANSPORT_TYPES = ['Goods', 'Passenger', 'Both', 'Other'];
const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric', 'Hybrid'];

export const MaterialTransportSection: React.FC<MaterialTransportSectionProps> = ({
  formMethods,
  disabled = false
}) => {
  const { register, watch, formState: { errors } } = formMethods;
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  useEffect(() => {
    const loadMaterialTypes = async () => {
      const types = await getMaterialTypes();
      setMaterialTypes(types);
    };
    loadMaterialTypes();
  }, []);

  const transportType = watch('transport_type');
  const showMaterialFields = transportType === 'Goods' || transportType === 'Both';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Package className="h-5 w-5 mr-2" />
        Transport & Capacity
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transport Type */}
        <Select
          label="Transport Type"
          options={TRANSPORT_TYPES}
          icon={<Package className="h-4 w-4" />}
          error={errors.transport_type?.message}
          disabled={disabled}
          {...register('transport_type')}
        />

        {/* Fuel Type */}
        <Select
          label="Fuel Type"
          options={FUEL_TYPES}
          icon={<Fuel className="h-4 w-4" />}
          error={errors.fuel_type?.message}
          disabled={disabled}
          {...register('fuel_type')}
        />

        {/* Vehicle Capacity */}
        <Input
          label="Vehicle Capacity (Tonnes)"
          type="number"
          step="0.1"
          placeholder="0.0"
          icon={<Weight className="h-4 w-4" />}
          error={errors.capacity?.message}
          disabled={disabled}
          {...register('capacity', {
            valueAsNumber: true,
            validate: (value) => {
              if (value && value < 0) return 'Capacity cannot be negative';
              return true;
            }
          })}
        />

        {/* Carrying Capacity */}
        <Input
          label="Carrying Capacity (Tonnes)"
          type="number"
          step="0.1"
          placeholder="0.0"
          icon={<Weight className="h-4 w-4" />}
          error={errors.carrying_capacity?.message}
          disabled={disabled}
          {...register('carrying_capacity', {
            valueAsNumber: true,
            validate: (value) => {
              if (value && value < 0) return 'Carrying capacity cannot be negative';
              return true;
            }
          })}
        />
      </div>

      {/* Material Type - Only show for Goods/Both transport types */}
      {showMaterialFields && (
        <div className="mt-4">
          <Select
            label="Primary Material Type"
            options={materialTypes.map(m => m.name)}
            icon={<Package className="h-4 w-4" />}
            error={errors.material_type?.message}
            disabled={disabled}
            placeholder="Select material type..."
            {...register('material_type')}
          />
          <p className="text-sm text-gray-500 mt-1">
            Select the primary material this vehicle transports
          </p>
        </div>
      )}
    </div>
  );
};
