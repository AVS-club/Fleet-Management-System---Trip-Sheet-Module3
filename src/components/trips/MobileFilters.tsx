import React from 'react';
import { Search, Wrench } from 'lucide-react';
import { TripFilters } from '../../utils/tripSearch';
import { Vehicle, Driver, Warehouse } from '../../types';
import { MaterialType } from '../../utils/materialTypes';

interface MobileFiltersProps {
  filters: TripFilters;
  onFiltersChange: (filters: TripFilters) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  warehouses: Warehouse[];
  onFixMileage: () => void;
  onShowDashboard: () => void;
}

const MobileFilters: React.FC<MobileFiltersProps> = ({
  filters,
  onFiltersChange,
  vehicles,
  drivers,
  warehouses,
  onFixMileage,
  onShowDashboard
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, vehicle: e.target.value });
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, driver: e.target.value });
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, warehouse: e.target.value });
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let dateRange = '';
    
    switch (value) {
      case 'this-month':
        dateRange = 'this-month';
        break;
      case 'last-month':
        dateRange = 'last-month';
        break;
      case 'custom':
        dateRange = 'custom';
        break;
      default:
        dateRange = '';
    }
    
    onFiltersChange({ ...filters, dateRange });
  };

  return (
    <div className="lg:hidden space-y-3">
      {/* Search Bar Row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search trips..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={filters.search}
            onChange={handleSearchChange}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
        <button className="p-2 bg-blue-600 text-white rounded-lg">
          <Search className="w-5 h-5" />
        </button>
      </div>
      
      {/* Filter Buttons Row */}
      <div className="grid grid-cols-3 gap-2">
        <select 
          className="px-3 py-2 border rounded-lg text-sm"
          value={filters.vehicle}
          onChange={handleVehicleChange}
        >
          <option value="">All Vehicles</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.registration_number}
            </option>
          ))}
        </select>
        
        <select 
          className="px-3 py-2 border rounded-lg text-sm"
          value={filters.driver}
          onChange={handleDriverChange}
        >
          <option value="">All Drivers</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
        
        <select 
          className="px-3 py-2 border rounded-lg text-sm"
          value={filters.dateRange || ''}
          onChange={handleDateRangeChange}
        >
          <option value="">All Time</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button 
          className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium"
          onClick={onShowDashboard}
        >
          Show Dashboard
        </button>
        <button 
          className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          onClick={onFixMileage}
        >
          <Wrench className="w-4 h-4" />
          Fix Mileage
        </button>
      </div>
    </div>
  );
};

export default MobileFilters;
