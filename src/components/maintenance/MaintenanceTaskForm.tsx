import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Vehicle } from "@/types";
import { MaintenanceTask } from "@/types/maintenance";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import FileUpload from "../ui/FileUpload";
import GarageSelector from "./GarageSelector";
import RefactoredVehicleSelector from "./RefactoredVehicleSelector";
import TaskTypeSelector from "./TaskTypeSelector";
import PriorityButtonSelector from "./PriorityButtonSelector";
import MaintenanceAuditLog from "./MaintenanceAuditLog";
import ServiceGroupsSection from "./ServiceGroupsSection";
import ComplaintResolutionSection from "./ComplaintResolutionSection";
import NextServiceReminderSection from "./NextServiceReminderSection";
import DocumentsSection from "./DocumentsSection";
import EnhancedDowntimeSection from "./EnhancedDowntimeSection";
import {
  PenTool as PenToolIcon,
  Calendar,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Bell,
} from "lucide-react";
import { predictNextService } from "../../utils/maintenancePredictor";
import { getAuditLogs } from "../../utils/maintenanceStorage";
import { toast } from "react-toastify";
import { getLatestOdometer } from "../../utils/storage";
import { cn } from "../../utils/cn";
import { standardizeDate, validateDate, validateDateRange, formatDateForInput } from "../../utils/dateValidation";

const DOWNTIME_PRESETS = [
  { id: "2h", label: "2 h", days: 0, hours: 2 },
  { id: "4h", label: "4 h", days: 0, hours: 4 },
  { id: "6h", label: "6 h", days: 0, hours: 6 },
  { id: "8h", label: "8 h", days: 0, hours: 8 },
  { id: "1d", label: "1 d", days: 1, hours: 0 },
  { id: "2d", label: "2 d", days: 2, hours: 0 },
  { id: "3d", label: "3 d", days: 3, hours: 0 },
];

const isClose = (a: number, b: number, tolerance = 0.01) =>
  Math.abs(a - b) < tolerance;


interface MaintenanceTaskFormProps {
  onSubmit: (data: Partial<MaintenanceTask>) => void;
  vehicles: Vehicle[];
  initialData?: Partial<MaintenanceTask>;
  isSubmitting?: boolean;
}

