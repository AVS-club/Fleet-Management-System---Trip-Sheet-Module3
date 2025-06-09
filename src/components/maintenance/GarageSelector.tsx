import React, { useState, useRef, useEffect } from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';
import { MaintenanceGarage, DEMO_GARAGES } from '../../types/maintenance';

interface GarageSelectorProps {
  selectedGarage?: string;
  onChange: (garageId: string) => void;
  error?: string;
}

const GarageSelector: React.FC<GarageSelectorProps> = ({
  selectedGarage,
  onChange,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGarages = DEMO_GARAGES.filter(garage =>
    garage.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    garage.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedGarageDetails = DEMO_GARAGES.find(g => g.id === selectedGarage);

  const formatGarageType = (type?: MaintenanceGarage['type']) => {
    return type ? type.replace('_', ' ').toUpperCase() : '';
  };

  const getTypeColor = (type: MaintenanceGarage['type']) => {
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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Service Location
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          className={`min-h-[42px] p-4 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
            error ? 'border-error-500' : 'border-gray-300'
          }`}
          onClick={() => setIsOpen(true)}
        >
          {selectedGarageDetails ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedGarageDetails.name}</span>
                </div>
                {selectedGarageDetails.type && (
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(selectedGarageDetails.type)}`}>
                    {formatGarageType(selectedGarageDetails.type)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedGarageDetails.address}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {selectedGarageDetails.contact}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Select a service location</div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
            <div className="p-2 border-b">
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="Search garages..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredGarages.map(garage => (
                <div
                  key={garage.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedGarage === garage.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(garage.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{garage.name}</span>
                    </div>
                    {garage.type && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(garage.type)}`}>
                        {formatGarageType(garage.type)}
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
              ))}

              {filteredGarages.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No garages found matching your search
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-error-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default GarageSelector;