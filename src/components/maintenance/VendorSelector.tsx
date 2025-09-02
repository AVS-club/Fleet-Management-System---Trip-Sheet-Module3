import React, { useState, useRef, useEffect } from "react";
import { Building2, MapPin, Phone, Check } from "lucide-react";
import { MaintenanceVendor, DEMO_VENDORS } from "@/types/maintenance";

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuAbove, setIsMenuAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && inputContainerRef.current && dropdownMenuRef.current) {
      const inputRect = inputContainerRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(
        dropdownMenuRef.current.scrollHeight,
        250
      ); // Reduced height from 300px
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setIsMenuAbove(true);
      } else {
        setIsMenuAbove(false);
      }
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredVendors = DEMO_VENDORS.filter((vendor) =>
    vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedVendorDetails = DEMO_VENDORS.find(
    (v) => v.id === selectedVendor
  );

  return (
    <div className="space-y-2 relative z-30">
      <label className="block text-sm font-medium text-gray-700">
        Service Vendor
        <span className="text-error-500 ml-1">*</span>
      </label>

      <div className="relative" ref={dropdownRef}>
        <div
          ref={inputContainerRef}
          className={`min-h-[42px] p-2 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 ${
            error ? "border-error-500" : "border-gray-300"
          }`}
          onClick={() => setIsOpen(true)}
        >
          {selectedVendorDetails ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {selectedVendorDetails.name}
                </span>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  selectedVendorDetails.active
                    ? "bg-success-100 text-success-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {selectedVendorDetails.active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          ) : (
            <div className="text-gray-500">Select a service vendor</div>
          )}
        </div>

        {isOpen && (
          <div
            ref={dropdownMenuRef}
            style={{
              position: "absolute",
              [isMenuAbove ? "bottom" : "top"]: isMenuAbove
                ? "calc(100% + 4px)"
                : "calc(100% + 4px)",
              left: 0,
              right: 0,
              // maxHeight: '250px',
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "0.5rem",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 50,
              border: "1px solid #e5e7eb",
            }}
            className="z-50 w-full bg-white border rounded-lg shadow-lg"
          >
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="Search vendors by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            <div className="max-h-[200px] overflow-y-auto">
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedVendor === vendor.id ? "bg-primary-50" : ""
                  }`}
                  onClick={() => {
                    onChange(vendor.id);
                    setIsOpen(false);
                  }}
                >
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
                      {selectedVendor === vendor.id && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
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

      {error && <p className="text-error-500 text-sm">{error}</p>}
    </div>
  );
};

export default VendorSelector;
