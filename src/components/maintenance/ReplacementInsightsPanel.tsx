import React, { useState, useEffect, useMemo } from "react";
import {
  MaintenanceTask,
  MAINTENANCE_ITEMS,
  MAINTENANCE_GROUPS,
} from "../../types/maintenance";

import { Vehicle } from "../../types";
import {
  PenTool,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Battery,
  Disc,
  FileText,
  Settings,
  Zap,
  Droplet,
  Wrench,
  Truck,
  BarChart2,
} from "lucide-react";
import Button from "../ui/Button";
import CollapsibleSection from "../ui/CollapsibleSection";

interface PartReplacement {
  partName: string;
  icon: React.ReactNode;
  lastReplacedDate?: string;
  vehicleCount: number;
  averageCost?: number;
  maxKmSinceReplacement?: number;
  lifeRemaining?: number; // 0-100 percentage
  alerts?: string[];
}

interface PartReplacementData {
  [partType: string]: PartReplacement;
}

interface ReplacementInsightsPanelProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  visible?: boolean;
}

const ReplacementInsightsPanel: React.FC<ReplacementInsightsPanelProps> = ({
  tasks,
  vehicles,
  visible = false,
}) => {
  const [showPanel, setShowPanel] = useState(visible);
  const [showAlerts, setShowAlerts] = useState(false);
  const [aiAlerts, setAiAlerts] = useState<string[]>([]);

  // Define standard parts to track with their icons
  const partDefinitions = useMemo(() => {
    return [
      {
        id: "tyres_front",
        name: "Tyres (Front)",
        icon: <Disc className="h-5 w-5 text-blue-500" />,
        standardLifeKm: 60000,
      },
      {
        id: "tyres_rear",
        name: "Tyres (Rear)",
        icon: <Disc className="h-5 w-5 text-blue-500" />,
        standardLifeKm: 60000,
      },
      {
        id: "battery",
        name: "Battery",
        icon: <Battery className="h-5 w-5 text-orange-500" />,
        standardLifeKm: 80000,
      },
      {
        id: "brake_pads",
        name: "Brake Pads",
        icon: <FileText className="h-5 w-5 text-red-500" />,
        standardLifeKm: 40000,
      },
      {
        id: "clutch_plate",
        name: "Clutch Plate",
        icon: <Settings className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 80000,
      },
      {
        id: "timing_belt",
        name: "Timing Belt",
        icon: <Settings className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 100000,
      },
      {
        id: "shock_absorbers",
        name: "Shock Absorbers",
        icon: <Truck className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 80000,
      },
      {
        id: "air_filter",
        name: "Air Filter",
        icon: <Wrench className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 20000,
      },
      {
        id: "fuel_filter",
        name: "Fuel Filter",
        icon: <Droplet className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 30000,
      },
      {
        id: "alternator",
        name: "Alternator",
        icon: <Zap className="h-5 w-5 text-yellow-500" />,
        standardLifeKm: 120000,
      },
      {
        id: "engine_mounts",
        name: "Engine Mounts",
        icon: <Wrench className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 100000,
      },
      {
        id: "leaf_springs",
        name: "Leaf Springs",
        icon: <Truck className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 120000,
      },
      {
        id: "wheel_bearings",
        name: "Wheel Bearings",
        icon: <Settings className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 80000,
      },
      {
        id: "gearbox",
        name: "Gearbox Overhaul",
        icon: <Settings className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 150000,
      },
      {
        id: "differential",
        name: "Differential Oil",
        icon: <Droplet className="h-5 w-5 text-gray-500" />,
        standardLifeKm: 50000,
      },
      {
        id: "radiator",
        name: "Radiator",
        icon: <Droplet className="h-5 w-5 text-blue-500" />,
        standardLifeKm: 100000,
      },
    ];
  }, []);

  // Calculate parts replacement data
  const partsData = useMemo(() => {
    if (
      !Array.isArray(tasks) ||
      !Array.isArray(vehicles) ||
      tasks.length === 0 ||
      vehicles.length === 0
    ) {
      return {};
    }

    const partReplacementData: PartReplacementData = {};
    const vehicleMap = new Map<string, Vehicle>();
    const alerts: string[] = [];

    // Initialize parts data with default values
    partDefinitions.forEach((part) => {
      partReplacementData[part.id] = {
        partName: part.name,
        icon: part.icon,
        vehicleCount: 0,
        averageCost: 0,
        lastReplacedDate: undefined,
        maxKmSinceReplacement: 0,
        lifeRemaining: 100, // Default to 100% if no data
        alerts: [],
      };
    });

    // Create a map of vehicles for quick lookup
    vehicles.forEach((vehicle) => {
      vehicleMap.set(vehicle.id, vehicle);
    });

    // Process maintenance tasks
    tasks.forEach((task) => {
      // Skip tasks without service groups
      if (
        !Array.isArray(task.service_groups) ||
        task.service_groups.length === 0
      )
        return;

      const vehicle = vehicleMap.get(task.vehicle_id);
      if (!vehicle) return;

      // Process each service group
      task.service_groups.forEach((group) => {
        if (!Array.isArray(group.tasks) || group.tasks.length === 0) return;

        // Check for battery replacement
        if (group.battery_tracking && group.battery_serial) {
          const batteryData = partReplacementData["battery"];
          const taskDate = new Date(task.start_date);

          // Update last replaced date if this is newer
          if (
            !batteryData.lastReplacedDate ||
            new Date(batteryData.lastReplacedDate) < taskDate
          ) {
            batteryData.lastReplacedDate = taskDate.toISOString();
          }

          // Update vehicle count
          batteryData.vehicleCount++;

          // Update average cost
          if (typeof group.cost === "number") {
            const currentTotal =
              (batteryData.averageCost || 0) * (batteryData.vehicleCount - 1);
            batteryData.averageCost =
              (currentTotal + group.cost) / batteryData.vehicleCount;
          }

          // Calculate km since replacement
          const kmSinceReplacement =
            vehicle.current_odometer - task.odometer_reading;
          batteryData.maxKmSinceReplacement = Math.max(
            batteryData.maxKmSinceReplacement || 0,
            kmSinceReplacement
          );

          // Calculate life remaining for this battery
          const standardLifeKm =
            partDefinitions.find((p) => p.id === "battery")?.standardLifeKm ||
            80000;
          const lifeRemaining = Math.max(
            0,
            Math.min(100, 100 - (kmSinceReplacement / standardLifeKm) * 100)
          );
          batteryData.lifeRemaining = Math.min(
            batteryData.lifeRemaining || 100,
            lifeRemaining
          );

          // Generate alert if battery is due for replacement
          if (lifeRemaining < 15) {
            const alert = `Battery for ${
              vehicle.registration_number
            } is due for replacement (${lifeRemaining.toFixed(
              0
            )}% life remaining)`;
            batteryData.alerts = [...(batteryData.alerts || []), alert];
            alerts.push(alert);
          }
        }

        // Check for tyre replacement
        if (group.tyre_tracking && Array.isArray(group.tyre_positions)) {
          // Process front tyres
          if (
            group.tyre_positions.includes("FL") ||
            group.tyre_positions.includes("FR")
          ) {
            const tyreData = partReplacementData["tyres_front"];
            const taskDate = new Date(task.start_date);

            // Update last replaced date if this is newer
            if (
              !tyreData.lastReplacedDate ||
              new Date(tyreData.lastReplacedDate) < taskDate
            ) {
              tyreData.lastReplacedDate = taskDate.toISOString();
            }

            // Update vehicle count
            tyreData.vehicleCount++;

            // Update average cost (dividing by number of tyres)
            if (typeof group.cost === "number") {
              const tyreCount = group.tyre_positions.length;
              const tyreCost =
                tyreCount > 0 ? group.cost / tyreCount : group.cost;
              const currentTotal =
                (tyreData.averageCost || 0) * (tyreData.vehicleCount - 1);
              tyreData.averageCost =
                (currentTotal + tyreCost) / tyreData.vehicleCount;
            }

            // Calculate km since replacement
            const kmSinceReplacement =
              vehicle.current_odometer - task.odometer_reading;
            tyreData.maxKmSinceReplacement = Math.max(
              tyreData.maxKmSinceReplacement || 0,
              kmSinceReplacement
            );

            // Calculate life remaining for these tyres
            const standardLifeKm =
              partDefinitions.find((p) => p.id === "tyres_front")
                ?.standardLifeKm || 60000;
            const lifeRemaining = Math.max(
              0,
              Math.min(100, 100 - (kmSinceReplacement / standardLifeKm) * 100)
            );
            tyreData.lifeRemaining = Math.min(
              tyreData.lifeRemaining || 100,
              lifeRemaining
            );

            // Generate alert if tyres are due for replacement
            if (lifeRemaining < 20) {
              const alert = `Front tyres for ${
                vehicle.registration_number
              } are due for replacement (${lifeRemaining.toFixed(
                0
              )}% life remaining)`;
              tyreData.alerts = [...(tyreData.alerts || []), alert];
              alerts.push(alert);
            }
          }

          // Process rear tyres
          if (
            group.tyre_positions.includes("RL") ||
            group.tyre_positions.includes("RR")
          ) {
            const tyreData = partReplacementData["tyres_rear"];
            const taskDate = new Date(task.start_date);

            if (
              !tyreData.lastReplacedDate ||
              new Date(tyreData.lastReplacedDate) < taskDate
            ) {
              tyreData.lastReplacedDate = taskDate.toISOString();
            }

            tyreData.vehicleCount++;

            if (typeof group.cost === "number") {
              const tyreCount = group.tyre_positions.length;
              const tyreCost =
                tyreCount > 0 ? group.cost / tyreCount : group.cost;
              const currentTotal =
                (tyreData.averageCost || 0) * (tyreData.vehicleCount - 1);
              tyreData.averageCost =
                (currentTotal + tyreCost) / tyreData.vehicleCount;
            }

            const kmSinceReplacement =
              vehicle.current_odometer - task.odometer_reading;
            tyreData.maxKmSinceReplacement = Math.max(
              tyreData.maxKmSinceReplacement || 0,
              kmSinceReplacement
            );

            const standardLifeKm =
              partDefinitions.find((p) => p.id === "tyres_rear")
                ?.standardLifeKm || 60000;
            const lifeRemaining = Math.max(
              0,
              Math.min(100, 100 - (kmSinceReplacement / standardLifeKm) * 100)
            );
            tyreData.lifeRemaining = Math.min(
              tyreData.lifeRemaining || 100,
              lifeRemaining
            );

            if (lifeRemaining < 20) {
              const alert = `Rear tyres for ${
                vehicle.registration_number
              } are due for replacement (${lifeRemaining.toFixed(
                0
              )}% life remaining)`;
              tyreData.alerts = [...(tyreData.alerts || []), alert];
              alerts.push(alert);
            }
          }
        }

        // Map tasks to part types
        group.tasks.forEach((taskId) => {
          // Find the task in MAINTENANCE_ITEMS to determine part type
          const maintenanceItem = MAINTENANCE_ITEMS.find(
            (item) => item.id === taskId
          );
          if (!maintenanceItem) return;

          let partId: string | undefined;

          // Map maintenance item to our parts list
          if (maintenanceItem.name.toLowerCase().includes("brake pad")) {
            partId = "brake_pads";
          } else if (maintenanceItem.name.toLowerCase().includes("clutch")) {
            partId = "clutch_plate";
          } else if (
            maintenanceItem.name.toLowerCase().includes("timing belt")
          ) {
            partId = "timing_belt";
          } else if (
            maintenanceItem.name.toLowerCase().includes("shock absorber")
          ) {
            partId = "shock_absorbers";
          } else if (
            maintenanceItem.name.toLowerCase().includes("air filter")
          ) {
            partId = "air_filter";
          } else if (
            maintenanceItem.name.toLowerCase().includes("fuel filter")
          ) {
            partId = "fuel_filter";
          } else if (
            maintenanceItem.name.toLowerCase().includes("alternator")
          ) {
            partId = "alternator";
          } else if (
            maintenanceItem.name.toLowerCase().includes("engine mount")
          ) {
            partId = "engine_mounts";
          } else if (
            maintenanceItem.name.toLowerCase().includes("leaf spring")
          ) {
            partId = "leaf_springs";
          } else if (
            maintenanceItem.name.toLowerCase().includes("wheel bearing")
          ) {
            partId = "wheel_bearings";
          } else if (maintenanceItem.name.toLowerCase().includes("gearbox")) {
            partId = "gearbox";
          } else if (
            maintenanceItem.name.toLowerCase().includes("differential")
          ) {
            partId = "differential";
          } else if (maintenanceItem.name.toLowerCase().includes("radiator")) {
            partId = "radiator";
          }

          if (partId && partReplacementData[partId]) {
            const partData = partReplacementData[partId];
            const taskDate = new Date(task.start_date);

            // Update last replaced date if this is newer
            if (
              !partData.lastReplacedDate ||
              new Date(partData.lastReplacedDate) < taskDate
            ) {
              partData.lastReplacedDate = taskDate.toISOString();
            }

            // Update vehicle count
            partData.vehicleCount++;

            // Update average cost
            if (typeof group.cost === "number") {
              // Assume equal cost distribution among tasks in the group
              const taskCost = group.cost / group.tasks.length;
              const currentTotal =
                (partData.averageCost || 0) * (partData.vehicleCount - 1);
              partData.averageCost =
                (currentTotal + taskCost) / partData.vehicleCount;
            }

            // Calculate km since replacement
            const kmSinceReplacement =
              vehicle.current_odometer - task.odometer_reading;
            partData.maxKmSinceReplacement = Math.max(
              partData.maxKmSinceReplacement || 0,
              kmSinceReplacement
            );

            // Calculate life remaining
            const standardLifeKm =
              partDefinitions.find((p) => p.id === partId)?.standardLifeKm ||
              50000;
            const lifeRemaining = Math.max(
              0,
              Math.min(100, 100 - (kmSinceReplacement / standardLifeKm) * 100)
            );
            partData.lifeRemaining = Math.min(
              partData.lifeRemaining || 100,
              lifeRemaining
            );

            // Generate alert if part is due for replacement
            if (lifeRemaining < 15) {
              const alert = `${partData.partName} for ${
                vehicle.registration_number
              } is due for replacement (${lifeRemaining.toFixed(
                0
              )}% life remaining)`;
              partData.alerts = [...(partData.alerts || []), alert];
              alerts.push(alert);
            }
          }
        });
      });
    });

    // Update AI alerts
    setAiAlerts(alerts);

    return partReplacementData;
  }, [tasks, vehicles, partDefinitions]);

  // Get the status indicator for a part based on life remaining
  const getLifeStatus = (lifeRemaining?: number) => {
    if (lifeRemaining === undefined)
      return { color: "bg-gray-100", text: "No Data" };
    if (lifeRemaining < 15)
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        text: "Due Soon",
      };
    if (lifeRemaining < 40)
      return {
        color: "bg-orange-100 text-orange-800 border-orange-200",
        text: "Mid-Life",
      };
    return {
      color: "bg-green-100 text-green-800 border-green-200",
      text: "Good",
    };
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (Object.keys(partsData).length === 0) {
    return (
      <Button
        variant="outline"
        onClick={() => setShowPanel(true)}
        className="mb-4"
        icon={<PenTool className="h-4 w-4" />}
      >
        Replacement Insights
      </Button>
    );
  }

  return (
    <>
      {!showPanel ? (
        <Button
          variant="outline"
          onClick={() => setShowPanel(true)}
          className="mb-4"
          icon={<PenTool className="h-4 w-4" />}
        >
          Replacement Insights
        </Button>
      ) : (
        <CollapsibleSection
          title="🔧 Replacement Parts Insights"
          icon={<PenTool className="h-5 w-5" />}
          iconColor="text-slate-600"
          defaultExpanded={true}
        >
          <div className="space-y-4">
            {/* Alerts Section */}
            {aiAlerts.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                    <h3 className="text-orange-800 font-medium">
                      AI Alerts: Parts Replacement
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAlerts(!showAlerts)}
                    icon={
                      showAlerts ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )
                    }
                  >
                    {showAlerts
                      ? "Hide Alerts"
                      : `Show Alerts (${aiAlerts.length})`}
                  </Button>
                </div>

                {showAlerts && (
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {aiAlerts.map((alert, index) => (
                      <div
                        key={index}
                        className="bg-white p-2 rounded-md text-sm text-orange-700 border border-orange-100"
                      >
                        {alert}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Parts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {partDefinitions.map((partDef) => {
                const part = partsData[partDef.id];
                if (!part) return null;

                const lifeStatus = getLifeStatus(part.lifeRemaining);

                return (
                  <div
                    key={partDef.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {part.icon}
                        <h3 className="font-medium ml-2">{part.partName}</h3>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${lifeStatus.color}`}
                      >
                        {lifeStatus.text}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Replaced:</span>
                        <span className="font-medium">
                          {formatDate(part.lastReplacedDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Vehicles Affected:
                        </span>
                        <span className="font-medium">{part.vehicleCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg. Cost:</span>
                        <span className="font-medium">
                          ₹
                          {part.averageCost
                            ? part.averageCost.toLocaleString("en-IN", {
                                maximumFractionDigits: 0,
                              })
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max. km Since:</span>
                        <span className="font-medium">
                          {part.maxKmSinceReplacement
                            ? part.maxKmSinceReplacement.toLocaleString("en-IN")
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {part.lifeRemaining !== undefined && (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              part.lifeRemaining < 15
                                ? "bg-red-500"
                                : part.lifeRemaining < 40
                                ? "bg-orange-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${part.lifeRemaining}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right mt-1">
                          {part.lifeRemaining.toFixed(0)}% life remaining
                        </p>
                      </div>
                    )}

                    {part.alerts && part.alerts.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center text-orange-600 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span>
                            {part.alerts.length}{" "}
                            {part.alerts.length === 1 ? "alert" : "alerts"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowPanel(false)}>
                Close Panel
              </Button>
            </div>
          </div>
        </CollapsibleSection>
      )}
    </>
  );
};

export default ReplacementInsightsPanel;
