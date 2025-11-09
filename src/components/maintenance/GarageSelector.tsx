import React from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';
import { MaintenanceGarage, DEMO_GARAGES } from '@/types/maintenance';
import SearchableDropdown from '../ui/SearchableDropdown';

interface GarageSelectorProps {
  selectedGarage?: string;
  onChange: (garageId: string) => void;
  error?: string;
}

const formatGarageType = (type?: MaintenanceGarage['type']) => {
  return type ? type.replace('_', ' ').toUpperCase() : '';
};

const getTypeColor = (type?: MaintenanceGarage['type']) => {
  switch (type) {
    case 'authorized':
      return 'bg-success-100 text-success-700';
    case 'independent':
      return 'bg-warning-100 text-warning-700';
    case 'company_owned':
      return 'bg-primary-100 text-primary-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const GarageSelector: React.FC<GarageSelectorProps> = ({
  selectedGarage,
  onChange,
  error
}) => {
  return (
    <SearchableDropdown
      items={DEMO_GARAGES}
      selectedId={selectedGarage}
      onChange={onChange}
      getItemId={(garage) => garage.id}
      filterFn={(garage, searchTerm) =>
        garage.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        garage.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false
      }
      renderSelected={(garage) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-900">{garage.name}</span>
            </div>
            {garage.type && (
              <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(garage.type as MaintenanceGarage['type'])}`}>
                {formatGarageType(garage.type as MaintenanceGarage['type'])}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {garage.address}
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {garage.contact}
            </div>
          </div>
        </div>
      )}
      renderItem={(garage, isSelected, isHighlighted) => (
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-900">{garage.name}</span>
            </div>
            {garage.type && (
              <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(garage.type as MaintenanceGarage['type'])}`}>
                {formatGarageType(garage.type as MaintenanceGarage['type'])}
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {garage.address}
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {garage.contact}
            </div>
          </div>
        </div>
      )}
      label="Service Location"
      placeholder="Select a service location"
      searchPlaceholder="Search garages..."
      emptyMessage="No garages found matching your search"
      maxHeight={250}
      required
      error={error}
    />
  );
};

export default GarageSelector;