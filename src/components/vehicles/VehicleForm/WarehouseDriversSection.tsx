/**
 * WarehouseDriversSection - Warehouse assignment and default drivers
 *
 * Handles:
 * - Warehouse assignment (if applicable)
 * - Default driver 1 selection
 * - Default driver 2 selection
 */

import React, { useState, useEffect } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Vehicle, Driver } from '@/types';
import Select from '../../ui/Select';
import { MapPin, Users } from 'lucide-react';
import { getDrivers } from '../../../utils/api/drivers';
import { supabase } from '../../../utils/supabaseClient';

interface WarehouseDriversSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  disabled?: boolean;
}

interface Warehouse {
  id: string;
  name: string;
}

export const WarehouseDriversSection: React.FC<WarehouseDriversSectionProps> = ({
  formMethods,
  disabled = false
}) => {
  const { control, formState: { errors } } = formMethods;
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Load warehouses
      try {
        const { data: warehousesData } = await supabase
          .from('warehouses')
          .select('id, name')
          .order('name');

        if (warehousesData) {
          setWarehouses(warehousesData);
        }
      } catch (error) {
      }

      // Load drivers
      try {
        const drivers = await getDrivers();
        setAvailableDrivers(drivers);
      } catch (error) {
      }
    };

    loadData();
  }, []);

  const driverOptions = availableDrivers.map(d => ({
    value: d.id,
    label: `${d.name} ${d.license_number ? `(${d.license_number})` : ''}`
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <MapPin className="h-5 w-5 mr-2" />
        Warehouse & Drivers
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {/* Warehouse Assignment */}
        <Controller
          name="warehouse_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Assigned Warehouse (Optional)"
              options={warehouses.map(w => ({ value: w.id, label: w.name }))}
              value={field.value || ''}
              onChange={field.onChange}
              icon={<MapPin className="h-4 w-4" />}
              error={errors.warehouse_id?.message as string}
              disabled={disabled}
              placeholder="Select warehouse..."
            />
          )}
        />

        <p className="text-sm text-gray-500 -mt-2">
          Assign this vehicle to a specific warehouse location
        </p>

        {/* Default Driver 1 */}
        <Controller
          name="default_driver_1"
          control={control}
          render={({ field }) => (
            <Select
              label="Default Driver 1 (Optional)"
              options={driverOptions}
              value={field.value || ''}
              onChange={field.onChange}
              icon={<Users className="h-4 w-4" />}
              error={errors.default_driver_1?.message as string}
              disabled={disabled}
              placeholder="Select primary driver..."
            />
          )}
        />

        {/* Default Driver 2 */}
        <Controller
          name="default_driver_2"
          control={control}
          render={({ field }) => (
            <Select
              label="Default Driver 2 (Optional)"
              options={driverOptions}
              value={field.value || ''}
              onChange={field.onChange}
              icon={<Users className="h-4 w-4" />}
              error={errors.default_driver_2?.message as string}
              disabled={disabled}
              placeholder="Select secondary driver..."
            />
          )}
        />

        <p className="text-sm text-gray-500 -mt-2">
          Set default drivers for this vehicle to pre-fill trip forms
        </p>
      </div>
    </div>
  );
};
