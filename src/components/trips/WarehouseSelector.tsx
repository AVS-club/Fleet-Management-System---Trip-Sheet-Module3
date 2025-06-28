import React from 'react';
import { Warehouse } from '../../types';
import { MapPin, Building2, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getWarehouses } from '../../utils/storage';

interface WarehouseSelectorProps {
  warehouses?: Warehouse[] | null;
  frequentWarehouses?: Warehouse[] | null;
  selectedWarehouse?: string;
  onChange: (warehouseId: string) => void;
  error?: string;
}

const WarehouseSelector: React.FC<WarehouseSelectorProps> = ({
  warehouses,
  frequentWarehouses,
  selectedWarehouse,
  onChange,
  error
}) => {
  const [warehouseData, setWarehouseData] = useState<Warehouse[]>([]);
  const [frequentWarehouseData, setFrequentWarehouseData] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllWarehouses, setShowAllWarehouses] = useState(false);

  useEffect(() => {
    const fetchWarehouses = async () => {
      if (Array.isArray(warehouses)) {
        setWarehouseData(warehouses);
        setLoading(false);
        return;
      }

      try {
        const data = await getWarehouses();
        setWarehouseData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        setWarehouseData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouses();
    
    // Set frequent warehouses if provided
    if (Array.isArray(frequentWarehouses) && frequentWarehouses.length > 0) {
      setFrequentWarehouseData(frequentWarehouses.slice(0, 3)); // Limit to top 3
    }
  }, [warehouses, frequentWarehouses]);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Origin Warehouse
          <span className="text-error-500 ml-1">*</span>
        </label>
        <div className="animate-pulse h-12 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Origin Warehouse
        <span className="text-error-500 ml-1">*</span>
      </label>
      
      {/* Quick select buttons for most frequent warehouses */}
      <div className="flex flex-wrap gap-2 mb-2">
        {Array.isArray(frequentWarehouseData) && frequentWarehouseData.length > 0 ? (
          <>
            {frequentWarehouseData.map((warehouse) => (
              <button
                key={`frequent-${warehouse.id}`}
                type="button"
                className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedWarehouse === warehouse.id
                    ? 'bg-primary-100 text-primary-700 border border-primary-300 font-medium'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
                onClick={() => onChange(warehouse.id)}
              >
                <MapPin className={`h-4 w-4 mr-1.5 ${
                  selectedWarehouse === warehouse.id
                    ? 'text-primary-500'
                    : 'text-gray-500'
                }`} />
                {warehouse.name}
              </button>
            ))}
            
            {/* More warehouses button */}
            <button
              type="button"
              className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600"
              onClick={() => setShowAllWarehouses(!showAllWarehouses)}
            >
              <Building2 className="h-4 w-4 mr-1.5" />
              {showAllWarehouses ? 'Less' : 'More'} Warehouses
              <ChevronRight className={`h-4 w-4 ml-1 transition-transform duration-200 ${showAllWarehouses ? 'rotate-90' : ''}`} />
            </button>
          </>
        ) : (
          // If no frequent warehouses, show a button to display all
          <button
            type="button"
            className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 w-full justify-center"
            onClick={() => setShowAllWarehouses(!showAllWarehouses)}
          >
            <Building2 className="h-4 w-4 mr-1.5" />
            {showAllWarehouses ? 'Hide' : 'Show'} Warehouses
            <ChevronRight className={`h-4 w-4 ml-1 transition-transform duration-200 ${showAllWarehouses ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>
      
      {/* All warehouses grid - shown when "More Warehouses" is clicked or if there are no frequent warehouses */}
      {showAllWarehouses && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3 max-h-[300px] overflow-y-auto p-1">
          {Array.isArray(warehouseData) && warehouseData.length > 0 ? warehouseData.map((warehouse) => (
            <button
              key={warehouse.id}
              type="button"
              className={`flex flex-col items-start p-3 border rounded-lg transition-colors text-left ${
                selectedWarehouse === warehouse.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
              }`}
              onClick={() => onChange(warehouse.id)}
            >
              <div className="flex items-center mb-1">
                <MapPin className={`h-4 w-4 mr-1.5 ${
                  selectedWarehouse === warehouse.id
                    ? 'text-primary-500'
                    : 'text-gray-400'
                }`} />
                <div className="font-medium">{warehouse.name}</div>
              </div>
              {warehouse.pincode && (
                <div className="text-xs text-gray-500 ml-6">{warehouse.pincode}</div>
              )}
            </button>
          )) : (
            <div className="col-span-3 text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              No warehouses available. Please add warehouses first.
            </div>
          )}
        </div>
      )}
      
      {/* Currently selected warehouse display when not showing all */}
      {!showAllWarehouses && selectedWarehouse && (
        <div className="mt-2">
          <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-primary-600 mr-2" />
              <div>
                <p className="font-medium text-primary-800">
                  {warehouseData.find(w => w.id === selectedWarehouse)?.name || 'Selected Warehouse'}
                </p>
                <p className="text-xs text-primary-600 mt-0.5">
                  {warehouseData.find(w => w.id === selectedWarehouse)?.pincode || ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-error-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default WarehouseSelector;