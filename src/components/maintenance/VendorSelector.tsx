import React, { useState, useRef, useEffect } from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';
import { MaintenanceVendor, DEMO_VENDORS } from '../../types/maintenance';

interface VendorSelectorProps {
  selectedVendor?: string;
  onChange: (vendorId: string) => void;
  error?: string;
}

const VendorSelector: React.FC<VendorSelectorProps> = ({
  selectedVendor,
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

  const filteredVendors = DEMO_VENDORS.filter(vendor => 
    vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedVendorDetails = DEMO_VENDORS.find(v => v.id === selectedVendor);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Service Vendor
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          className={`min-h-[42px] p-4 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
            error ? 'border-error-500' : 'border-gray-300'
          }`}
          onClick={() => setIsOpen(true)}
        >
          {selectedVendorDetails ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedVendorDetails.name}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  selectedVendorDetails.active 
                    ? 'bg-success-100 text-success-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {selectedVendorDetails.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {selectedVendorDetails.address}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {selectedVendorDetails.contact}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Select a service vendor</div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
            <div className="p-2 border-b">
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="Search vendors by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredVendors.map(vendor => (
                <div
                  key={vendor.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedVendor === vendor.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => {
                    onChange(vendor.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{vendor.name}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      vendor.active 
                        ? 'bg-success-100 text-success-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {vendor.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {vendor.address}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {vendor.contact}
                    </div>
                  </div>
                </div>
              ))}

              {filteredVendors.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No vendors found matching your search
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

export default VendorSelector;