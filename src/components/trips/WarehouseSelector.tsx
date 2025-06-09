import React from 'react';
import { Warehouse } from '../../types';
import { MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getWarehouses } from '../../utils/storage';

interface WarehouseSelectorProps {
  warehouses?: Warehouse[] | null;
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
  const [warehouseData, setWarehouseData] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [warehouses]);

  if (loading) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Origin Warehouse
          <span className="text-error-500 ml-1">*</span>
        </label>
        <div className="animate-pulse h-32 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Origin Warehouse
        <span className="text-error-500 ml-1">*</span>
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.isArray(warehouseData) && warehouseData.length > 0 ? warehouseData.map((warehouse) => (
          <button
            key={warehouse.id}
            type="button"
            className={`flex items-start p-4 border rounded-lg transition-colors ${
              selectedWarehouse === warehouse.id
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
            }`}
            onClick={() => onChange(warehouse.id)}
          >
            <MapPin className={`h-5 w-5 mr-3 mt-0.5 ${
              selectedWarehouse === warehouse.id
                ? 'text-primary-500'
                : 'text-gray-400'
            }`} />
            <div className="text-left">
              <div className="font-medium">{warehouse.name}</div>
              <div className="text-sm text-gray-500">{warehouse.pincode}</div>
            </div>
          </button>
        )) : (
          <div className="col-span-3 text-center py-4 text-gray-500">
            No warehouses available. Please add warehouses first.
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-error-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default WarehouseSelector;