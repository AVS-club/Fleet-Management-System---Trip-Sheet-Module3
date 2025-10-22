import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { Vehicle } from "@/types";
import { MaintenanceTask } from "@/types/maintenance";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import FileUploadWithProgress from "../ui/FileUploadWithProgress";
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
  Upload,
  FileText,
  Image
} from "lucide-react";
import { predictNextService } from "../../utils/maintenancePredictor";
import { getAuditLogs } from "../../utils/maintenanceStorage";
import { toast } from "react-toastify";
import { getLatestOdometer } from "../../utils/storage";
import { cn } from "../../utils/cn";
import { standardizeDate, validateDate, validateDateRange, formatDateForInput } from "../../utils/dateValidation";
import "../../styles/FileUploadWithProgress.css";
import { createLogger } from '../../utils/logger';

const logger = createLogger('EnhancedMaintenanceTaskForm');

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

interface EnhancedMaintenanceTaskFormProps {
  onSubmit: (data: Partial<MaintenanceTask>) => void;
  vehicles: Vehicle[];
  initialData?: Partial<MaintenanceTask>;
  isSubmitting: boolean;
}

const EnhancedMaintenanceTaskForm: React.FC<EnhancedMaintenanceTaskFormProps> = ({
  onSubmit,
  vehicles,
  initialData,
  isSubmitting: externalIsSubmitting,
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

  // Enhanced file upload states
  const [odometerPhoto, setOdometerPhoto] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

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

  // Load audit logs when vehicle changes
  useEffect(() => {
    if (vehicleId) {
      const loadAuditLogs = async () => {
        try {
          const logs = await getAuditLogs(vehicleId);
          setAuditLogs(logs || []);
        } catch (error) {
          logger.error("Error loading audit logs:", error);
          setAuditLogs([]);
        }
      };
      loadAuditLogs();
    }
  }, [vehicleId]);

  // Load latest odometer reading when vehicle changes
  useEffect(() => {
    if (vehicleId && !odometerReading) {
      const loadLatestOdometer = async () => {
        try {
          const latest = await getLatestOdometer(vehicleId);
          if (latest) {
            setValue("odometer_reading", latest);
          }
        } catch (error) {
          logger.error("Error loading latest odometer:", error);
        }
      };
      loadLatestOdometer();
    }
  }, [vehicleId, odometerReading, setValue]);

  // AI suggestions for next service
  useEffect(() => {
    if (vehicleId && taskType && odometerReading) {
      const getSuggestions = async () => {
        try {
          const suggestions = await predictNextService(
            vehicleId,
            parseInt(odometerReading.toString())
          );
          setAiSuggestions(suggestions);
        } catch (error) {
          logger.error("Error getting AI suggestions:", error);
          setAiSuggestions({ confidence: 0 });
        }
      };
      getSuggestions();
    }
  }, [vehicleId, taskType, odometerReading]);

  // Enhanced form submission with progress tracking
  const handleFormSubmit = useCallback(async (data: Partial<MaintenanceTask>) => {
    if (isSubmitting || externalIsSubmitting) return;
    
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    setOverallProgress(0);
    
    try {
      // Comprehensive validation
      const validationError = validateFormData(data);
      if (validationError) {
        throw new Error(validationError);
      }

      // Prepare form data with enhanced file uploads
      const formData = {
        ...data,
        odometer_image: odometerPhoto,
        attachments: documents,
      };
      
      setOverallProgress(10);
      
      // Simulate upload progress (replace with actual upload logic)
      const uploadProgress = setInterval(() => {
        setOverallProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadProgress);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Submit the form
      await onSubmit(formData);
      
      setOverallProgress(100);
      setSubmitSuccess(true);
      
      logger.debug('✅ Task created successfully');
      
      // Show success for 2 seconds then reset
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsSubmitting(false);
        setOverallProgress(0);
      }, 2000);
      
    } catch (error) {
      logger.error('❌ Submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create task');
      setIsSubmitting(false);
      setOverallProgress(0);
    }
  }, [isSubmitting, externalIsSubmitting, odometerPhoto, documents, onSubmit]);

  // Validation function
  const validateFormData = (data: Partial<MaintenanceTask>): string | null => {
    if (!data.vehicle_id) {
      return "Vehicle selection is required";
    }
    if (!data.start_date) {
      return "Start date is required";
    }
    if (!data.end_date) {
      return "End date is required";
    }
    if (!data.odometer_reading) {
      return "Odometer reading is required";
    }
    if (!data.garage_id && (!data.service_groups || data.service_groups.length === 0)) {
      return "At least one service group or garage is required";
    }

    // Validate date range
    if (data.start_date && data.end_date) {
      const dateValidation = validateDateRange(data.start_date, data.end_date);
      if (dateValidation !== null) {
        return dateValidation;
      }
    }

    return null; // No validation errors
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
            <RefactoredVehicleSelector
              vehicles={vehicles}
              error={errors.vehicle_id?.message}
            />
            <TaskTypeSelector error={errors.task_type?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <GarageSelector error={errors.garage_id?.message} />
            <PriorityButtonSelector error={errors.priority?.message} />
          </div>
        </div>

        {/* Service Period */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary-500" />
            Service Period
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Input
                label="Start Date *"
                type="date"
                {...register("start_date", { required: "Start date is required" })}
                error={errors.start_date?.message}
              />
            </div>
            <div>
              <Input
                label="End Date *"
                type="date"
                {...register("end_date", { required: "End date is required" })}
                error={errors.end_date?.message}
              />
            </div>
          </div>
        </div>

        {/* Enhanced Downtime Section */}
        <EnhancedDowntimeSection />

        {/* Odometer Reading with Enhanced File Upload */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Truck className="h-5 w-5 mr-2 text-primary-500" />
            Vehicle Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Odometer Reading *"
              type="number"
              {...register("odometer_reading", { required: "Odometer reading is required" })}
              error={errors.odometer_reading?.message}
              placeholder="Enter current odometer reading"
            />
            <Select
              label="Status *"
              {...register("status", { required: "Status is required" })}
              error={errors.status?.message}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          {/* Enhanced Odometer Photo Upload */}
          <FileUploadWithProgress
            id="odometerPhoto"
            label="Odometer Photo"
            accept="image/jpeg,image/jpg,image/png"
            multiple={false}
            compress={true}
            maxSize={5 * 1024 * 1024}
            onFilesChange={setOdometerPhoto}
            helperText="Upload a clear photo of the odometer reading"
          />
        </div>

        {/* Enhanced Documents Section */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-500" />
            Supporting Documents
          </h3>

          <FileUploadWithProgress
            id="documents"
            label="Documents"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            compress={false}
            maxSize={10 * 1024 * 1024}
            onFilesChange={setDocuments}
            helperText="Upload warranty cards, bills, or other relevant documents"
          />
        </div>

        {/* Service Groups */}
        <ServiceGroupsSection />

        {/* Complaint & Resolution */}
        <ComplaintResolutionSection />

        {/* Next Service Reminder */}
        <NextServiceReminderSection
          setReminder={setReminder}
          setSetReminder={setSetReminder}
          aiSuggestions={aiSuggestions}
        />

        {/* Audit Log */}
        {auditLogs.length > 0 && (
          <MaintenanceAuditLog auditLogs={auditLogs} />
        )}

        {/* Error Message */}
        {submitError && (
          <div className="alert alert-error">
            <AlertTriangle className="h-5 w-5" />
            {submitError}
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="alert alert-success">
            <CheckCircle className="h-5 w-5" />
            Task created successfully!
          </div>
        )}

        {/* Overall Progress Bar (during submission) */}
        {isSubmitting && (
          <div className="overall-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="progress-text">
              Uploading... {overallProgress}%
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || externalIsSubmitting || submitSuccess}
            className={cn(
              "px-8 py-3 text-lg font-semibold",
              submitSuccess && "bg-green-600 hover:bg-green-700"
            )}
            icon={
              submitSuccess ? (
                <CheckCircle className="h-5 w-5" />
              ) : isSubmitting ? (
                <div className="spinner" />
              ) : (
                <PenToolIcon className="h-5 w-5" />
              )
            }
          >
            {submitSuccess
              ? "Task Created!"
              : isSubmitting
              ? `Creating Task... ${overallProgress}%`
              : "Create Task"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default EnhancedMaintenanceTaskForm;
