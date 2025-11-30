import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Driver, Vehicle } from "@/types";
import Input from "../ui/Input";
import Select from "../ui/Select";
import MultiSelect from "../ui/MultiSelect";
import DocumentUploader from "../shared/DocumentUploader";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import {
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Upload,
  Trash2,
  Plus,
  Users,
  FileCheck,
  Database,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Shield,
} from "lucide-react";
import { getVehicles } from "../../utils/storage";
import CollapsibleSection from "../ui/CollapsibleSection";
import { toast } from "react-toastify";
import { supabase } from "../../utils/supabaseClient";
import { format, differenceInMonths } from "date-fns";
import { 
  validateIndianLicense, 
  validateIndianMobile, 
  validateAadhar,
  parseLicenseNumber,
  formatIndianMobile,
  formatAadhar,
  LICENSE_TYPES,
  canDriveVehicleType,
  VEHICLE_AUTHORIZATION
} from "../../utils/indianValidation";
import { checkDriverLicenseExpiry, getExpiryStatusColor } from "../../utils/documentExpiry";
import { createLogger } from '../../utils/logger';

const logger = createLogger('DriverForm');

const ensureImageDataUrl = (imageData: string): string => {
  if (!imageData) {
    return "";
  }
  return imageData.startsWith("data:")
    ? imageData
    : `data:image/jpeg;base64,${imageData}`;
};

const base64ToFile = (imageData: string, fileName: string): File | null => {
  try {
    const normalized = ensureImageDataUrl(imageData);
    const parts = normalized.split(",");
    if (parts.length < 2) {
      return null;
    }
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(parts[1]);
    const len = binary.length;
    const buffer = new Uint8Array(len);

    for (let i = 0; i < len; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }

    return new File([buffer], fileName, { type: mimeType });
  } catch (error) {
    logger.warn("Failed to convert base64 image to File:", error);
    return null;
  }
};

interface DriverFormProps {
  initialData: Partial<Driver>;
  onSubmit: (data: Omit<Driver, "id">) => void;
  isSubmitting?: boolean;
}

