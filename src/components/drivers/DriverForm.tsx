import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Driver, Vehicle } from "../../types";
import Input from "../ui/Input";
import Select from "../ui/Select";
import MultiSelect from "../ui/MultiSelect";
import FileUpload from "../ui/FileUpload";
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
} from "lucide-react";
import { getVehicles } from "../../utils/storage";
import CollapsibleSection from "../ui/CollapsibleSection";
import { toast } from "react-toastify";
import { supabase } from "../../utils/supabaseClient";

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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<Driver>({
    defaultValues: {
      name: "",
      dl_number: "",
      dob: "",
      father_or_husband_name: "",
      contact_number: "",
      email: "",
      status: "active",
      ...initialData,
      other_documents: initialData.other_documents
        ? initialData.other_documents
        : [],
      medical_document: [],
      police_document: [],
      aadhaar_document: [],
      license_document: [],
    },
  });

  // Enable fields if initialData is present (for edit mode)
  useEffect(() => {
    if (initialData?.id) setFieldsDisabled(false);
  }, [initialData]);
  console.log(initialData);
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
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles");
      }
    };

    fetchVehicles();
  }, []);

  const handlePhotoChange = (file: File | null) => {
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
    const licenseNumber = watch("dl_number");
    const dob = watch("dob");

    if (!licenseNumber || !dob) {
      toast.error("Please enter license number and date of birth.");
      return;
    }

    setIsFetching(true);
    setFetchStatus("fetching");
    setFieldsDisabled(true);

    try {
      const dob_formatted = dob.split("-").reverse().join("-");

      const { data: result, error } = await supabase.functions.invoke(
        "fetch-driver-details",
        {
          body: {
            licence_number: licenseNumber,
            dob: dob_formatted,
          },
        }
      );

      if (error || !result?.success) {
        throw new Error(
          result?.message || error?.message || "Failed to fetch details"
        );
      }

      const driver = result.response || result.data?.response || {};

      // Convert base64 image to data URL if present
      let photoUrl = undefined;
      if (driver.image) {
        photoUrl = `data:image/jpeg;base64,${driver.image}`;
        setPhotoPreview(photoUrl);
      }

      // Map API response to form fields
      const mapped: Driver = {
        id: initialData?.id || undefined,
        name: driver.holder_name || "",
        father_or_husband_name: driver.father_or_husband_name || "",
        gender:
          (driver.gender &&
            (driver.gender.toUpperCase() === "MALE"
              ? "MALE"
              : driver.gender.toUpperCase() === "FEMALE"
              ? "FEMALE"
              : "OTHER")) ||
          "MALE",
        dob: (driver?.dob && driver?.dob.split("-").reverse().join("-")) || dob,
        blood_group:
          (driver?.blood_group && driver.blood_group.toUpperCase()) || "",
        address: driver?.permanent_address || driver?.temporary_address || "",
        contact_number: driver?.contact_number || "",
        email: driver?.email || "",
        dl_number: driver?.license_number || licenseNumber,
        vehicle_class:
          (driver?.vehicle_class &&
            driver?.vehicle_class.map((v: any) => v?.cov)) ||
          [],
        valid_from:
          (driver?.valid_from &&
            driver?.valid_from.split("-").reverse().join("-")) ||
          "",
        license_expiry_date:
          (driver?.valid_upto &&
            driver?.valid_upto.split("-").reverse().join("-")) ||
          "",
        license_issue_date:
          (driver?.issue_date &&
            driver?.issue_date.split("-").reverse().join("-")) ||
          "",
        rto_code: driver.rto_code || "",
        rto: driver.rto || "",
        state: driver.state || "",
        join_date: "",
        experience_years: 0,
        primary_vehicle_id: "",
        status: "active",
        driver_photo_url: photoUrl,
        photo: null, // keep as null, preview is handled separately
        // ...add more mappings as needed
      };

      reset(mapped);
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Top-level Fetch Block */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mb-6">
        <p className="text-sm text-gray-600 mb-3">
          Fetch Driver Info from Government Portal
        </p>
        <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4">
          <div className="w-full md:w-2/5 mb-2 md:mb-0">
            <Input
              label="License Number"
              placeholder="CG0419900078925"
              icon={<FileText className="h-4 w-4" />}
              error={errors.dl_number?.message}
              required
              disabled={isFetching || isSubmitting}
              {...register("dl_number", {
                required: "License number is required",
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
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Driver"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-gray-400" />
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
                    {...field}
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
            error={errors.contact_number?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("contact_number", {
              required: "Contact number is required",
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
                label="Vehicle Class"
                options={[
                  { value: "LMV", label: "LMV - Light Motor Vehicle" },
                  { value: "HMV", label: "HMV - Heavy Motor Vehicle" },
                  { value: "TRANS", label: "TRANS - Transport" },
                  { value: "MCWG", label: "MCWG - Motorcycle with Gear" },
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

          <Input
            label="Experience (Years)"
            type="number"
            error={errors.experience_years?.message}
            required
            disabled={isSubmitting}
            {...register("experience_years", {
              required: "Experience is required",
              valueAsNumber: true,
              min: { value: 0, message: "Experience must be positive" },
            })}
          />

          <Controller
            control={control}
            name="primary_vehicle_id"
            render={({ field }) => (
              <Select
                label="Assigned Vehicle"
                options={[
                  { value: "", label: "Select Vehicle" },
                  ...vehicles.map((vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`,
                  })),
                ]}
                disabled={isSubmitting}
                {...field}
              />
            )}
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
        defaultExpanded={true}
      >
        <div className="space-y-3 sm:space-y-4">
          <Controller
            control={control}
            name="license_document"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="License Document"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={value as File[] | undefined}
                onChange={onChange}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="aadhaar_document"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Aadhar /ID Proof"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={value as File[] | undefined}
                onChange={onChange}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="police_document"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Police Verification"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={value as File[] | undefined}
                onChange={onChange}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="medical_document"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Medical Certificate"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={true}
                value={value as File[] | undefined}
                onChange={onChange}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
          {/* Other Documents */}

          {/* <div className="mt-4 sm:mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">
                Other Documents
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ name: "", file_obj: undefined })}
                icon={<Plus className="h-4 w-4" />}
                disabled={isSubmitting}
              >
                Add Document
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">
                  No additional documents added
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-3 sm:p-4 border rounded-lg bg-gray-50 relative"
                  >
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-gray-400 hover:text-error-500"
                      onClick={() => remove(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <Input
                        label="Document Name"
                        placeholder="e.g., Medical Certificate"
                        disabled={isSubmitting}
                        {...register(`other_documents.${index}.name` as const)}
                      />

                      <Input
                        label="Issue/Expiry Date"
                        type="date"
                        disabled={isSubmitting}
                        {...register(
                          `other_documents.${index}.issue_date` as const
                        )}
                      />
                    </div>

                    <Controller
                      control={control}
                      name={`other_documents.${index}.file_obj` as const}
                      render={({ field: { value, onChange, ...field } }) => {
                        // For editing existing documents, check if there's a file_path to display
                        const existingFilePath =
                          initialData?.other_documents?.[index]?.file_path;

                        return (
                          <FileUpload
                            label="Upload Document"
                            value={value as File | null}
                            onChange={onChange}
                            accept=".jpg,.jpeg,.png,.pdf"
                            helperText={
                              existingFilePath
                                ? "A document is already uploaded"
                                : undefined
                            }
                            disabled={isSubmitting}
                            {...field}
                          />
                        );
                      }}
                    />

                  
                    {initialData?.other_documents?.[index]?.file_path && (
                      <div className="mt-2 text-xs text-primary-600">
                        <a
                          href={initialData.other_documents[index].file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:underline"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View existing document
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div> */}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks / Internal Notes
            </label>
            <textarea
              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
