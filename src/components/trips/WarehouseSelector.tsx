import React from 'react';
import { Warehouse } from '../../types';
import { Building2, MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';

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
  // Define distinct colors for different warehouses
  const getWarehouseColor = (warehouseName: string, index: number) => {
    const colors = [
      'bg-green-100 text-green-800 border-green-300', // Green
      'bg-blue-100 text-blue-800 border-blue-300',   // Blue  
      'bg-orange-100 text-orange-800 border-orange-300', // Orange
      'bg-purple-100 text-purple-800 border-purple-300', // Purple
      'bg-pink-100 text-pink-800 border-pink-300',     // Pink
      'bg-indigo-100 text-indigo-800 border-indigo-300' // Indigo
    ];
    
    // Use warehouse name hash or index to assign color consistently
    const colorIndex = warehouseName.length % colors.length;
    return colors[colorIndex];
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Origin Warehouse
        <span className="text-error-500 ml-1">*</span>
      </label>
      
      {/* Warehouse Selection */}
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <div className="flex flex-wrap gap-2">
          {warehouses.map((warehouse, index) => (
            <label /* Added dark mode classes */
              key={warehouse.id}
              className={`inline-flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all text-sm font-medium border-2 ${
                selectedWarehouse === warehouse.id
                  ? getWarehouseColor(warehouse.name, index)
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600'
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
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded text-xs">
                📍 {warehouse.pincode}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {warehouses.length === 0 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
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