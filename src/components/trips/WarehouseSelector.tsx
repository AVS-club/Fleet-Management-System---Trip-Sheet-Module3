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
  const selectedWarehouseData = warehouses.find(w => w.id === selectedWarehouse);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Origin Warehouse
        <span className="text-error-500 ml-1">*</span>
      </label>
      
      {/* Selected Warehouse Display */}
      {selectedWarehouseData && (
        <div className="mb-3">
          <div className="inline-flex items-center px-3 py-2 rounded-lg bg-green-100 text-green-800 border border-green-200">
            <Building2 className="h-4 w-4 mr-2" />
            <span className="font-medium">{selectedWarehouseData.name}</span>
            <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-900 rounded-full text-xs font-medium">
              📍 {selectedWarehouseData.pincode}
            </span>
          </div>
        </div>
      )}

      {/* Warehouse Selection */}
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {warehouses.map(warehouse => (
            <label
              key={warehouse.id}
              className={`inline-flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all text-sm font-medium border ${
                selectedWarehouse === warehouse.id
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50'
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
              
              <Building2 className="h-4 w-4 mr-2" />
              <span>{warehouse.name}</span>
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                📍 {warehouse.pincode}
              </span>
            </label>
          ))}
        </div>
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