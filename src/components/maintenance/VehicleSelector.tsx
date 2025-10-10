import React, { useState, useRef, useEffect } from "react";
import { Truck, Check } from "lucide-react";
import { Vehicle } from "@/types";
import VehicleTagBadges from "../vehicles/VehicleTagBadges";

interface VehicleSelectorProps {
  selectedVehicle?: string;
  onChange: (vehicleId: string) => void;
  vehicles: Vehicle[];
  error?: string;
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  selectedVehicle,
  onChange,
  vehicles,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuAbove, setIsMenuAbove] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
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
      );
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

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const filteredVehicles = vehicles.filter((vehicle) =>
    `${vehicle.registration_number} ${vehicle.make} ${vehicle.model}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const selectedVehicleDetails = vehicles.find(
    (v) => v.id === selectedVehicle
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredVehicles.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredVehicles.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredVehicles.length) {
          const selectedVehicle = filteredVehicles[highlightedIndex];
          onChange(selectedVehicle.id);
          setIsOpen(false);
          setSearchTerm("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;
    }
  };

  return (
    <div className="space-y-2 relative z-30">
      <label className="block text-sm font-medium text-gray-700">
        Vehicle
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
          {selectedVehicleDetails ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-gray-400" />
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {selectedVehicleDetails.registration_number}
                  </span>
                  {selectedVehicleDetails.tags && selectedVehicleDetails.tags.length > 0 && (
                    <VehicleTagBadges 
                      tags={selectedVehicleDetails.tags} 
                      readOnly 
                      size="sm"
                      maxDisplay={2}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500 truncate">
                  - {selectedVehicleDetails.make} {selectedVehicleDetails.model}
                </span>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  selectedVehicleDetails.status === "active"
                    ? "bg-success-100 text-success-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {selectedVehicleDetails.status?.toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="text-gray-500">Select a vehicle</div>
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
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "0.5rem",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 9999,
              border: "1px solid #e5e7eb",
            }}
            className="z-[9999] w-full bg-white border rounded-lg shadow-lg"
          >
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="Search vehicles by registration, make, or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            <div className="max-h-[200px] overflow-y-auto">
              {filteredVehicles.map((vehicle, index) => (
                <div
                  key={vehicle.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedVehicle === vehicle.id ? "bg-primary-50" : ""
                  } ${
                    index === highlightedIndex ? "bg-gray-100" : ""
                  }`}
                  onClick={() => {
                    onChange(vehicle.id);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {vehicle.registration_number}
                          </span>
                          {vehicle.tags && vehicle.tags.length > 0 && (
                            <VehicleTagBadges 
                              tags={vehicle.tags} 
                              readOnly 
                              size="sm"
                              maxDisplay={2}
                            />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 truncate">
                          {vehicle.make} {vehicle.model}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          vehicle.status === "active"
                            ? "bg-success-100 text-success-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {vehicle.status?.toUpperCase()}
                      </span>
                      {selectedVehicle === vehicle.id && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>Odometer: {vehicle.current_odometer?.toLocaleString()} km</span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredVehicles.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No vehicles found matching your search
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

export default VehicleSelector;
