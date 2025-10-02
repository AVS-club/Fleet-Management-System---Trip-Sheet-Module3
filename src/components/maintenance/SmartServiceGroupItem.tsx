import React, { useState, useEffect, useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { 
  Trash2, 
  Upload, 
  IndianRupee, 
  Wrench,
  Store,
  AlertCircle,
  TrendingUp,
  MapPin,
  Star
} from 'lucide-react';
import { getSmartVendorSuggestions, formatIndianCurrency, parseIndianCurrency, getEstimatedCost } from '@/utils/vehicleFormatter';
import { MAINTENANCE_ITEMS, MAINTENANCE_GROUPS } from '@/types/maintenance';
import { getVendors } from '@/utils/storage';
import InlineSearchableSelect from '../ui/InlineSearchableSelect';
import { VendorHistoryManager } from '@/utils/vendorHistory';

interface SmartServiceGroupItemProps {
  index: number;
  remove: (index: number) => void;
  canRemove: boolean;
  errors: any;
}

const SmartServiceGroupItem: React.FC<SmartServiceGroupItemProps> = ({
  index,
  remove,
  canRemove,
  errors,
}) => {
  const { register, watch, setValue, control } = useFormContext();
  const [vendors, setVendors] = useState<any[]>([]);
  const [smartVendorSuggestions, setSmartVendorSuggestions] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [vendorHistory, setVendorHistory] = useState(new Map());

  // Watch form values
  const selectedTasks = watch(`service_groups.${index}.tasks`) || [];
  const selectedVendor = watch(`service_groups.${index}.vendor_id`);
  const cost = watch(`service_groups.${index}.cost`) || 0;
  const batteryTracking = watch(`service_groups.${index}.battery_tracking`);
  const tyreTracking = watch(`service_groups.${index}.tyre_tracking`);

  // Load vendors on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingVendors(true);
      try {
        const [vendorData, historyData] = await Promise.all([
          getVendors(),
          VendorHistoryManager.getHistory()
        ]);
        
        setVendors(vendorData || []);
        setVendorHistory(historyData);
      } catch (error) {
        console.error('Error loading vendors:', error);
      } finally {
        setIsLoadingVendors(false);
      }
    };
    loadData();
  }, []);

  // Update smart vendor suggestions when tasks change
  useEffect(() => {
    if (selectedTasks.length > 0 && vendors.length > 0) {
      const suggestions = getSmartVendorSuggestions(
        selectedTasks,
        vendors,
        vendorHistory,
        'Raipur' // User's location
      );
      
      setSmartVendorSuggestions(suggestions);
      
      // Auto-calculate estimated cost
      const estimated = getEstimatedCost(selectedTasks);
      setEstimatedCost(estimated);
      
      // Pre-fill cost if empty (only once to prevent infinite loops)
      if (!cost || cost === 0) {
        setValue(`service_groups.${index}.cost`, estimated);
      }
    }
  }, [selectedTasks, vendors, vendorHistory, setValue, index]); // Removed 'cost' from dependencies

  // Format maintenance task options with grouping
  const maintenanceTaskOptions = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    Object.entries(MAINTENANCE_GROUPS).forEach(([key, group]) => {
      grouped[group.title] = group.items.map(item => ({
        value: item.id,
        label: item.name,
        group: group.title,
        avgCost: item.averageCost,
        lifeKm: item.standardLifeKm,
        lifeDays: item.standardLifeDays,
      }));
    });
    
    // Flatten with group headers
    const options: any[] = [];
    Object.entries(grouped).forEach(([groupTitle, items]) => {
      options.push({ 
        value: `group_${groupTitle}`, 
        label: groupTitle, 
        isGroupHeader: true 
      });
      options.push(...items);
    });
    
    return options;
  }, []);

  // Format vendor options with smart ordering
  const vendorOptions = useMemo(() => {
    const formattedSuggestions = smartVendorSuggestions.map((vendor) => ({
      ...vendor,
      value: vendor.vendorId,
      label: vendor.name,
      name: vendor.name,
      location: vendor.location || '',
      isSuggested: true,
    }));

    const otherVendors = vendors
      .filter((vendor) => !smartVendorSuggestions.find((s) => s.vendorId === vendor.id))
      .map((vendor) => ({
        ...vendor,
        vendorId: vendor.id,
        value: vendor.id,
        label: vendor.name,
        name: vendor.name,
        location: vendor.address || vendor.location || '',
        isSuggested: false,
      }));

    return [...formattedSuggestions, ...otherVendors];
  }, [vendors, smartVendorSuggestions]);

  // Validate and format cost input
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[₹,\s]/g, '');
    const numericValue = Math.max(0, parseInt(rawValue) || 0);
    setValue(`service_groups.${index}.cost`, numericValue);
  };

  // Handle cost blur to format display
  const handleCostBlur = () => {
    // Ensure cost is never negative
    if (cost < 0) {
      setValue(`service_groups.${index}.cost`, 0);
    }
  };

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-lg shadow-sm">
              <Wrench className="h-4 w-4 text-primary-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              Service Group {index + 1}
            </h4>
            {selectedTasks.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {canRemove && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* STEP 1: Maintenance Tasks (Now First) */}
        <div>
          <InlineSearchableSelect
            label={
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-gray-500" />
                <span>Maintenance Tasks</span>
              </div>
            }
            required
            multiple
            options={maintenanceTaskOptions}
            value={selectedTasks}
            onChange={(value) => setValue(`service_groups.${index}.tasks`, value)}
            placeholder="Select maintenance tasks"
            searchPlaceholder="Search tasks..."
            error={errors?.service_groups?.[index]?.tasks?.message}
            renderOption={(option) => {
              if (option.isGroupHeader) {
                return (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {option.label}
                    </span>
                  </div>
                );
              }
              
              return (
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">
                        {option.avgCost && `₹${option.avgCost.toLocaleString('en-IN')} avg`}
                        {option.lifeKm && ` • ${option.lifeKm.toLocaleString('en-IN')} km`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>

        {/* STEP 2: Service Vendor (Now Second with Smart Suggestions) */}
        <div>
          <InlineSearchableSelect
            label={
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-500" />
                <span>Service Vendor</span>
              </div>
            }
            required
            options={vendorOptions}
            value={selectedVendor}
            onChange={(value) => {
              setValue(`service_groups.${index}.vendor_id`, value);
              // Save to history
              selectedTasks.forEach(taskId => {
                VendorHistoryManager.recordUsage(taskId, value as string);
              });
            }}
            placeholder="Select a service vendor"
            searchPlaceholder="Search vendors by name or location..."
            loading={isLoadingVendors}
            error={errors?.service_groups?.[index]?.vendor_id?.message}
            renderOption={(option) => (
              <div className="px-3 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{option.name}</span>
                      {option.isSuggested && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          <TrendingUp className="h-3 w-3 inline mr-0.5" />
                          Suggested
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {option.location && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {option.location}
                        </span>
                      )}
                      {option.distance !== undefined && (
                        <span className="text-xs text-gray-500">
                          ~{option.distance} km away
                        </span>
                      )}
                      {option.rating && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {option.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            customHeader={
              smartVendorSuggestions.length > 0 && !selectedVendor && (
                <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs text-blue-700 font-medium">
                    ✨ Top {smartVendorSuggestions.length} vendors for your selected tasks
                  </p>
                </div>
              )
            }
          />
        </div>

        {/* STEP 3: Cost (With Indian Currency Format and Validation) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-gray-500" />
              Cost <span className="text-red-500">*</span>
              {estimatedCost > 0 && cost !== estimatedCost && (
                <span className="text-xs text-gray-500 font-normal">
                  (Est: {formatIndianCurrency(estimatedCost)})
                </span>
              )}
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                {...register(`service_groups.${index}.cost`, {
                  required: 'Cost is required',
                  min: { value: 0, message: 'Cost cannot be negative' },
                  validate: value => value >= 0 || 'Cost cannot be negative'
                })}
                onChange={handleCostChange}
                onBlur={handleCostBlur}
                value={cost ? cost.toLocaleString('en-IN') : ''}
                className={`
                  w-full pl-9 pr-3 py-2 border rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${errors?.service_groups?.[index]?.cost 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300'
                  }
                `}
                placeholder="0"
              />
              {cost < 0 && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
              )}
            </div>
            {errors?.service_groups?.[index]?.cost && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.service_groups[index].cost.message}
              </p>
            )}
          </div>

          {/* Quick Cost Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-2">
              {[1000, 2000, 3000, 5000, 10000].map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setValue(`service_groups.${index}.cost`, amount)}
                  className={`
                    px-3 py-1 text-sm rounded-lg border transition-colors
                    ${cost === amount
                      ? 'bg-primary-100 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-primary-300'
                    }
                  `}
                >
                  ₹{amount.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Special Tracking Options with Better UI */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex flex-wrap gap-4">
            {/* Battery Replacement */}
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                {...register(`service_groups.${index}.battery_tracking`)}
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                🔋 Battery Replacement
              </span>
            </label>

            {/* Tyre Replacement */}
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                {...register(`service_groups.${index}.tyre_tracking`)}
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                🛞 Tyre Replacement
              </span>
            </label>
          </div>
        </div>

        {/* Battery Details (Enhanced UI) */}
        {batteryTracking && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <h5 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              🔋 Battery Details
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register(`service_groups.${index}.battery_serial`, {
                    required: batteryTracking ? 'Serial number is required' : false,
                    pattern: {
                      value: /^[0-9]+$/,
                      message: 'Only positive numbers allowed'
                    }
                  })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md 
                           focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <select
                  {...register(`service_groups.${index}.battery_brand`)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md 
                           focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Select brand</option>
                  <option value="Exide">Exide</option>
                  <option value="Amaron">Amaron</option>
                  <option value="Livguard">Livguard</option>
                  <option value="SF Sonic">SF Sonic</option>
                  <option value="Okaya">Okaya</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tyre Details (Enhanced UI) */}
        {tyreTracking && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              🛞 Tyre Details
            </h5>
            <div className="space-y-3">
              {/* Position Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Select Positions
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {['FL', 'FR', 'RL', 'RR', 'Stepney'].map(position => (
                    <label key={position} className="relative">
                      <input
                        type="checkbox"
                        value={position}
                        {...register(`service_groups.${index}.tyre_positions`)}
                        className="peer sr-only"
                      />
                      <div className="px-3 py-2 text-sm text-center border-2 rounded-lg cursor-pointer
                                    peer-checked:bg-blue-100 peer-checked:border-blue-500 peer-checked:text-blue-700
                                    border-gray-300 hover:border-blue-300 transition-colors">
                        {position}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    {...register(`service_groups.${index}.tyre_brand`)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md 
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select brand</option>
                    <option value="MRF">MRF</option>
                    <option value="CEAT">CEAT</option>
                    <option value="Apollo">Apollo</option>
                    <option value="JK Tyre">JK Tyre</option>
                    <option value="Bridgestone">Bridgestone</option>
                    <option value="Michelin">Michelin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Serial Numbers
                  </label>
                  <input
                    type="text"
                    {...register(`service_groups.${index}.tyre_serials`)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md 
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Comma separated"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Bill Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-400 transition-colors">
          <div className="text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Upload bill
              </span>
              <span className="text-sm text-gray-500"> or drag and drop</span>
              <input
                type="file"
                {...register(`service_groups.${index}.bill_file`)}
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                className="sr-only"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF up to 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartServiceGroupItem;
