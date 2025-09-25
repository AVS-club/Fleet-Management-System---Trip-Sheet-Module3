import React, { useState } from 'react';
import { Refueling } from '@/types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import FuelRateSelector from './FuelRateSelector';
import { uploadFuelBill } from '../../utils/supabaseStorage';
import { Fuel, MapPin, Plus, Trash2, Calculator, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toast } from 'react-toastify';

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
  const [uploadStates, setUploadStates] = useState<{ [key: number]: { uploading: boolean } }>({});
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

  const updateRefueling = (index: number, field: keyof Refueling, value: any, location?: string) => {
    const updated = [...refuelings];
    
    // Store the new value
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    // Store location with the refueling if provided
    if (location && field === 'fuel_rate_per_liter') {
      updated[index].location = location;
    }

    // Auto-calculate fuel quantity when total cost or rate changes
    if (field === 'total_fuel_cost' || field === 'fuel_rate_per_liter') {
      // Get the current values (including the newly updated one)
      const totalCost = updated[index].total_fuel_cost || 0;
      const rate = updated[index].fuel_rate_per_liter || 0;
      
      // Only calculate if both values are present and valid
      if (totalCost > 0 && rate > 0) {
        updated[index].fuel_quantity = parseFloat((totalCost / rate).toFixed(2));
      } else {
        // Reset fuel quantity if either value is missing or zero
        updated[index].fuel_quantity = 0;
      }
    }

    // Auto-calculate total cost when fuel quantity or rate changes manually
    if (field === 'fuel_quantity' && value > 0) {
      const rate = updated[index].fuel_rate_per_liter || 0;
      if (rate > 0) {
        updated[index].total_fuel_cost = parseFloat((value * rate).toFixed(2));
      }
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
      {/* Header with Add button - matching Trip Details style */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Fuel className="h-5 w-5 mr-2 text-primary-500" />
          Refueling Details
          {totals.quantity > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Total: {totals.quantity}L • ₹{totals.cost.toFixed(2)})
            </span>
          )}
        </h3>
        <Button
          type="button"
          onClick={addRefueling}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 px-2 py-1"
        >
          <Plus className="h-3 w-3" />
          <span className="text-xs">Add Refueling</span>
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
              <div className="grid grid-cols-1 gap-3 mt-6">
                {/* Total Cost (primary input - at the top) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Fuel Cost (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    icon={<Calculator className="h-4 w-4" />}
                    hideIconWhenFocused={true}
                    value={refueling.total_fuel_cost || ''}
                    onChange={(e) => updateRefueling(index, 'total_fuel_cost', parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    inputSize="sm"
                    placeholder="Enter total amount paid"
                    required
                  />
                </div>

                {/* Fuel Rate Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fuel Rate per Liter (₹) *
                  </label>
                  <FuelRateSelector
                    value={refueling.fuel_rate_per_liter}
                    onChange={(rate, location) => updateRefueling(index, 'fuel_rate_per_liter', rate, location)}
                    disabled={disabled}
                    inputSize="sm"
                  />
                </div>

                {/* Fuel Quantity (auto-calculated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fuel Quantity (L)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    icon={<Fuel className="h-4 w-4" />}
                    value={refueling.fuel_quantity || ''}
                    disabled
                    inputSize="sm"
                    className="bg-gray-100 dark:bg-gray-900"
                    placeholder="Auto-calculated"
                  />
                </div>

                {/* Fuel Bill Upload - Compact Design */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fuel Bill / Receipt
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id={`fuel-bill-${index}`}
                      accept=".jpg,.jpeg,.png,.pdf"
                      disabled={disabled || uploadStates[index]?.uploading}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Update upload state to show loading
                          setUploadStates(prev => ({
                            ...prev,
                            [index]: { uploading: true }
                          }));
                          
                          try {
                            // Generate a temporary trip ID if not available
                            const tripId = `temp_${Date.now()}`;
                            
                            // Upload to Supabase storage
                            const url = await uploadFuelBill(
                              file,
                              tripId,
                              index,
                              (progress) => {
                                // You could update progress here if needed
                                console.log(`Upload progress: ${progress}%`);
                              }
                            );
                            
                            // Update the refueling data with the URL
                            updateRefueling(index, 'fuel_bill_url', url);
                            
                            // Clear upload state
                            setUploadStates(prev => ({
                              ...prev,
                              [index]: { uploading: false }
                            }));
                            
                            // Show success message
                            toast.success(`Fuel bill uploaded successfully!`);
                          } catch (error) {
                            console.error('Error uploading fuel bill:', error);
                            
                            // Update state with error
                            setUploadStates(prev => ({
                              ...prev,
                              [index]: { uploading: false }
                            }));
                            
                            // Show error message
                            toast.error('Failed to upload fuel bill. Please try again.');
                          }
                        }
                      }}
                    />
                    
                    {/* Upload button or status */}
                    {uploadStates[index]?.uploading ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : refueling.fuel_bill_url ? (
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Uploaded</span>
                        </div>
                        <label
                          htmlFor={`fuel-bill-${index}`}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded",
                            "text-xs text-gray-600 dark:text-gray-400",
                            "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                            disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Upload className="h-3 w-3" />
                          <span>Replace</span>
                        </label>
                      </div>
                    ) : (
                      <label
                        htmlFor={`fuel-bill-${index}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                          "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
                          "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                          "text-sm text-gray-700 dark:text-gray-300",
                          disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Location (display only if available) */}
                {refueling.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Refueling at: {refueling.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default RefuelingForm;