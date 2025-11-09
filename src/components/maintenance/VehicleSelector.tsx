import React from "react";
import { Truck } from "lucide-react";
import { Vehicle } from "@/types";
import VehicleTagBadges from "../vehicles/VehicleTagBadges";
import SearchableDropdown from "../ui/SearchableDropdown";

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
  return (
    <SearchableDropdown
      items={vehicles}
      selectedId={selectedVehicle}
      onChange={onChange}
      getItemId={(vehicle) => vehicle.id}
      filterFn={(vehicle, searchTerm) =>
        `${vehicle.registration_number} ${vehicle.make} ${vehicle.model}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      }
      renderSelected={(vehicle) => (
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
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
            <div className="text-xs text-gray-500 truncate">
              {vehicle.make} {vehicle.model}
            </div>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
              vehicle.status === "active"
                ? "bg-success-100 text-success-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {vehicle.status?.toUpperCase()}
          </span>
        </div>
      )}
      renderItem={(vehicle, isSelected, isHighlighted) => (
        <div className="p-4">
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
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span>Odometer: {vehicle.current_odometer?.toLocaleString()} km</span>
            </div>
          </div>
        </div>
      )}
      label="Vehicle"
      placeholder="Select a vehicle"
      searchPlaceholder="Search vehicles by registration, make, or model..."
      emptyMessage="No vehicles found matching your search"
      required
      error={error}
    />
  );
};

export default VehicleSelector;
