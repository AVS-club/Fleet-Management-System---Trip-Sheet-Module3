import React from 'react';
import { Warehouse } from '../../types';
import { Building2, MapPin } from 'lucide-react';

interface WarehouseSelectorProps {
  warehouses: Warehouse[];
  selectedWarehouse?: string;
  onChange: (warehouseId: string) => void;
  error?: string;
}

const WarehouseSelector: React.FC<WarehouseSelectorProps> = ({
  warehouses,
  selectedWarehouse,
  onChange,
  error
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Origin Warehouse
        <span className="text-error-500 ml-1">*</span>
      </label>
      
      <div className="grid grid-cols-1 gap-2">
        {warehouses.map(warehouse => (
          <label
            key={warehouse.id}
            className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedWarehouse === warehouse.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
            }`}
          >
            <input
              type="radio"
              name="warehouse"
              value={warehouse.id}
              checked={selectedWarehouse === warehouse.id}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            
            <div className="flex items-center space-x-3 w-full">
              <div className={`p-2 rounded-full ${
                selectedWarehouse === warehouse.id
                  ? 'bg-green-100'
                  : 'bg-gray-100'
              }`}>
                <Building2 className={`h-5 w-5 ${
                  selectedWarehouse === warehouse.id
                    ? 'text-green-600'
                    : 'text-gray-500'
                }`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className={`font-medium ${
                    selectedWarehouse === warehouse.id
                      ? 'text-green-800'
                      : 'text-gray-900'
                  }`}>
                    {warehouse.name}
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <MapPin className="h-3 w-3 mr-1" />
                    📍 {warehouse.pincode}
                  </span>
                </div>
                
                {warehouse.latitude && warehouse.longitude && (
                  <p className="text-xs text-gray-500 mt-1">
                    🗺️ {warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
            
            {selectedWarehouse === warehouse.id && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            )}
          </label>
        ))}
      </div>
      
      {warehouses.length === 0 && (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No warehouses available. Please add warehouses first.</p>
        </div>
      )}
      
      {error && (
        <p className="text-error-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default WarehouseSelector;