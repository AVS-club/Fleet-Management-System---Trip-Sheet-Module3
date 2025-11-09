import React from "react";
import { Building2, MapPin, Phone } from "lucide-react";
import { MaintenanceVendor, DEMO_VENDORS } from "@/types/maintenance";
import SearchableDropdown from "../ui/SearchableDropdown";

interface VendorSelectorProps {
  selectedVendor?: string;
  onChange: (vendorId: string) => void;
  error?: string;
}

const VendorSelector: React.FC<VendorSelectorProps> = ({
  selectedVendor,
  onChange,
  error,
}) => {
  return (
    <SearchableDropdown
      items={DEMO_VENDORS}
      selectedId={selectedVendor}
      onChange={onChange}
      getItemId={(vendor) => vendor.id}
      filterFn={(vendor, searchTerm) =>
        vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      }
      renderSelected={(vendor) => (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-900">
              {vendor.name}
            </span>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              vendor.active
                ? "bg-success-100 text-success-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {vendor.active ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      )}
      renderItem={(vendor, isSelected, isHighlighted) => (
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-900">
                {vendor.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  vendor.active
                    ? "bg-success-100 text-success-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {vendor.active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-1 truncate">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{vendor.address}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{vendor.contact}</span>
            </div>
          </div>
        </div>
      )}
      label="Service Vendor"
      placeholder="Select a service vendor"
      searchPlaceholder="Search vendors by name..."
      emptyMessage="No vendors found matching your search"
      required
      error={error}
    />
  );
};

export default VendorSelector;