const MaintenanceTaskForm: React.FC<MaintenanceTaskFormProps> = ({
  onSubmit,
  vehicles,
  initialData,
  isSubmitting,
}) => {
  const [setReminder, setSetReminder] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<{
    averageReplacementKm?: number;
    averageReplacementDays?: number;
    confidence: number;
  }>({
    confidence: 0,
  });

  const methods = useForm<Partial<MaintenanceTask>>({
    defaultValues: {
      task_type: "general_scheduled_service",
      priority: "medium",
      status: "open",
      estimated_cost: 0,
      parts_required: [],
      start_date: new Date().toISOString().split("T")[0],
      title: [],
      warranty_claimed: false,
      downtime_days: 0,
      downtime_hours: 0,
      service_groups:
        initialData?.service_groups && initialData.service_groups.length > 0
          ? initialData.service_groups
          : [
              {
                vendor_id: "",
                tasks: [],
                cost: 0,
                battery_tracking: false,
                tyre_tracking: false,
              },
            ],
      ...initialData,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  
  // Standardize dates to prevent crashes from invalid dates
  const standardizedStartDate = startDate ? standardizeDate(startDate) : null;
  const standardizedEndDate = endDate ? standardizeDate(endDate) : null;
  const vehicleId = watch("vehicle_id");
  const odometerReading = watch("odometer_reading");
  const downtimeDays = watch("downtime_days");
  const downtimeHours = watch("downtime_hours");
  const taskType = watch("task_type");
  const title = watch("title");
  const serviceGroupsWatch = watch("service_groups");

  // Get current values of the text areas for speech-to-text functionality
  const complaintDescription = watch("complaint_description") || "";
  const resolutionSummary = watch("resolution_summary") || "";

  // Handle speech-to-text transcripts
  const handleComplaintTranscript = (text: string) => {
    setValue(
      "complaint_description",
      complaintDescription ? `${complaintDescription} ${text}` : text
    );
  };

  const handleResolutionTranscript = (text: string) => {
    setValue(
      "resolution_summary",
      resolutionSummary ? `${resolutionSummary} ${text}` : text
    );
  };

  const initialVehicleIdRef = useRef(initialData?.vehicle_id);
  const skipInitialOdometerPrefillRef = useRef(true);

  const selectedDowntimePreset = useMemo(() => {
    if (typeof downtimeDays !== "number" || typeof downtimeHours !== "number" || 
        Number.isNaN(downtimeDays) || Number.isNaN(downtimeHours)) {
      return "custom";
    }

    const presetMatch = DOWNTIME_PRESETS.find((preset) =>
      preset.days === downtimeDays && preset.hours === downtimeHours
    );

    return presetMatch?.id ?? "custom";
  }, [downtimeDays, downtimeHours]);

  const downtimeSummary = useMemo(() => {
    if ((typeof downtimeDays !== "number" || downtimeDays <= 0) && 
        (typeof downtimeHours !== "number" || downtimeHours <= 0)) {
      return "No downtime selected";
    }

    const totalHours = (downtimeDays || 0) * 24 + (downtimeHours || 0);
    
    if (totalHours < 24) {
      return `${totalHours} hrs`;
    }

    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    if (days > 0 && remainingHours > 0) {
      return `${days} day${days === 1 ? "" : "s"} ${remainingHours} hr${remainingHours === 1 ? "" : "s"}`;
    } else if (days > 0) {
      return `${days} day${days === 1 ? "" : "s"}`;
    } else {
      return `${remainingHours} hr${remainingHours === 1 ? "" : "s"}`;
    }
  }, [downtimeDays, downtimeHours]);

  // Fetch audit logs asynchronously
  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (initialData?.id) {
        try {
          const logs = await getAuditLogs();
          if (Array.isArray(logs)) {
            setAuditLogs(logs.filter((log) => log.task_id === initialData.id));
          } else {
            setAuditLogs([]);
          }
        } catch (error) {
          console.error("Error fetching audit logs:", error);
          setAuditLogs([]);
        }
      } else {
        setAuditLogs([]);
      }
    };

    fetchAuditLogs();
  }, [initialData?.id]);

  // Keep downtime in sync with selected end date
  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    try {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (
        Number.isNaN(parsedStartDate.getTime()) ||
        Number.isNaN(parsedEndDate.getTime())
      ) {
        return;
      }

      const diffMs = parsedEndDate.getTime() - parsedStartDate.getTime();
      if (diffMs < 0) {
        return;
      }

      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const normalized = parseFloat(diffDays.toFixed(4));

      if (
        typeof downtimeDays !== "number" ||
        Number.isNaN(downtimeDays) ||
        !isClose(downtimeDays, normalized, 0.01)
      ) {
        setValue("downtime_days", normalized, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      console.error("Error calculating downtime days:", error);
    }
  }, [startDate, endDate, downtimeDays, setValue]);

  // Update end date when downtime selection changes
  useEffect(() => {
    if (!startDate) {
      return;
    }

    if (typeof downtimeDays !== "number" || Number.isNaN(downtimeDays)) {
      return;
    }

    try {
      const parsedStartDate = new Date(startDate);
      if (Number.isNaN(parsedStartDate.getTime())) {
        return;
      }

      const milliseconds = Math.round(downtimeDays * 24 * 60 * 60 * 1000);
      const calculatedEndDate = new Date(parsedStartDate.getTime() + milliseconds);
      const formattedEndDate = calculatedEndDate.toISOString().split("T")[0];

      if (formattedEndDate !== endDate) {
        setValue("end_date", formattedEndDate, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      console.error("Error updating end date from downtime:", error);
    }
  }, [startDate, downtimeDays, endDate, setValue]);

  // Auto-fill odometer reading based on latest trip for the selected vehicle
  useEffect(() => {
    if (!vehicleId) return;

    let isMounted = true;

    const fetchLastOdometer = async () => {
      if (skipInitialOdometerPrefillRef.current) {
        skipInitialOdometerPrefillRef.current = false;

        if (
          initialData?.id &&
          initialVehicleIdRef.current &&
          initialVehicleIdRef.current === vehicleId &&
          typeof initialData.odometer_reading === "number"
        ) {
          return;
        }
      }

      try {
        const { value } = await getLatestOdometer(vehicleId);
        const fallback = vehicles.find((v) => v.id === vehicleId)?.current_odometer;
        const resolvedValue =
          Number.isFinite(value) && value >= 0 ? value : fallback;

        if (isMounted && typeof resolvedValue === "number") {
          const currentReadingRaw = getValues("odometer_reading");
          const currentReading =
            typeof currentReadingRaw === "number"
              ? currentReadingRaw
              : parseFloat(String(currentReadingRaw));

          if (
            !Number.isFinite(currentReading) ||
            Math.abs(currentReading - resolvedValue) > 0.5
          ) {
            setValue("odometer_reading", resolvedValue, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest odometer reading:", err);
        const fallback = vehicles.find((v) => v.id === vehicleId)?.current_odometer;

        if (isMounted && typeof fallback === "number") {
          const currentReadingRaw = getValues("odometer_reading");
          const currentReading =
            typeof currentReadingRaw === "number"
              ? currentReadingRaw
              : parseFloat(String(currentReadingRaw));

          if (
            !Number.isFinite(currentReading) ||
            Math.abs(currentReading - fallback) > 0.5
          ) {
            setValue("odometer_reading", fallback, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }
      }

      if (isMounted) {
        initialVehicleIdRef.current = vehicleId;
      }
    };

    fetchLastOdometer();

    return () => {
      isMounted = false;
    };
  }, [vehicleId, setValue, getValues, vehicles, initialData?.id, initialData?.odometer_reading]);

  // Calculate total cost from service groups
  useEffect(() => {
    if (serviceGroupsWatch && serviceGroupsWatch.length > 0) {
      const totalCost = serviceGroupsWatch.reduce((sum, group) => {
        return sum + (parseFloat(group.cost as any) || 0);
      }, 0);
      setValue("actual_cost", totalCost);
    }
  }, [serviceGroupsWatch, setValue]);

  useEffect(() => {
    if (vehicleId && odometerReading) {
      const prediction = predictNextService(vehicleId, odometerReading);
      if (prediction) {
        setValue("next_predicted_service", prediction);
      }
    }
  }, [vehicleId, odometerReading, setValue]);

  useEffect(() => {
    if (vehicleId && odometerReading && title?.length > 0) {
      // Calculate AI suggestions based on historical data
      const suggestions = predictNextService(vehicleId, odometerReading);
      if (suggestions) {
        setAiSuggestions(suggestions);
      }
    }
  }, [vehicleId, odometerReading, title]);

  const validateFormData = (data: any): string | null => {
    // Vehicle validation
    if (!data.vehicle_id) {
      return "Please select a vehicle";
    }

    // Date validation
    if (!data.start_date) {
      return "Please set a start date";
    }

    // Check if start date is not in the future (optional validation)
    const startDate = new Date(data.start_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (startDate > today) {
      return "Start date cannot be in the future";
    }

    // Odometer validation
    if (!data.odometer_reading || data.odometer_reading < 0) {
      return "Please enter a valid odometer reading";
    }

    // Service groups validation
    if (!Array.isArray(data.service_groups) || data.service_groups.length === 0) {
      return "Please add at least one service group";
    }

    // Validate each service group
    for (let i = 0; i < data.service_groups.length; i++) {
      const group = data.service_groups[i];
      
      if (!group.vendor_id) {
        return `Please select a vendor for service group ${i + 1}`;
      }

      if (!Array.isArray(group.tasks) || group.tasks.length === 0) {
        return `Please select at least one task for service group ${i + 1}`;
      }

      if (!group.cost || group.cost < 0) {
        return `Please enter a valid cost for service group ${i + 1}`;
      }

      // Battery tracking validation
      if (group.battery_tracking) {
        if (!group.battery_serial) {
          return `Please enter battery serial number for service group ${i + 1}`;
        }
        if (!group.battery_brand) {
          return `Please select battery brand for service group ${i + 1}`;
        }
        if (!group.battery_warranty_expiry_date) {
          return `Please set battery warranty expiry date for service group ${i + 1}`;
        }
      }

      // Tyre tracking validation
      if (group.tyre_tracking) {
        if (!Array.isArray(group.tyre_positions) || group.tyre_positions.length === 0) {
          return `Please select at least one tyre position for service group ${i + 1}`;
        }
        if (!group.tyre_brand) {
          return `Please select tyre brand for service group ${i + 1}`;
        }
        if (!group.tyre_warranty_expiry_date) {
          return `Please set tyre warranty expiry date for service group ${i + 1}`;
        }
      }
    }

    // Priority validation
    if (!data.priority) {
      return "Please select a priority level";
    }

    // Status validation
    if (!data.status) {
      return "Please select a status";
    }

    return null; // No validation errors
  };

  const handleFormSubmit = (data: any) => {
    try {
      // Comprehensive validation
      const validationError = validateFormData(data);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      onSubmit(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        "Form submission failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Vehicle & Basic Info */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Truck className="h-5 w-5 mr-2 text-primary-500" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Controller
              control={control}
              name="vehicle_id"
              rules={{ 
                required: "Vehicle is required",
                validate: (value) => value !== "" || "Please select a vehicle"
              }}
              render={({ field }) => (
                <RefactoredVehicleSelector
                  selectedVehicle={field.value}
                  onChange={field.onChange}
                  vehicles={vehicles}
                  error={errors.vehicle_id?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="task_type"
              rules={{ required: "Task type is required" }}
              render={({ field }) => (
                <TaskTypeSelector
                  selectedTaskType={field.value}
                  onChange={field.onChange}
                  error={errors.task_type?.message}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="priority"
            rules={{ required: "Priority is required" }}
            render={({ field }) => (
              <PriorityButtonSelector
                value={field.value}
                onChange={field.onChange}
                error={errors.priority?.message}
                required
              />
            )}
          />
        </div>

        {/* Maintenance Tasks */}
        <ServiceGroupsSection />

        {/* Complaint & Resolution */}
        <ComplaintResolutionSection
          onComplaintTranscript={handleComplaintTranscript}
          onResolutionTranscript={handleResolutionTranscript}
        />

        {/* Service Details */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
          <h3 className="text-lg font-medium text-gray-900">Service Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="Start Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              error={errors.start_date?.message}
              required
              {...register("start_date", {
                required: "Start date is required",
                validate: (value) => {
                  // Standardize the date first
                  const standardizedDate = standardizeDate(value);
                  if (!standardizedDate) {
                    return "Invalid date format";
                  }
                  
                  // Validate the date
                  const dateValidation = validateDate(standardizedDate);
                  if (!dateValidation.isValid) {
                    return dateValidation.error;
                  }
                  
                  // Validate date range with end date
                  if (standardizedEndDate) {
                    const rangeValidation = validateDateRange(standardizedDate, standardizedEndDate);
                    if (!rangeValidation.isValid) {
                      return rangeValidation.error;
                    }
                  }
                  
                  return true;
                }
              })}
            />

            <Input
              label="End Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              error={errors.end_date?.message}
              {...register("end_date", {
                validate: (value) => {
                  if (!value) return true; // End date is optional
                  
                  // Standardize the date first
                  const standardizedDate = standardizeDate(value);
                  if (!standardizedDate) {
                    return "Invalid date format";
                  }
                  
                  // Validate the date
                  const dateValidation = validateDate(standardizedDate);
                  if (!dateValidation.isValid) {
                    return dateValidation.error;
                  }
                  
                  // Validate date range with start date
                  if (standardizedStartDate) {
                    const rangeValidation = validateDateRange(standardizedStartDate, standardizedDate);
                    if (!rangeValidation.isValid) {
                      return rangeValidation.error;
                    }
                  }
                  
                  return true;
                }
              })}
            />

            <EnhancedDowntimeSection />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Odometer Reading"
              type="number"
              icon={<PenToolIcon className="h-4 w-4" />}
              error={errors.odometer_reading?.message}
              required
              {...register("odometer_reading", {
                required: "Odometer reading is required",
                valueAsNumber: true,
                min: { value: 0, message: "Odometer reading must be positive" },
                max: { value: 999999, message: "Odometer reading seems too high" },
                validate: (value) => {
                  if (isNaN(value)) return "Please enter a valid number";
                  if (value < 0) return "Odometer reading cannot be negative";
                  return true;
                }
              })}
            />
            
            <Controller
              control={control}
              name="odometer_image"
              render={({ field: { value, onChange } }) => (
                <FileUpload
                  label="Odometer Photo"
                  value={value as File[] | null}
                  onChange={onChange}
                  accept=".jpg,.jpeg,.png"
                  helperText="Upload photo of odometer reading"
                  icon={<PenToolIcon className="h-4 w-4" />}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="status"
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <Select
                label="Status"
                icon={<AlertTriangle className="h-4 w-4" />}
                options={[
                  { value: "open", label: "Open" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "resolved", label: "Resolved" },
                  { value: "escalated", label: "Escalated" },
                  { value: "rework", label: "Rework Required" },
                ]}
                error={errors.status?.message}
                required
                {...field}
              />
            )}
          />
        </div>

        {/* Next Service Reminder */}
        <NextServiceReminderSection
          reminder={setReminder}
          onToggle={setSetReminder}
          odometerReading={odometerReading}
        />

        {/* Documents */}
        <DocumentsSection />

        {/* AI Suggestions */}
        {aiSuggestions.averageReplacementKm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div>
                <h4 className="text-blue-700 font-medium">
                  AI-Suggested Maintenance Intervals
                </h4>
                <p className="text-blue-600 text-sm mt-1">
                  Based on historical data, this maintenance is typically
                  needed:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700">
                  <li>
                    Every{" "}
                    {Math.round(
                      aiSuggestions.averageReplacementKm
                    ).toLocaleString()}{" "}
                    km
                  </li>
                  {aiSuggestions.averageReplacementDays && (
                    <li>
                      Every {Math.round(aiSuggestions.averageReplacementDays)}{" "}
                      days
                    </li>
                  )}
                </ul>
                <p className="text-blue-500 text-xs mt-2">
                  Confidence: {Math.round(aiSuggestions.confidence)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log */}
        {initialData?.id && auditLogs && auditLogs.length > 0 && (
          <div className="mt-8">
            <MaintenanceAuditLog taskId={initialData.id} logs={auditLogs} />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-wrap justify-end gap-4 pt-4 border-t border-gray-200">
          <Button
            type="submit"
            isLoading={isSubmitting}
            icon={<CheckCircle className="h-4 w-4" />}
          >
            {initialData ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default MaintenanceTaskForm;

