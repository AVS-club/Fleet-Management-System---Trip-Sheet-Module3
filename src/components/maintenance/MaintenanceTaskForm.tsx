import React, { useState, useEffect } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Vehicle } from "../../types";
import { MaintenanceTask } from "@/types/maintenance";
import { addDays, addHours, format } from "date-fns";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import GarageSelector from "./GarageSelector";
import MaintenanceAuditLog from "./MaintenanceAuditLog";
import ServiceGroupsSection from "./ServiceGroupsSection";
import ComplaintResolutionSection from "./ComplaintResolutionSection";
import NextServiceReminderSection from "./NextServiceReminderSection";
import DocumentsSection from "./DocumentsSection";
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
import { supabase } from "../../utils/supabaseClient";
import { toast } from "react-toastify";

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
      downtime_period: "2hr", // Default to 2 hours
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
    formState: { errors },
  } = methods;

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const vehicleId = watch("vehicle_id");
  const odometerReading = watch("odometer_reading");
  const taskType = watch("task_type");
  const title = watch("title");
  const serviceGroupsWatch = watch("service_groups");
  const downtimePeriod = watch("downtime_period");

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

  // Calculate end date based on start date and downtime period
  useEffect(() => {
    if (startDate && downtimePeriod && downtimePeriod !== "custom") {
      try {
        // Parse the start date
        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          console.error("Invalid start date");
          return;
        }

        let newEndDate: Date;

        // Calculate end date based on downtime period
        if (downtimePeriod.includes("hr")) {
          // Extract hours from the period (e.g., "4hr" → 4)
          const hours = parseInt(downtimePeriod.replace("hr", ""), 10);
          newEndDate = addHours(parsedStartDate, hours);
        } else if (downtimePeriod === "1day") {
          newEndDate = addDays(parsedStartDate, 1);
        } else if (downtimePeriod === "2days") {
          newEndDate = addDays(parsedStartDate, 2);
        } else if (downtimePeriod === "3days") {
          newEndDate = addDays(parsedStartDate, 3);
        } else if (downtimePeriod === "1week") {
          newEndDate = addDays(parsedStartDate, 7);
        } else {
          // For any other case, don't modify the end date
          return;
        }

        // Format the end date as YYYY-MM-DD
        const formattedEndDate = format(newEndDate, "yyyy-MM-dd");
        setValue("end_date", formattedEndDate);

        // Calculate downtime days
        const downtimeDays =
          downtimePeriod.includes("day") || downtimePeriod === "1week"
            ? Math.round(
                (newEndDate.getTime() - parsedStartDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;
        setValue("downtime_days", downtimeDays);
      } catch (error) {
        console.error("Error calculating end date:", error);
      }
    } else if (downtimePeriod === "custom") {
      // If custom is selected, clear the end date to let the user set it manually
      setValue("end_date", "");
      setValue("downtime_days", 0);
    }
  }, [startDate, downtimePeriod, setValue]);

  // Auto-fill odometer reading based on vehicle and start date
  useEffect(() => {
    const fetchLastOdometer = async () => {
      if (!vehicleId || !startDate) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("Error fetching user data");
        return;
      }

      try {
        // Query the trips table to find the latest trip for this vehicle before the start date
        const { data, error } = await supabase
          .from("trips")
          .select("end_km")
          .eq("added_by", user.id)
          .eq("vehicle_id", vehicleId)
          .lt("trip_end_date", startDate)
          .order("trip_end_date", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Error fetching last odometer reading:", error);
          return;
        }

        if (data && data.length > 0 && data[0].end_km) {
          // Set the odometer reading to the end_km of the last trip
          setValue("odometer_reading", data[0].end_km);
        } else {
          // If no trips found, try to use the current_odometer from the vehicle
          const vehicle = vehicles.find((v) => v.id === vehicleId);
          if (vehicle && vehicle.current_odometer) {
            setValue("odometer_reading", vehicle.current_odometer);
          }
        }
      } catch (err) {
        console.error("Failed to fetch last odometer reading:", err);
      }
    };

    fetchLastOdometer();
  }, [vehicleId, startDate, setValue, vehicles]);

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

  const handleFormSubmit = (data: any) => {
    try {

      // Basic validation
      if (!data.vehicle_id) {
        toast.error("Please select a vehicle");
        return;
      }

      // if (!data.garage_id) {
      //   toast.error("Please select a garage");
      //   return;
      // }

      if (!data.start_date) {
        toast.error("Please set a start date");
        return;
      }

      if (
        (!Array.isArray(data.title) || data.title.length === 0) &&
        (!Array.isArray(data.service_groups) ||
          !data.service_groups.length ||
          !data.service_groups[0].tasks ||
          !data.service_groups[0].tasks.length)
      ) {
        toast.error("Please select at least one maintenance task");
        return;
      }

      if (!data.service_groups?.[0]?.vendor_id) {
        toast.error("Please select a vendor for the service");
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
              rules={{ required: "Vehicle is required" }}
              render={({ field }) => (
                <Select
                  label="Vehicle"
                  icon={<Truck className="h-4 w-4" />}
                  options={vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`,
                  }))}
                  error={errors.vehicle_id?.message}
                  required
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name="task_type"
              rules={{ required: "Task type is required" }}
              render={({ field }) => (
                <Select
                  label="Maintenance Type"
                  icon={<PenToolIcon className="h-4 w-4" />}
                  options={[
                    {
                      value: "general_scheduled_service",
                      label: "General Scheduled Service",
                    },
                    {
                      value: "wear_and_tear_replacement_repairs",
                      label: "Wear and Tear / Replacement Repairs",
                    },
                    { value: "accidental", label: "Accidental" },
                    { value: "others", label: "Others" },
                  ]}
                  error={errors.task_type?.message}
                  required
                  {...field}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="priority"
            rules={{ required: "Priority is required" }}
            render={({ field }) => (
              <Select
                label="Priority"
                icon={<AlertTriangle className="h-4 w-4" />}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" },
                ]}
                error={errors.priority?.message}
                required
                {...field}
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
              })}
            />

            <Input
              label="End Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              error={errors.end_date?.message}
              {...register("end_date")}
            />

            <Controller
              control={control}
              name="downtime_period"
              defaultValue="2hr"
              render={({ field }) => (
                <Select
                  label="Downtime Period"
                  icon={<Clock className="h-4 w-4" />}
                  options={[
                    { value: "2hr", label: "2 Hours" },
                    { value: "4hr", label: "4 Hours" },
                    { value: "6hr", label: "6 Hours" },
                    { value: "12hr", label: "12 Hours" },
                    { value: "1day", label: "1 Day" },
                    { value: "2days", label: "2 Days" },
                    { value: "3days", label: "3 Days" },
                    { value: "1week", label: "1 Week" },
                    { value: "custom", label: "Custom" },
                  ]}
                  {...field}
                />
              )}
            />
          </div>

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
            })}
          />

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