const DriverForm: React.FC<DriverFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.driver_photo_url || null
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fieldsDisabled, setFieldsDisabled] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<
    "idle" | "fetching" | "success" | "error"
  >("idle");
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string[]>>({});
  const [experienceDisplay, setExperienceDisplay] = useState<string>('0 years, 0 months');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<Driver>({
    defaultValues: {
      name: "",
      license_number: "",
      dob: "",
      father_or_husband_name: "",
      contact_number: "",
      email: "",
      status: "active",
      ...initialData,
      other_documents: initialData?.other_documents
        ? initialData.other_documents // ⚠️ Confirm field refactor here
        : [], // ⚠️ Confirm field refactor here
      medical_doc_file: initialData.medical_doc_url ? [] : initialData.medical_doc_file,
      police_doc_file: initialData.police_doc_url ? [] : initialData.police_doc_file,
      aadhar_doc_file: initialData.aadhar_doc_url ? [] : initialData.aadhar_doc_file,
      license_doc_file: initialData.license_doc_url ? [] : initialData.license_doc_file,
    },
  });

  // Enable fields if initialData is present (for edit mode)
  useEffect(() => {
    if (initialData?.id) {
      setFieldsDisabled(false);
      
      // Calculate experience display for existing data
      if (initialData.join_date) {
        const joinDate = new Date(initialData.join_date);
        const today = new Date();
        const totalMonths = differenceInMonths(today, joinDate);
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        setExperienceDisplay(`${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`);
      }
    }
  }, [initialData]);
  // Field array for other documents
  const { fields, append, remove } = useFieldArray({
    control,
    name: "other_documents",
  });

  // Fetch vehicles for the dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesData = await getVehicles();
        // Filter out archived vehicles
        const activeVehicles = vehiclesData.filter(
          (v) => v.status !== "archived"
        );
        setVehicles(activeVehicles);
      } catch (error) {
        logger.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles");
      }
    };

    fetchVehicles();
  }, []);

  const handlePhotoChange = (file: File | null) => {
    setValue('photo', file || undefined, { shouldDirty: true });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(initialData?.driver_photo_url || null);
    }
  };

  // --- Fetch Driver Details Handler ---
  const handleFetchDetails = async () => {
    const licenseNumber = watch("license_number");
    // In edit mode, preserve existing DOB if fetch section DOB is empty
    const dobFromForm = watch("dob");
    const dob = dobFromForm || initialData?.dob || "";

    if (!licenseNumber || !dob) {
      toast.error("Please enter license number and date of birth.");
      return;
    }

    setIsFetching(true);
    setFetchStatus("fetching");
    setFieldsDisabled(true);

    try {
      const dob_formatted = dob.split("-").reverse().join("-");

      logger.info("Fetching driver details:", { licenseNumber, dob: dob_formatted });

      // Use proxy server for local dev, Edge Function for production
      // Priority: env variable > Edge Function (production) > localhost (dev)
      const isProduction = window.location.hostname !== 'localhost';
      const proxyUrl = import.meta.env.VITE_DL_PROXY_URL || 
        (isProduction
          ? 'https://oosrmuqfcqtojflruhww.supabase.co/functions/v1/fetch-driver-details'
          : 'http://localhost:3001/api/fetch-dl-details');
      
      // Add Authorization header for Edge Functions (production)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (isProduction && !import.meta.env.VITE_DL_PROXY_URL) {
        // Calling Edge Function - need authorization header
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseAnonKey) {
          headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
        }
      }
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dl_no: licenseNumber,
          dob: dob_formatted
        }),
      });
      
      const result = await response.json();
      const error = !response.ok ? { message: result.message || 'Failed to fetch' } : null;

      logger.info("API Response:", { result, error });

      if (error || !result?.success) {
        logger.error("Failed to fetch driver details:", { error, result });
        throw new Error(
          result?.message || error?.message || "Failed to fetch details"
        );
      }

      // Our proxy returns the data directly in result.data
      const driver = result.data || {};
      logger.info("Driver data received:", driver);

      // Helper function to convert DD-MM-YYYY to YYYY-MM-DD
      const convertDateFormat = (ddmmyyyy: string | undefined): string => {
        if (!ddmmyyyy) return '';
        const parts = ddmmyyyy.split('-');
        if (parts.length !== 3) return '';
        // Convert DD-MM-YYYY to YYYY-MM-DD
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      };

      // Convert base64 image to data URL if present
      const photoDataUrl = driver.image ? ensureImageDataUrl(driver.image) : undefined;

      // Set photo preview immediately if we have image data
      if (photoDataUrl) {
        setPhotoPreview(photoDataUrl);
      }

      // Map API response to form fields
      // Preserve existing data for fields not returned by the API
      const mapped: Driver = {
        // Start with existing form data
        ...initialData,

        // Override with government API data (already mapped by proxy)
        id: initialData?.id || undefined,
        name: driver.full_name || "",
        father_or_husband_name: driver.father_name || "",
        gender:
          (driver.gender &&
            (driver.gender.toUpperCase() === "MALE"
              ? "MALE"
              : driver.gender.toUpperCase() === "FEMALE"
              ? "FEMALE"
          : "OTHER")) ||
          "MALE",
        dob: driver.date_of_birth ? convertDateFormat(driver.date_of_birth) : (dob || ''),
        blood_group:
          (driver?.blood_group && driver.blood_group.toUpperCase()) || "",
        address: driver?.permanent_address || driver?.temporary_address || "",
        contact_number: driver?.contact_number || "",
        email: driver?.email || "",
        license_number: driver?.license_number || licenseNumber,
        vehicle_class: driver?.vehicle_class || [],  // ✅ Fixed: singular not plural!
        valid_from: driver?.valid_from ? convertDateFormat(driver.valid_from) : "",
        license_expiry_date: driver?.valid_upto ? convertDateFormat(driver.valid_upto) : "",
        license_issue_date: driver?.issue_date ? convertDateFormat(driver.issue_date) : "",
        rto_code: driver.rto_code || "",
        rto: driver.rto || "",
        state: driver.state || "",

        // Preserve important fields not in government API
        join_date: initialData?.join_date || format(new Date(), 'yyyy-MM-dd'),
        experience_years: getValues('experience_years') || initialData?.experience_years || 0,
        primary_vehicle_id: getValues('primary_vehicle_id') || initialData?.primary_vehicle_id || "",
        status: getValues('status') || initialData?.status || "active",

        // Set photo URL if fetched, otherwise preserve existing
        driver_photo_url: photoDataUrl || initialData?.driver_photo_url || "",

        // Preserve document URLs
        license_doc_url: initialData?.license_doc_url,
        aadhar_doc_url: initialData?.aadhar_doc_url,
        police_doc_url: initialData?.police_doc_url,
        medical_doc_url: initialData?.medical_doc_url,

        // Preserve other existing fields
        other_documents: initialData?.other_documents || [],
        notes: initialData?.notes,
      } as Driver;

      // Reset the form with all mapped data
      reset(mapped);

      // If we have photo data, also set the photo file for upload
      if (photoDataUrl) {
        const sanitizedLicense = (licenseNumber || "driver").replace(/\s+/g, "_");
        const generatedFile = base64ToFile(photoDataUrl, `${sanitizedLicense}-fetch.jpg`);
        if (generatedFile) {
          setValue('photo', generatedFile, { shouldDirty: true });
        }
      }

      setFieldsDisabled(false);
      setFetchStatus("success");
      toast.success(
        "Driver details fetched. Please verify and complete the form."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch driver details.");
      setFieldsDisabled(false);
      setFetchStatus("error");
    } finally {
      setIsFetching(false);
    }
  };

  const joinDateValue = watch('join_date');

  // Auto-calculate experience based on join_date
  useEffect(() => {
    if (joinDateValue) {
      const joinDate = new Date(joinDateValue);
      const today = new Date();
      const totalMonths = differenceInMonths(today, joinDate);
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      
      // Store the integer representation for database (round to nearest year)
      const integerYears = Math.round(totalMonths / 12);
      setValue('experience_years', integerYears);
      
      // Set display string
      setExperienceDisplay(`${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`);
    } else {
      setValue('experience_years', 0);
      setExperienceDisplay('0 years, 0 months');
    }
  }, [joinDateValue, setValue]);

  // Handle document upload completion
  const handleDocumentUpload = (docType: string, filePaths: string[]) => {
    setUploadedDocuments(prev => ({
      ...prev,
      [docType]: filePaths
    }));
    
    // Update form field with the uploaded file paths
    const fieldName = `${docType}_doc_url` as keyof Driver;
    setValue(fieldName, filePaths as any);
  };

  const onFormSubmit = (data: Driver) => {
    const formData: Driver = {
      ...data,
      license_doc_url: (uploadedDocuments.license && uploadedDocuments.license.length > 0)
        ? uploadedDocuments.license
        : data.license_doc_url,
      aadhar_doc_url: (uploadedDocuments.aadhar && uploadedDocuments.aadhar.length > 0)
        ? uploadedDocuments.aadhar
        : data.aadhar_doc_url,
      police_doc_url: (uploadedDocuments.police && uploadedDocuments.police.length > 0)
        ? uploadedDocuments.police
        : data.police_doc_url,
      medical_doc_url: (uploadedDocuments.medical && uploadedDocuments.medical.length > 0)
        ? uploadedDocuments.medical
        : data.medical_doc_url,
    };

    if (photoPreview) {
      formData.driver_photo_url = photoPreview;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Top-level Fetch Block */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Fetch Driver Info from Government Portal
        </p>
        <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4">
          <div className="w-full md:w-2/5 mb-2 md:mb-0">
            <Input
              label="License Number"
              placeholder="MH12 20080001234"
              icon={<FileText className="h-4 w-4" />}
              error={errors.license_number?.message}
              required
              disabled={isFetching || isSubmitting}
              {...register("license_number", {
                required: "License number is required",
                validate: (value) => {
                  if (!validateIndianLicense(value)) {
                    return "Please enter a valid Indian driving license number (e.g., MH12 20080001234)";
                  }
                  return true;
                }
              })}
            />
          </div>
          <div className="w-full md:w-2/5 mb-2 md:mb-0">
            <Input
              label="Date of Birth"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              placeholder="DD-MM-YYYY"
              disabled={isFetching || isSubmitting}
              {...register("dob")}
            />
          </div>
          <div className="w-full md:w-1/5 pt-0 md:pt-2">
            <Button
              type="button"
              disabled={isFetching || isSubmitting}
              isLoading={isFetching}
              className="w-full"
              onClick={handleFetchDetails}
            >
              {isFetching ? "Fetching..." : "Fetch Details"}
            </Button>
            {fetchStatus === "success" && (
              <div className="text-center mt-1">
                <span className="text-xs text-success-600 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Details found!
                </span>
              </div>
            )}
            {fetchStatus === "error" && (
              <div className="text-center mt-1">
                <span className="text-xs text-error-600 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Not found
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Driver Photo */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Driver"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <Controller
            control={control}
            name="photo"
            render={({ field: { onChange, ...field } }) => (
              <div className="absolute bottom-0 right-0">
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer bg-primary-600 text-white p-1.5 rounded-full hover:bg-primary-700 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 inline align-baseline" />
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      onChange(file);
                      handlePhotoChange(file);
                    }}
                    disabled={fieldsDisabled || isSubmitting}
                  />
                </label>
              </div>
            )}
          />
        </div>
      </div>

      {/* Personal Information */}
      <CollapsibleSection
        title="Personal Information"
        icon={<User className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Full Name"
            icon={<User className="h-4 w-4" />}
            error={errors.name?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("name", { required: "Full name is required" })}
          />

          <Input
            label="Father/Husband Name"
            icon={<Users className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register("father_or_husband_name")}
          />

          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select
                label="Gender"
                options={[
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" },
                ]}
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="blood_group"
            render={({ field }) => (
              <Select
                label="Blood Group"
                options={[
                  { value: "", label: "Select Blood Group" },
                  { value: "A+", label: "A+" },
                  { value: "A-", label: "A-" },
                  { value: "B+", label: "B+" },
                  { value: "B-", label: "B-" },
                  { value: "AB+", label: "AB+" },
                  { value: "AB-", label: "AB-" },
                  { value: "O+", label: "O+" },
                  { value: "O-", label: "O-" },
                ]}
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />
        </div>
        <div className="mt-3 sm:mt-4">
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Textarea
                label="Address"
                placeholder="Enter full address"
                error={errors.address?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />
        </div>
      </CollapsibleSection>

      {/* Contact & License Details */}
      <CollapsibleSection
        title="Contact & License Details"
        icon={<FileCheck className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Contact Number"
            icon={<Phone className="h-4 w-4" />}
            placeholder="e.g., 9876543210"
            error={errors.contact_number?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("contact_number", {
              required: "Contact number is required",
              validate: (value) => {
                if (!validateIndianMobile(value)) {
                  return "Please enter a valid 10-digit Indian mobile number";
                }
                return true;
              },
              onChange: (e) => {
                // Auto-format the mobile number
                const formatted = formatIndianMobile(e.target.value);
                e.target.value = formatted;
              }
            })}
          />

          <Input
            label="Email"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register("email")}
          />

          <Controller
            control={control}
            name="vehicle_class"
            render={({ field }) => (
              <MultiSelect
                label="Vehicle Class / License Types"
                options={[
                  { value: "MCWG", label: "MCWG - Motorcycle Without Gear" },
                  { value: "MCW/G", label: "MCW/G - Motorcycle With Gear" },
                  { value: "LMV", label: "LMV - Light Motor Vehicle" },
                  { value: "HMV", label: "HMV - Heavy Motor Vehicle" },
                  { value: "HGMV", label: "HGMV - Heavy Goods Motor Vehicle" },
                  { value: "HTV", label: "HTV - Heavy Transport Vehicle" },
                  { value: "HPMV", label: "HPMV - Heavy Passenger Motor Vehicle" },
                  { value: "PSV", label: "PSV - Public Service Vehicle" },
                  { value: "TRANS", label: "TRANS - Transport Vehicle" },
                ]}
                value={field.value || []}
                onChange={field.onChange}
                disabled={fieldsDisabled || isSubmitting}
                required
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
          <Input
            label="License Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register("license_issue_date")}
          />

          <Input
            label="Valid From"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register("valid_from")}
          />

          <Input
            label="Valid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.license_expiry_date?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("license_expiry_date", {
              required: "License expiry date is required",
            })}
          />
        </div>
      </CollapsibleSection>

      {/* RTO Information */}
      <CollapsibleSection
        title="RTO Information"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-orange-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Input
            label="RTO Code"
            placeholder="e.g., CG06"
            disabled={fieldsDisabled || isSubmitting}
            {...register("rto_code")}
          />

          <Input
            label="RTO Name"
            placeholder="e.g., MAHASAMUND"
            disabled={fieldsDisabled || isSubmitting}
            {...register("rto")}
          />

          <Input
            label="State"
            placeholder="Chhattisgarh"
            disabled={fieldsDisabled || isSubmitting}
            {...register("state")}
          />
        </div>
      </CollapsibleSection>

      {/* Employment Details */}
      <CollapsibleSection
        title="Employment Details"
        icon={<Users className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Input
            label="Join Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.join_date?.message}
            required
            disabled={isSubmitting}
            {...register("join_date", { required: "Join date is required" })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Experience
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">{experienceDisplay}</span>
            </div>
            <input
              type="hidden"
              {...register("experience_years", {
                valueAsNumber: true,
                min: { value: 0, message: "Experience must be positive" },
              })}
            />
          </div>

          <Controller
            control={control}
            name="primary_vehicle_id"
            render={({ field }) => {
              // Group vehicles by type
              const vehiclesByType = vehicles.reduce((acc, vehicle) => {
                const type = vehicle.type || 'other';
                if (!acc[type]) acc[type] = [];
                acc[type].push(vehicle);
                return acc;
              }, {} as Record<string, typeof vehicles>);
              
              // Create options with category headers
              const vehicleOptions = [
                { value: "", label: "Select Vehicle" },
                ...Object.entries(vehiclesByType).flatMap(([type, vehicleList]) => [
                  { value: `__header_${type}`, label: `--- ${type.charAt(0).toUpperCase() + type.slice(1)} ---`, disabled: true },
                  ...vehicleList.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`,
                  })),
                ])
              ];
              
              return (
                <Select
                  label="Assigned Vehicle (by Category)"
                  options={vehicleOptions}
                  disabled={isSubmitting}
                  {...field}
                />
              );
            }}
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <Controller
            control={control}
            name="status"
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <Select
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "onLeave", label: "On Leave" },
                  { value: "suspended", label: "Suspended" },
                  { value: "blacklisted", label: "Blacklisted" },
                ]}
                error={errors.status?.message}
                required
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>
      </CollapsibleSection>

      {/* Documents */}
      <CollapsibleSection
        title="Documents"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-red-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DocumentUploader
            label="License Document"
            bucketType="driver"
            entityId={initialData?.id || 'temp'}
            docType="license"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('license', paths)}
            initialFilePaths={initialData?.license_doc_url || []}
            required
            helperText="Upload license document (PDF/Image)"
          />
          <DocumentUploader
            label="Aadhar / ID Proof"
            bucketType="driver"
            entityId={initialData?.id || 'temp'}
            docType="aadhar"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('aadhar', paths)}
            initialFilePaths={initialData?.aadhar_doc_url || []}
            helperText="Upload Aadhar card or ID proof (PDF/Image)"
          />
          <DocumentUploader
            label="Police Verification"
            bucketType="driver"
            entityId={initialData?.id || 'temp'}
            docType="police"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('police', paths)}
            initialFilePaths={initialData?.police_doc_url || []}
            helperText="Upload police verification (PDF/Image)"
          />
          <DocumentUploader
            label="Medical Certificate"
            bucketType="driver"
            entityId={initialData?.id || 'temp'}
            docType="medical"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('medical', paths)}
            initialFilePaths={initialData?.medical_doc_url || []}
            helperText="Upload medical certificate (PDF/Image)"
          />
        </div>
      </CollapsibleSection>

      {/* Notes */}
      <CollapsibleSection
        title="Notes"
        icon={<Database className="h-5 w-5" />}
        iconColor="text-gray-600"
        defaultExpanded={false}
      >
        <div className="space-y-3 sm:space-y-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks / Internal Notes
            </label>
            <textarea
              className="w-full px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              placeholder="Add any additional notes or remarks about this driver (for internal use only)"
              disabled={isSubmitting}
              {...register("notes")}
            ></textarea>
          </div>
        </div>
      </CollapsibleSection>

      {/* Submit Button */}
      <div className="flex justify-end pt-3 sm:pt-4">
        <Button type="submit" isLoading={isSubmitting}>
          {initialData?.id ? "Update Driver" : "Add Driver"}
        </Button>
      </div>
    </form>
  );
};

export default DriverForm;
