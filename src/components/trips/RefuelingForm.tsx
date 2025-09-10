import React from 'react';
import { Refueling } from '@/types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Fuel, MapPin, IndianRupee, Plus, Trash2, Calculator } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RefuelingFormProps {
  refuelings: Refueling[];
  onChange: (refuelings: Refueling[]) => void;
  disabled?: boolean;
}

const RefuelingForm: React.FC<RefuelingFormProps> = ({
  refuelings,
  onChange,
  disabled = false
}) => {
  const addRefueling = () => {
    const newRefueling: Refueling = {
      location: '',
      fuel_quantity: 0,
      fuel_rate_per_liter: 0,
      total_fuel_cost: 0
    };
    onChange([...refuelings, newRefueling]);
  };

  const removeRefueling = (index: number) => {
    const updated = refuelings.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateRefueling = (index: number, field: keyof Refueling, value: any) => {
    const updated = [...refuelings];
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    // Auto-calculate total cost when quantity or rate changes
    if (field === 'fuel_quantity' || field === 'fuel_rate_per_liter') {
      const quantity = field === 'fuel_quantity' ? value : updated[index].fuel_quantity;
      const rate = field === 'fuel_rate_per_liter' ? value : updated[index].fuel_rate_per_liter;
      updated[index].total_fuel_cost = quantity * rate;
    }

    onChange(updated);
  };

  // Calculate totals
  const totals = refuelings.reduce((acc, ref) => ({
    quantity: acc.quantity + (ref.fuel_quantity || 0),
    cost: acc.cost + (ref.total_fuel_cost || 0)
  }), { quantity: 0, cost: 0 });

  return (
    <div className="space-y-3">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary-500" />
          Refueling Details
          {totals.quantity > 0 && (
            <span className="text-xs text-gray-500">
              (Total: {totals.quantity}L • ₹{totals.cost.toFixed(2)})
            </span>
          )}
        </h4>
        <Button
          type="button"
          onClick={addRefueling}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Refueling
        </Button>
      </div>

      {/* Refueling entries */}
      <div className="space-y-3">
        {refuelings.map((refueling, index) => (
            <div
              key={index}
              className={cn(
                "relative p-3 rounded-lg border",
                "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                "transition-all duration-200"
              )}
            >
              {/* Remove button - only show if not the first entry */}
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeRefueling(index)}
                  disabled={disabled}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-error-500 transition-colors"
                  title="Remove refueling"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Refueling number badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1 text-xs text-gray-500">
                <Fuel className="h-3 w-3" />
                #{index + 1}
              </div>

              {/* Form fields in compact grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                {/* Location */}
                <div className="md:col-span-2">
                  <Input
                    label="Refueling Location"
                    placeholder="e.g., HP Petrol Pump, Raipur"
                    icon={<MapPin className="h-4 w-4" />}
                    value={refueling.location}
                    onChange={(e) => updateRefueling(index, 'location', e.target.value)}
                    disabled={disabled}
                    inputSize="sm"
                    required
                  />
                </div>

                {/* Fuel Quantity */}
                <Input
                  label="Fuel Quantity (L)"
                  type="number"
                  step="0.01"
                  icon={<Fuel className="h-4 w-4" />}
                  value={refueling.fuel_quantity || ''}
                  onChange={(e) => updateRefueling(index, 'fuel_quantity', parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  inputSize="sm"
                  required
                />

                {/* Fuel Rate */}
                <Input
                  label="Rate per Liter (₹)"
                  type="number"
                  step="0.01"
                  icon={<IndianRupee className="h-4 w-4" />}
                  value={refueling.fuel_rate_per_liter || ''}
                  onChange={(e) => updateRefueling(index, 'fuel_rate_per_liter', parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  inputSize="sm"
                  required
                />

                {/* Total Cost (auto-calculated) */}
                <div className="md:col-span-2">
                  <Input
                    label="Total Fuel Cost (₹)"
                    type="number"
                    step="0.01"
                    icon={<Calculator className="h-4 w-4" />}
                    value={refueling.total_fuel_cost || ''}
                    disabled
                    inputSize="sm"
                    className="bg-gray-100 dark:bg-gray-900"
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default RefuelingForm;