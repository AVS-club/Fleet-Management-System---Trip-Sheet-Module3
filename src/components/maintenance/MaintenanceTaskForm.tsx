import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm, FormProvider, Controller, useFormContext } from "react-hook-form";
import { Vehicle } from "@/types";
import { MaintenanceTask } from "@/types/maintenance";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import FileUploadWithProgress from "../ui/FileUploadWithProgress";
import GarageSelector from "./GarageSelector";
import VehicleSelector from "./VehicleSelector";
import TaskTypeSelector from "./TaskTypeSelector";
import PriorityButtonSelector from "./PriorityButtonSelector";
import ServiceGroupsSection from "./ServiceGroupsSection";
import ComplaintResolutionSection from "./ComplaintResolutionSection";
import NextServiceReminderSection from "./NextServiceReminderSection";
import {
  Gauge,
  Calendar,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Bell,
  Wrench,
  FileText,
  ChevronLeft,
  CircleDot,
} from "lucide-react";
import { predictNextService } from "../../utils/maintenancePredictor";
import { toast } from "react-toastify";
import { getLatestOdometer } from "../../utils/storage";
import { cn } from "../../utils/cn";
import { standardizeDate, validateDate, validateDateRange, formatDateForInput } from "../../utils/dateValidation";
import { createLogger } from '../../utils/logger';
import "../../styles/maintenanceFormUpdates.css";
import "../../styles/FileUploadWithProgress.css";

const logger = createLogger('MaintenanceTaskForm');

