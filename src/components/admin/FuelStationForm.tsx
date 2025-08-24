import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Fuel, MapPin, Building2, X } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import { FuelStation } from '../../types';

export interface FuelStationFormData {
  name: string;
  address?: string;
  city?: string;
  google_place_id?: string;
  fuel_types: string[];
  prices: Record<string, number>;
}

interface FuelStationFormProps {
  initialData?: Partial<FuelStation>;
  onSubmit: (data: FuelStationFormData & { id?: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const FUEL_TYPE_OPTIONS = [
  { id: 'diesel', label: 'Diesel' },
  { id: 'petrol', label: 'Petrol' },
  { id: 'cng', label: 'CNG' },
  { id: 'lpg', label: 'LPG' }
];

const FuelStationForm: React.FC<FuelStationFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>(
    initialData?.fuel_types || []
  );
  const [fuelPrices, setFuelPrices] = useState<Record<string, number>>(
    initialData?.prices || {}
  );

  const { register, handleSubmit, formState: { errors } } = useForm<FuelStationFormData>({
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      google_place_id: initialData?.google_place_id || '',
      fuel_types: initialData?.fuel_types || [],
      prices: initialData?.prices || {}
    }
  });

  const handleFuelTypeChange = (fuelType: string, checked: boolean) => {
    let newSelectedTypes: string[];
    
    if (checked) {
      newSelectedTypes = [...selectedFuelTypes, fuelType];
      // Initialize price for new fuel type
      if (!fuelPrices[fuelType]) {
        setFuelPrices(prev => ({ ...prev, [fuelType]: 0 }));
      }
    } else {
      newSelectedTypes = selectedFuelTypes.filter(type => type !== fuelType);
      // Remove price for deselected fuel type
      const newPrices = { ...fuelPrices };
      delete newPrices[fuelType];
      setFuelPrices(newPrices);
    }
    
    setSelectedFuelTypes(newSelectedTypes);
  };

  const handlePriceChange = (fuelType: string, price: number) => {
    setFuelPrices(prev => ({
      ...prev,
      [fuelType]: price
    }));
  };

  const handleFormSubmit = (data: FuelStationFormData) => {
    // Filter out fuel types with zero or invalid prices
    const validPrices: Record<string, number> = {};
    selectedFuelTypes.forEach(fuelType => {
      const price = fuelPrices[fuelType];
      if (price && price > 0) {
        validPrices[fuelType] = price;
      }
    });

    // Only include fuel types that have valid prices
    const validFuelTypes = Object.keys(validPrices);

    onSubmit({
      ...data,
      fuel_types: validFuelTypes,
      prices: validPrices,
      id: initialData?.id
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-gray-50 rounded-lg p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {initialData?.id ? 'Edit Fuel Station' : 'Add New Fuel Station'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Station Name"
          icon={<Fuel className="h-4 w-4" />}
          error={errors.name?.message}
          required
          {...register('name', { required: 'Station name is required' })}
        />

        <Input
          label="City"
          icon={<MapPin className="h-4 w-4" />}
          error={errors.city?.message}
          {...register('city')}
        />

        <div className="md:col-span-2">
          <Input
            label="Address"
            icon={<Building2 className="h-4 w-4" />}
            error={errors.address?.message}
            {...register('address')}
          />
        </div>

        <Input
          label="Google Place ID (Optional)"
          icon={<MapPin className="h-4 w-4" />}
          error={errors.google_place_id?.message}
          {...register('google_place_id')}
        />
      </div>

      {/* Fuel Types Selection */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Available Fuel Types & Prices</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FUEL_TYPE_OPTIONS.map(({ id, label }) => (
            <div key={id} className="space-y-2">
              <Checkbox
                label={label}
                checked={selectedFuelTypes.includes(id)}
                onChange={(e) => handleFuelTypeChange(id, e.target.checked)}
              />
              
              {selectedFuelTypes.includes(id) && (
                <Input
                  label={`${label} Price (₹/L)`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={fuelPrices[id] || ''}
                  onChange={(e) => handlePriceChange(id, parseFloat(e.target.value) || 0)}
                  required
                />
              )}
            </div>
          ))}
        </div>
        
        {selectedFuelTypes.length === 0 && (
          <p className="text-sm text-gray-500">Please select at least one fuel type</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          isLoading={isSubmitting}
          disabled={selectedFuelTypes.length === 0}
        >
          {initialData?.id ? 'Update Station' : 'Add Station'}
        </Button>
      </div>
    </form>
  );
};

export default FuelStationForm;