// ServiceDetailsSection component
const ServiceDetailsSection = () => {
  const { watch, setValue, register } = useFormContext();
  const [selectedOption, setSelectedOption] = useState('');
  const [displayStartTime] = useState('10:00');
  const [displayEndTime, setDisplayEndTime] = useState('10:00');
  
  // Watch form values
  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const downtimeDays = watch('downtime_days') || 0;
  const downtimeHours = watch('downtime_hours') || 0;
  
  // Set today's date as default
  useEffect(() => {
    if (!startDate) {
      setValue('start_date', new Date().toISOString().split('T')[0]);
    }
  }, [startDate, setValue]);

  // Initialize selected option based on downtime values (for edit mode)
  useEffect(() => {
    if (downtimeDays || downtimeHours) {
      const presets = [
        { id: '2h', days: 0, hours: 2 },
        { id: '4h', days: 0, hours: 4 },
        { id: '6h', days: 0, hours: 6 },
        { id: '8h', days: 0, hours: 8 },
        { id: '1d', days: 1, hours: 0 },
        { id: '2d', days: 2, hours: 0 },
        { id: '3d', days: 3, hours: 0 },
      ];

      const matchingPreset = presets.find(p => p.days === downtimeDays && p.hours === downtimeHours);
      if (matchingPreset && selectedOption !== matchingPreset.id) {
        setSelectedOption(matchingPreset.id);
      }
    }
  }, [downtimeDays, downtimeHours]); // Only run when downtime values change

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setValue('start_date', newDate);
    
    // If a quick select is active, recalculate end date
    if (downtimeDays > 0 || downtimeHours > 0) {
      const start = new Date(newDate);
      if (downtimeHours > 0 && downtimeDays === 0) {
        setValue('end_date', start.toISOString().split('T')[0]);
        const endHour = (10 + downtimeHours) % 24;
        setDisplayEndTime(`${endHour.toString().padStart(2, '0')}:00`);
      } else {
        const end = new Date(start.getTime() + downtimeDays * 24 * 60 * 60 * 1000);
        setValue('end_date', end.toISOString().split('T')[0]);
        setDisplayEndTime('10:00');
      }
    }
  };

  // Handle quick select
  const handleQuickSelect = (days: number, hours: number, optionId: string) => {
    setSelectedOption(optionId);
    setValue('downtime_days', days);
    setValue('downtime_hours', hours);
    
    const start = new Date(startDate || new Date().toISOString().split('T')[0]);
    
    if (hours > 0 && days === 0) {
      // For hours: same date
      setValue('end_date', start.toISOString().split('T')[0]);
      
      // Calculate display time
      const endHour = (10 + hours) % 24;
      setDisplayEndTime(`${endHour.toString().padStart(2, '0')}:00`);
    } else {
      // For days: add days
      const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      setValue('end_date', end.toISOString().split('T')[0]);
      setDisplayEndTime('10:00');
    }
  };

  // Format date display
  const formatDisplay = (date: string, isEnd: boolean = false) => {
    if (!date) return 'dd/mm/yyyy';
    
    const d = new Date(date);
    const formatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    
    // Add time for hour selections only
    if (selectedOption.includes('h') && downtimeDays === 0) {
      return `${formatted} ${isEnd ? displayEndTime : displayStartTime}`;
    }
    
    return formatted;
  };

  return (
    <>
      {/* Dates */}
      <div className="mt-5">
        {/* Date Fields */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate || ''}
              onChange={handleDateChange}
              className="w-full px-4 py-3 border-2 border-green-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 text-gray-700 dark:text-gray-100 font-medium shadow-sm focus:border-green-400 focus:ring-2 focus:ring-green-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              End Date {selectedOption && `(${formatDisplay(endDate, true)})`}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formatDisplay(endDate, true)}
                readOnly
                className="w-full px-4 py-3 border-2 border-green-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 text-gray-700 dark:text-gray-100 font-medium shadow-sm focus:border-green-400 focus:ring-2 focus:ring-green-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Select
          </label>
                  <div className="grid grid-cols-7 gap-3">
                    {[
                      { id: '2h', label: '2h', days: 0, hours: 2 },
                      { id: '4h', label: '4h', days: 0, hours: 4 },
                      { id: '6h', label: '6h', days: 0, hours: 6 },
                      { id: '8h', label: '8h', days: 0, hours: 8 },
                      { id: '1d', label: '1d', days: 1, hours: 0 },
                      { id: '2d', label: '2d', days: 2, hours: 0 },
                      { id: '3d', label: '3d', days: 3, hours: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleQuickSelect(opt.days, opt.hours, opt.id)}
                        className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center justify-center min-h-[44px]
                          ${selectedOption === opt.id
                            ? opt.hours > 0 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-300' 
                              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg ring-2 ring-orange-300'
                            : opt.hours > 0 
                              ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300 border border-blue-200' 
                              : 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 hover:from-orange-200 hover:to-orange-300 border border-orange-200'
                          }`}
                      >
                        <span className="text-center leading-none">{opt.label}</span>
                      </button>
                    ))}
                  </div>
        </div>
      </div>

      {/* Hidden inputs for form values */}
      <input type="hidden" {...register('start_date')} />
      <input type="hidden" {...register('end_date')} />
      <input type="hidden" {...register('downtime_days')} />
      <input type="hidden" {...register('downtime_hours')} />
    </>
  );
};

// DowntimeSummary component
const DowntimeSummary = () => {
  const { watch } = useFormContext();
  const downtimeDays = watch('downtime_days') || 0;
  const downtimeHours = watch('downtime_hours') || 0;
  
  const getTotalDisplay = () => {
    const totalHours = downtimeDays * 24 + downtimeHours;
    if (totalHours === 0) return '0h';
    if (totalHours < 24) return `${totalHours}h`;
    
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  };
  
  return (
    <div className="maintenance-form-section downtime-summary-override bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="icon">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Downtime Tracking</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Service duration monitoring</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
            {getTotalDisplay()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap justify-end gap-1">
            <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full text-xs font-medium">{downtimeDays}d {downtimeHours}h</span>
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">Maintenance</span>
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium">Medium Impact</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  isSubmitting: externalIsSubmitting,
}) => {
  const [setReminder, setSetReminder] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    averageReplacementKm?: number;
    averageReplacementDays?: number;
    confidence: number;
  }>({
    confidence: 0,
  });
  const [serviceGroups, setServiceGroups] = useState<any[]>([
    {
      id: Date.now().toString(),
      serviceType: '',
      vendor: '',
      tasks: [],
      cost: 0,
      bills: [],
      parts: []
    }
  ]);

  // Enhanced submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // File upload states
  const [odometerPhoto, setOdometerPhoto] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  
  // Odometer warning state
  const [odometerWarning, setOdometerWarning] = useState<string | null>(null);

  // Initialize serviceGroups from initialData when editing
  useEffect(() => {
    if (initialData) {
      // Initialize service groups
      if (initialData.service_groups && initialData.service_groups.length > 0) {
        console.log('🔄 Initializing serviceGroups from initialData:', initialData.service_groups);
        setServiceGroups(initialData.service_groups);
      }

      // Note: File preview states (odometerPhoto, documents) cannot be initialized from URLs
      // Users will need to re-upload files if they want to change them
      // The existing images can be displayed in the form using the URLs from initialData
      console.log('📝 Edit mode initialized with data:', {
        serviceGroups: initialData.service_groups?.length || 0,
        odometerImage: initialData.odometer_image, // ✅ FIX: Use odometer_image
        supportingDocsUrls: initialData.supporting_documents_urls?.length || 0,
      });
    }
  }, [initialData]);

  const methods = useForm<Partial<MaintenanceTask>>({
    defaultValues: {
      task_type: "general_scheduled_service",
      priority: "medium",
      status: "resolved",
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

  // Handle speech-to-text transcripts
  // Note: ComplaintResolutionSection now handles setValue directly,
  // so these handlers are mainly for logging/notification purposes
  const handleComplaintTranscript = (text: string) => {
    // The ComplaintResolutionSection already handles setValue,
    // so we don't need to append here to avoid double appending
    // This is kept for backward compatibility and potential future use
  };

  const handleResolutionTranscript = (text: string) => {
    // The ComplaintResolutionSection already handles setValue,
    // so we don't need to append here to avoid double appending
    // This is kept for backward compatibility and potential future use
  };

  const initialVehicleIdRef = useRef(initialData?.vehicle_id);
  const skipInitialOdometerPrefillRef = useRef(true);

  // Auto-fill odometer reading from latest trip when vehicle is selected
  useEffect(() => {
    // Only auto-fill if:
    // 1. A vehicle is selected
    // 2. We're NOT in edit mode (no initialData?.odometer_reading)
    // 3. The odometer field is empty
    if (vehicleId && !initialData?.odometer_reading) {
      const fetchOdometer = async () => {
        try {
          const { value, fromTrip, tripDate, daysOld } = await getLatestOdometer(vehicleId);
          
          if (value > 0) {
            setValue('odometer_reading', value);
            
            // Show warning if odometer data is more than 7 days old
            if (fromTrip && daysOld > 7) {
              setOdometerWarning(`⚠️ This odometer reading is ${daysOld} days old`);
            } else {
              setOdometerWarning(null);
            }
          }
        } catch (error) {
          logger.error('Error fetching latest odometer:', error);
          setOdometerWarning(null);
        }
      };
      
      fetchOdometer();
    }
  }, [vehicleId, initialData?.odometer_reading, setValue]);

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

  // Controlled downtime handler to prevent infinite loops
  const handleDowntimeQuickSelect = useCallback((days: number, hours: number) => {
    // Prevent multiple rapid updates
    const timeoutKey = 'downtime-update';
    if ((window as any)[timeoutKey]) {
      clearTimeout((window as any)[timeoutKey]);
    }
    
    (window as any)[timeoutKey] = setTimeout(() => {
      setValue('downtime_days', days, { shouldDirty: true });
      setValue('downtime_hours', hours, { shouldDirty: true });
      
      // Calculate end date if start date exists
      if (startDate) {
        const start = new Date(startDate);
        const totalHours = days * 24 + hours;
        const end = new Date(start.getTime() + totalHours * 60 * 60 * 1000);
        setValue('end_date', end.toISOString().split('T')[0], { shouldDirty: true });
      }
    }, 100); // Small delay to batch updates
  }, [startDate, setValue]);

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
        logger.error("Failed to fetch latest odometer reading:", err);
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
      setValue("total_cost", totalCost);
    }
  }, [serviceGroupsWatch, setValue]);

  // Combined AI prediction effect to prevent infinite loops
  useEffect(() => {
    if (vehicleId && odometerReading) {
      const getPredictions = async () => {
        try {
          const prediction = await predictNextService(vehicleId, odometerReading);
          if (prediction) {
            setValue("next_predicted_service", prediction);
            setAiSuggestions(prediction);
          }
        } catch (error) {
          logger.error("Error getting AI predictions:", error);
          setAiSuggestions({ confidence: 0 });
        }
      };
      getPredictions();
    }
  }, [vehicleId, odometerReading, setValue]);

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
      logger.warn('No service groups found in data:', data.service_groups);
      return "Please add at least one service group";
    }

    logger.debug('Service groups found:', data.service_groups.length);

    // Validate each service group
    for (let i = 0; i < data.service_groups.length; i++) {
      const group = data.service_groups[i];

      logger.debug(`Validating service group ${i + 1}:`, group);
      logger.debug('Tasks:', group.tasks, 'Type:', typeof group.tasks, 'Is Array:', Array.isArray(group.tasks));
      logger.debug('Vendor ID:', group.vendor_id);
      logger.debug('Vendor:', group.vendor);
      logger.debug('Cost:', group.cost);

      // Check vendor (supports both vendor_id and vendor fields)
      const vendorValue = group.vendor_id || group.vendor;
      if (!vendorValue || vendorValue.trim() === '') {
        return `Please select a vendor for service group ${i + 1}`;
      }

      if (!Array.isArray(group.tasks) || group.tasks.length === 0) {
        return `Please select at least one task for service group ${i + 1}`;
      }

      if (!group.cost || group.cost < 0) {
        return `Please enter a valid cost for service group ${i + 1}`;
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

  const handleFormSubmit = async (data: any) => {
    if (isSubmitting || externalIsSubmitting) return;

    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    setOverallProgress(0);

    try {
      // Debug: Check file states before submission
      console.log('📋 Form submission - File states:', {
        odometerPhoto: odometerPhoto.length,
        documents: documents.length,
        'initialData?.attachments': initialData?.attachments,
      });

      // Build form data with service groups and files
      const formDataWithParts = {
        ...data,
        service_groups: serviceGroups.length > 0 ? serviceGroups : undefined,
        // Only include new files if uploaded, otherwise preserve existing values
        odometer_image: odometerPhoto.length > 0 ? odometerPhoto : initialData?.odometer_image,
        // ✅ FIX: Use supporting_documents_urls (with accessible URLs) instead of attachments
        attachments: documents.length > 0 ? documents : (initialData?.supporting_documents_urls || initialData?.attachments),
      };

      console.log('📋 Form data being submitted:', {
        hasOdometerImage: !!formDataWithParts.odometer_image,
        attachmentsCount: formDataWithParts.attachments?.length || 0,
        attachmentsType: typeof formDataWithParts.attachments,
      });

      // Validate form data
      const validationError = validateFormData(formDataWithParts);
      if (validationError) {
        toast.error(validationError);
        setIsSubmitting(false);
        return;
      }

      setOverallProgress(10);

      // Simulate upload progress
      const uploadProgress = setInterval(() => {
        setOverallProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadProgress);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Submit form
      await onSubmit(formDataWithParts);

      clearInterval(uploadProgress);
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
      logger.error("❌ Error submitting form:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Form submission failed"
      );
      toast.error(
        "Form submission failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setIsSubmitting(false);
      setOverallProgress(0);
    }
  };

  return (
    <div className="w-full">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-2 sm:space-y-6">
        {/* Vehicle & Basic Info */}
        <div className="maintenance-form-section service-details-override bg-white dark:bg-gray-900">
          <div className="maintenance-form-section-header">
            <div className="icon">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="section-title text-gray-900 dark:text-gray-100">Basic Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            <Controller
              control={control}
              name="vehicle_id"
              rules={{ 
                required: "Vehicle is required",
                validate: (value) => value !== "" || "Please select a vehicle"
              }}
              render={({ field }) => (
                <VehicleSelector
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

          {/* Vehicle Tire Information Display - Hidden per user request */}
          {/* Tire information (number_of_tyres, tyre_size) is still passed to ServiceGroupsSection 
              for backend calculations and parts tracking */}

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

          {/* Service Details - Dates and Quick Select integrated here */}
          <ServiceDetailsSection />
        </div>

        {/* Service Groups */}
        <ServiceGroupsSection
          serviceGroups={serviceGroups}
          onChange={setServiceGroups}
          vehicleType={vehicles.find(v => v.id === vehicleId)?.type}
          numberOfTyres={vehicles.find(v => v.id === vehicleId)?.number_of_tyres}
        />

        {/* Complaint & Resolution */}
        <ComplaintResolutionSection
          onComplaintTranscript={handleComplaintTranscript}
          onResolutionTranscript={handleResolutionTranscript}
        />

        {/* Downtime Tracking and Odometer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side: Downtime Tracking */}
          <div className="space-y-5">
            <DowntimeSummary />
          </div>
          
          {/* Right side: Odometer Section */}
          <div className="maintenance-form-section vehicle-info-override bg-white dark:bg-gray-900">
            <div className="maintenance-form-section-header">
              <div className="icon">
                <Gauge className="h-5 w-5" />
              </div>
              <h3 className="text-gray-900 dark:text-gray-100">Vehicle Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <Input
                label="Odometer Reading"
                type="number"
                icon={odometerReading ? undefined : <Gauge className="h-4 w-4" />}
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
              
              {/* Warning message if odometer data is old */}
              {odometerWarning && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p>{odometerWarning}</p>
                </div>
              )}
              
              <FileUploadWithProgress
                id="odometerPhoto"
                label="Odometer Photo"
                accept="image/jpeg,image/jpg,image/png"
                multiple={false}
                compress={true}
                maxSize={5 * 1024 * 1024}
                onFilesChange={setOdometerPhoto}
                helperText="Upload a clear photo of the odometer reading"
                existingFiles={initialData?.odometer_image ? [initialData.odometer_image] : []}
              />
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="maintenance-form-section status-section-override bg-white dark:bg-gray-900">
          <div className="maintenance-form-section-header">
            <div className="icon">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-gray-900 dark:text-gray-100">Status <span className="text-red-500 ml-1">*</span></h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { value: "open", label: "Open", color: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200", selectedColor: "bg-gray-600 text-white border-gray-600 shadow-lg" },
              { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200", selectedColor: "bg-blue-600 text-white border-blue-600 shadow-lg" },
              { value: "resolved", label: "Resolved", color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200", selectedColor: "bg-green-600 text-white border-green-600 shadow-lg" },
              { value: "rework", label: "Rework Required", color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200", selectedColor: "bg-red-600 text-white border-red-600 shadow-lg" },
            ].map((option) => (
              <Controller
                key={option.value}
                control={control}
                name="status"
                rules={{ required: "Status is required" }}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                      ${field.value === option.value 
                        ? option.selectedColor + " ring-2 ring-offset-2 ring-blue-500" 
                        : option.color + " hover:shadow-md"
                      }`}
                  >
                    {field.value === option.value && (
                      <span className="mr-1">✓</span>
                    )}
                    {option.label}
                  </button>
                )}
              />
            ))}
          </div>
          
          {errors.status && (
            <p className="text-red-500 text-sm mt-2">{errors.status.message}</p>
          )}
        </div>

        {/* Next Service Reminder */}
        <NextServiceReminderSection
          reminder={setReminder}
          onToggle={setSetReminder}
          odometerReading={odometerReading}
        />

        {/* Documents */}
        <div className="maintenance-form-section bg-white dark:bg-gray-900">
          <div className="maintenance-form-section-header">
            <div className="icon">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-gray-900 dark:text-gray-100">Supporting Documents</h3>
          </div>
          <FileUploadWithProgress
            id="documents"
            label="Documents"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            compress={false}
            maxSize={10 * 1024 * 1024}
            onFilesChange={(files) => {
              console.log('📎 Supporting documents selected:', files.length, files);
              setDocuments(files);
            }}
            helperText="Upload warranty cards, bills, or other relevant documents"
            existingFiles={initialData?.supporting_documents_urls || []}
          />
        </div>

        {/* AI Suggestions */}
        {aiSuggestions.averageReplacementKm && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div>
                <h4 className="text-blue-700 dark:text-blue-300 font-medium">
                  AI-Suggested Maintenance Intervals
                </h4>
                <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                  Based on historical data, this maintenance is typically
                  needed:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
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
                <p className="text-blue-500 dark:text-blue-400 text-xs mt-2">
                  Confidence: {Math.round(aiSuggestions.confidence)}%
                </p>
              </div>
            </div>
          </div>
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
            Task {initialData ? 'updated' : 'created'} successfully!
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
              {initialData ? 'Updating' : 'Creating'} task... {overallProgress}%
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex flex-wrap justify-end gap-4 pt-8 border-t-2 border-gradient-to-r from-blue-200 to-green-200">
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || externalIsSubmitting || submitSuccess}
            icon={submitSuccess ? <CheckCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            className={cn(
              "bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200",
              submitSuccess && "bg-green-600 hover:bg-green-700"
            )}
          >
            {submitSuccess
              ? `Task ${initialData ? 'Updated' : 'Created'}!`
              : isSubmitting
              ? `${initialData ? 'Updating' : 'Creating'} Task... ${overallProgress}%`
              : initialData ? "Update Task" : "Create Task"}
          </Button>
        </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default MaintenanceTaskForm;


