import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { Vehicle } from "../../types";
import {
  Truck,
  Upload,
  X,
  Plus,
  Database,
  Info,
  Paperclip,
  IndianRupee,
  Shield,
  FileCheck,
  BadgeCheck,
  Wind,
  Bell,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Input from "../ui/Input";
import Select from "../ui/Select";
import MultiSelect from "../ui/MultiSelect";
import FileUpload from "../ui/FileUpload";
import Checkbox from "../ui/Checkbox";
import Button from "../ui/Button";
import { toast } from "react-toastify";
import CollapsibleSection from "../ui/CollapsibleSection";
import { supabase } from "../../utils/supabaseClient";

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Omit<Vehicle, "id">) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [fieldsDisabled, setFieldsDisabled] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<
    "idle" | "fetching" | "success" | "error"
  >("idle");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<Vehicle>({
    defaultValues: {
      registration_number: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      type: "truck",
      fuel_type: "diesel",
      current_odometer: 0,
      status: "active",
      ...initialData,
      rc_copy_file: [],
      insurance_document_file: [],
      puc_document_file: [],
      permit_document_file: [],
      tax_receipt_document_file: [],
      fitness_document_file: [],
    },
  });

  // Enable fields if initialData is present (for edit mode)
  useEffect(() => {
    if (initialData) setFieldsDisabled(false);
  }, [initialData]);

  // Field array for other documents
  const { fields, append, remove } = useFieldArray({
    control,
    name: "other_documents",
  });

  // Watch values for conditional rendering
  const remindInsurance = watch("remind_insurance");
  const remindFitness = watch("remind_fitness");
  const remindPuc = watch("remind_puc");
  const remindTax = watch("remind_tax");
  const remindPermit = watch("remind_permit");
  const remindService = watch("remind_service");

  const handleFormSubmit = (data: Vehicle) => {
    setIsSubmittingForm(true);
    try {
      onSubmit(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        "Form submission failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setIsSubmittingForm(false);
    }
  };

  // --- NEW: Fetch RC details handler ---
  const handleFetchDetails = async () => {
    const regNum = watch("registration_number");
    if (!regNum) {
      toast.error("Please enter a vehicle number first.");
      return;
    }

    setIsFetching(true);
    setFetchStatus("fetching");
    setFieldsDisabled(true);

    // Clear form before fetching new data
    reset({
      registration_number: regNum,
      make: "",
      model: "",
      year: new Date().getFullYear(),
      type: "truck",
      fuel_type: "diesel",
      current_odometer: 0,
      status: "active",
    });

    try {
      // Use supabase.functions.invoke for Edge Functions
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-rc-details",
        {
          body: { registration_number: regNum },
        }
      );

      if (error || !result?.success) {
        throw new Error(
          result?.message || error?.message || "Failed to fetch details"
        );
      }

      // console.log(result);
      const rc = result.data?.response || {};
      const mapApiToForm = (rc: any, regNum: string) => ({
        registration_number:
          rc.license_plate || rc.registrationNumber || regNum,
        chassis_number: rc.chassis_number || rc.chassisNumber || "",
        engine_number: rc.engine_number || rc.engineNumber || "",
        make: rc.brand_name || rc.make || "",
        model: rc.brand_model || rc.model || "",
        year: rc.manufacturing_date_formatted
          ? parseInt(rc.manufacturing_date_formatted.split("-")[0])
          : rc.yearOfManufacture
          ? parseInt(rc.yearOfManufacture)
          : rc.registration_date
          ? parseInt(rc.registration_date.split("-")[0])
          : undefined,
        color: rc.color || "",
        fuel_type:
          (rc.fuel_type || rc.fuelType || "").toLowerCase() || "diesel",
        owner_name: rc.owner_name || rc.ownerName || "",
        seating_capacity: rc.seating_capacity
          ? parseInt(rc.seating_capacity)
          : rc.seatingCapacity
          ? parseInt(rc.seatingCapacity)
          : undefined,
        registration_date: rc.registration_date || "",
        rc_expiry_date: rc.rc_expiry_date || "",
        permit_number: rc.permit_number || "",
        permit_issuing_state: rc.rto_name
          ? rc.rto_name?.split(",")[1]?.trim()
          : "",
        permit_issue_date: rc.permit_issue_date || "",
        permit_expiry_date: rc.permit_valid_upto || rc.permit_valid_from || "",
        permit_type: rc.permit_type || "",
        insurance_expiry_date: rc.insurance_expiry || "",
        insurer_name: rc.insurance_company || "",
        policy_number: rc.insurance_policy || "",
        fitness_expiry_date: rc.fit_up_to || "",
        fitness_issue_date: rc.fitness_issue_date || "",
        puc_expiry_date: rc.pucc_upto || "",
        puc_certificate_number: rc.pucc_number || "",
        tax_paid_upto: rc.tax_paid_upto || "",
        vehicle_class: rc.class || "",
        emission_norms: rc.norms || "",
        unladen_weight: rc.unladen_weight
          ? parseInt(rc.unladen_weight)
          : undefined,
        cubic_capacity: rc.cubic_capacity
          ? parseFloat(rc.cubic_capacity)
          : undefined,
        cylinders: rc.cylinders ? parseInt(rc.cylinders) : undefined,
        noc_details: rc.noc_details || "",
        status: (rc.rc_status || "").toLowerCase() || "active",
        rc_status: rc.rc_status || "",
        financer: rc.financer || "",
        current_odometer: 0,
      });

      const mapped = mapApiToForm(rc, regNum);
      reset(mapped);
      setFieldsDisabled(false);
      setFetchStatus("success");
      toast.success(
        "Vehicle details fetched. Please verify and complete the form."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch vehicle details.");
      setFieldsDisabled(false);
      setFetchStatus("error");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <CollapsibleSection
        title="Basic Information"
        icon={<Truck className="h-5 w-5" />}
        defaultExpanded
        iconColor="text-gray-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Input
              label="Vehicle Number"
              placeholder="CG04NJ5907"
              error={errors.registration_number?.message}
              required
              disabled={isFetching || isSubmittingForm || isSubmitting}
              {...register("registration_number", {
                required: "Vehicle number is required",
              })}
            />
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchDetails}
                isLoading={isFetching}
                disabled={isFetching || isSubmittingForm || isSubmitting}
              >
                Get Details
              </Button>
              {fetchStatus === "success" && (
                <span className="text-xs text-success-600 flex items-center ml-2 inline-block">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Details found!
                </span>
              )}
              {fetchStatus === "error" && (
                <span className="text-xs text-error-600 flex items-center ml-2 inline-block">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Not found
                </span>
              )}
            </div>
          </div>

          <Input
            label="Chassis Number"
            placeholder="17 characters"
            error={errors.chassis_number?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("chassis_number", {
              required: "Chassis number is required",
            })}
          />

          <Input
            label="Engine Number"
            error={errors.engine_number?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("engine_number", {
              required: "Engine number is required",
            })}
          />

          <Input
            label="Make"
            placeholder="Tata, Ashok Leyland, etc."
            error={errors.make?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("make", { required: "Make is required" })}
          />

          <Input
            label="Model"
            placeholder="407, 1109, etc."
            error={errors.model?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("model", { required: "Model is required" })}
          />

          <Controller
            control={control}
            name="year"
            rules={{ required: "Year is required" }}
            render={({ field }) => (
              <Select
                label="Year"
                options={Array.from({ length: 30 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return { value: year.toString(), label: year.toString() };
                })}
                error={errors.year?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
                value={field.value?.toString()}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />

          <Input
            label="Owner Name"
            placeholder="Enter owner's name"
            disabled={fieldsDisabled || isSubmitting}
            {...register("owner_name")}
          />

          <Controller
            control={control}
            name="type"
            rules={{ required: "Vehicle type is required" }}
            render={({ field }) => (
              <Select
                label="Vehicle Type"
                options={[
                  { value: "truck", label: "Truck" },
                  { value: "tempo", label: "Tempo" },
                  { value: "trailer", label: "Trailer" },
                ]}
                error={errors.type?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="fuel_type"
            rules={{ required: "Fuel type is required" }}
            render={({ field }) => (
              <Select
                label="Fuel Type"
                options={[
                  { value: "diesel", label: "Diesel" },
                  { value: "petrol", label: "Petrol" },
                  { value: "cng", label: "CNG" },
                ]}
                error={errors.fuel_type?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />

          <Input
            label="Tyre Size"
            placeholder="e.g., 215/75 R15"
            disabled={fieldsDisabled || isSubmitting}
            {...register("tyre_size")}
          />

          <Input
            label="Number of Tyres"
            type="number"
            placeholder="6, 10, etc."
            disabled={fieldsDisabled || isSubmitting}
            {...register("number_of_tyres", { valueAsNumber: true })}
          />

          <Input
            label="Registration Date"
            type="date"
            disabled={fieldsDisabled || isSubmitting}
            {...register("registration_date")}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            disabled={fieldsDisabled || isSubmitting}
            {...register("rc_expiry_date")}
          />

          <Input
            label="Current Odometer"
            type="number"
            error={errors.current_odometer?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register("current_odometer", {
              required: "Current odometer is required",
              valueAsNumber: true,
              min: { value: 0, message: "Odometer must be positive" },
            })}
          />

          <Controller
            control={control}
            name="status"
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <Select
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "maintenance", label: "Maintenance" },
                  { value: "inactive", label: "Inactive" },
                  { value: "stood", label: "Stood" },
                ]}
                error={errors.status?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-3 sm:mt-4 flex justify-end">
          <Controller
            control={control}
            name="rc_copy_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                multiple={true}
                label="Upload RC"
                value={value as File[]}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                // icon={<Upload className="h-4 w-4" />}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>
      </CollapsibleSection>

      {/* Insurance Details */}
      <CollapsibleSection
        title="Insurance Details"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-blue-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Input
            label="Policy Number"
            placeholder="e.g., POL123456789"
            disabled={isSubmitting}
            {...register("policy_number")}
          />

          <Input
            label="Insurer Name"
            placeholder="e.g., ICICI Lombard"
            disabled={isSubmitting}
            {...register("insurer_name")}
          />

          <Input
            label="Insurance Start Date"
            type="date"
            disabled={isSubmitting}
            {...register("insurance_start_date")}
          />

          <Input
            label="Insurance Expiry Date"
            type="date"
            disabled={isSubmitting}
            {...register("insurance_expiry_date")}
          />

          <Input
            label="Premium Amount (₹)"
            type="number"
            placeholder="e.g., 25000"
            disabled={isSubmitting}
            {...register("insurance_premium_amount", { valueAsNumber: true })}
          />

          <Input
            label="IDV Amount (₹)"
            type="number"
            placeholder="e.g., 500000"
            disabled={isSubmitting}
            {...register("insurance_idv", { valueAsNumber: true })}
          />
        </div>

        <div className="mt-3 sm:mt-4 flex justify-end">
          <Controller
            control={control}
            name="insurance_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                multiple={true}
                label="Upload Insurance"
                value={value as File[]}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <Checkbox
            label="Set Insurance Expiry Reminder"
            checked={remindInsurance}
            onChange={(e) => setValue("remind_insurance", e.target.checked)}
            disabled={isSubmitting}
          />

          {remindInsurance && (
            <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-gray-200 space-y-3 sm:space-y-4">
              <Controller
                control={control}
                name="insurance_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: "", label: "Default Contact" },
                      { value: "contact1", label: "John Doe (Fleet Manager)" },
                      { value: "contact2", label: "Jane Smith (Admin)" },
                    ]}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                disabled={isSubmitting}
                {...register("insurance_reminder_days_before", {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Fitness Certificate */}
      <CollapsibleSection
        title="Fitness Certificate"
        icon={<FileCheck className="h-5 w-5" />}
        iconColor="text-green-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Input
            label="Fitness Certificate Number"
            placeholder="e.g., FC123456789"
            disabled={isSubmitting}
            {...register("fitness_certificate_number")}
          />

          <Input
            label="Fitness Issue Date"
            type="date"
            disabled={isSubmitting}
            {...register("fitness_issue_date")}
          />

          <Input
            label="Fitness Expiry Date"
            type="date"
            disabled={isSubmitting}
            {...register("fitness_expiry_date")}
          />

          <Input
            label="Fitness Cost (₹)"
            type="number"
            placeholder="e.g., 2000"
            disabled={isSubmitting}
            {...register("fitness_cost", { valueAsNumber: true })}
          />
        </div>

        <div className="mt-3 sm:mt-4 flex justify-end">
          <Controller
            control={control}
            name="fitness_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                multiple={true}
                label="Upload Fitness Certificate"
                value={value as File[]}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <Checkbox
            label="Set Fitness Expiry Reminder"
            checked={remindFitness}
            onChange={(e) => setValue("remind_fitness", e.target.checked)}
            disabled={isSubmitting}
          />

          {remindFitness && (
            <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-gray-200 space-y-3 sm:space-y-4">
              <Controller
                control={control}
                name="fitness_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: "", label: "Default Contact" },
                      { value: "contact1", label: "John Doe (Fleet Manager)" },
                      { value: "contact2", label: "Jane Smith (Admin)" },
                    ]}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                disabled={isSubmitting}
                {...register("fitness_reminder_days_before", {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Tax Details */}
      <CollapsibleSection
        title="Tax Details"
        icon={<IndianRupee className="h-5 w-5" />}
        iconColor="text-yellow-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Input
            label="Tax Receipt Number"
            placeholder="e.g., TR123456789"
            disabled={isSubmitting}
            {...register("tax_receipt_number")}
          />

          <Input
            label="Tax Amount (₹)"
            type="number"
            placeholder="e.g., 5000"
            disabled={isSubmitting}
            {...register("tax_amount", { valueAsNumber: true })}
          />

          <Input
            label="Tax Scope"
            placeholder="e.g., State, National"
            disabled={isSubmitting}
            {...register("tax_scope")}
          />

          <Input
            label="Tax Paid Up To"
            type="date"
            placeholder="e.g., 2025-03-31"
            disabled={isSubmitting}
            {...register("tax_paid_upto")}
          />
        </div>

        <div className="mt-3 sm:mt-4 flex justify-end">
          <Controller
            control={control}
            name="tax_receipt_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                multiple={true}
                label="Upload Tax Receipt"
                value={value as File[]}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <Checkbox
            label="Set Tax Expiry Reminder"
            checked={remindTax}
            onChange={(e) => setValue("remind_tax", e.target.checked)}
            disabled={isSubmitting}
          />

          {remindTax && (
            <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-gray-200 space-y-3 sm:space-y-4">
              <Controller
                control={control}
                name="tax_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: "", label: "Default Contact" },
                      { value: "contact1", label: "John Doe (Fleet Manager)" },
                      { value: "contact2", label: "Jane Smith (Admin)" },
                    ]}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                disabled={isSubmitting}
                {...register("tax_reminder_days_before", {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Permit Details */}
      <CollapsibleSection
        title="Permit Details"
        icon={<BadgeCheck className="h-5 w-5" />}
        iconColor="text-orange-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Input
            label="Permit Number"
            placeholder="e.g., PER123456789"
            disabled={isSubmitting}
            {...register("permit_number")}
          />

          <Input
            label="Issuing State"
            placeholder="e.g., Chhattisgarh"
            disabled={isSubmitting}
            {...register("permit_issuing_state")}
          />

          <Input
            label="Permit Type"
            placeholder="e.g., National, State"
            disabled={isSubmitting}
            {...register("permit_type")}
          />

          <Input
            label="Permit Issue Date"
            type="date"
            disabled={isSubmitting}
            {...register("permit_issue_date")}
          />

          <Input
            label="Permit Expiry Date"
            type="date"
            disabled={isSubmitting}
            {...register("permit_expiry_date")}
          />

          <Input
            label="Permit Cost (₹)"
            type="number"
            placeholder="e.g., 10000"
            disabled={isSubmitting}
            {...register("permit_cost", { valueAsNumber: true })}
          />
        </div>

        <div className="mt-3 sm:mt-4 flex justify-end">
          <Controller
            control={control}
            name="permit_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                multiple={true}
                label="Upload Permit"
                value={value as File[]}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <Checkbox
            label="Set Permit Expiry Reminder"
            checked={remindPermit}
            onChange={(e) => setValue("remind_permit", e.target.checked)}
            disabled={isSubmitting}
          />

          {remindPermit && (
            <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-gray-200 space-y-3 sm:space-y-4">
              <Controller
                control={control}
                name="permit_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: "", label: "Default Contact" },
                      { value: "contact1", label: "John Doe (Fleet Manager)" },
                      { value: "contact2", label: "Jane Smith (Admin)" },
                    ]}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                disabled={isSubmitting}
                {...register("permit_reminder_days_before", {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Pollution Certificate (PUC) */}
      <CollapsibleSection
        title="Pollution Certificate (PUC)"
        icon={<Wind className="h-5 w-5" />}
        iconColor="text-gray-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Input
            label="PUC Certificate Number"
            placeholder="e.g., PUC123456789"
            disabled={isSubmitting}
            {...register("puc_certificate_number")}
          />

          <Input
            label="PUC Issue Date"
            type="date"
            disabled={isSubmitting}
            {...register("puc_issue_date")}
          />

          <Input
            label="PUC Expiry Date"
            type="date"
            disabled={isSubmitting}
            {...register("puc_expiry_date")}
          />

          <Input
            label="PUC Cost (₹)"
            type="number"
            placeholder="e.g., 500"
            disabled={isSubmitting}
            {...register("puc_cost", { valueAsNumber: true })}
          />
        </div>

        <div className="mt-3 sm:mt-4 flex justify-end">
          <Controller
            control={control}
            name="puc_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                multiple={true}
                label="Upload PUC Certificate"
                value={value as File[]}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-3 sm:mt-4">
          <Checkbox
            label="Set PUC Expiry Reminder"
            checked={remindPuc}
            onChange={(e) => setValue("remind_puc", e.target.checked)}
            disabled={isSubmitting}
          />

          {remindPuc && (
            <div className="mt-3 pl-4 sm:pl-6 border-l-2 border-gray-200 space-y-3 sm:space-y-4">
              <Controller
                control={control}
                name="puc_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: "", label: "Default Contact" },
                      { value: "contact1", label: "John Doe (Fleet Manager)" },
                      { value: "contact2", label: "Jane Smith (Admin)" },
                    ]}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 15"
                disabled={isSubmitting}
                {...register("puc_reminder_days_before", {
                  valueAsNumber: true,
                })}
              />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Service Reminder */}
      <CollapsibleSection
        title="Service Reminder"
        icon={<Bell className="h-5 w-5" />}
        iconColor="text-indigo-600"
      >
        <div className="space-y-3 sm:space-y-4">
          <Checkbox
            label="Enable Service Reminders"
            checked={remindService}
            onChange={(e) => setValue("remind_service", e.target.checked)}
            disabled={isSubmitting}
          />

          {remindService && (
            <div className="pl-4 sm:pl-6 border-l-2 border-gray-200 space-y-3 sm:space-y-4">
              <Controller
                control={control}
                name="service_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: "", label: "Default Contact" },
                      { value: "contact1", label: "John Doe (Fleet Manager)" },
                      { value: "contact2", label: "Jane Smith (Admin)" },
                    ]}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Days Before Service"
                  type="number"
                  placeholder="e.g., 7"
                  disabled={isSubmitting}
                  {...register("service_reminder_days_before", {
                    valueAsNumber: true,
                  })}
                />

                <Input
                  label="KM Before Service"
                  type="number"
                  placeholder="e.g., 500"
                  disabled={isSubmitting}
                  {...register("service_reminder_km", { valueAsNumber: true })}
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Other Information & Documents */}
      <CollapsibleSection
        title="Other Information & Documents"
        icon={<Database className="h-5 w-5" />}
        iconColor="text-slate-600"
      >
        {/* General Information Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <Input
            label="Financer"
            placeholder="e.g., HDFC Bank"
            disabled={isSubmitting}
            {...register("financer")}
          />

          <Input
            label="Vehicle Class"
            placeholder="e.g., LMV"
            disabled={isSubmitting}
            {...register("vehicle_class")}
          />

          <Input
            label="Color"
            placeholder="e.g., White"
            disabled={isSubmitting}
            {...register("color")}
          />

          <Input
            label="Cubic Capacity"
            type="number"
            placeholder="e.g., 2500"
            disabled={isSubmitting}
            {...register("cubic_capacity", { valueAsNumber: true })}
          />

          <Input
            label="Cylinders"
            type="number"
            placeholder="e.g., 4"
            disabled={isSubmitting}
            {...register("cylinders", { valueAsNumber: true })}
          />

          <Input
            label="Unladen Weight (kg)"
            type="number"
            placeholder="e.g., 3500"
            disabled={isSubmitting}
            {...register("unladen_weight", { valueAsNumber: true })}
          />

          <Input
            label="Seating Capacity"
            type="number"
            placeholder="e.g., 2"
            disabled={isSubmitting}
            {...register("seating_capacity", { valueAsNumber: true })}
          />

          <Input
            label="Emission Norms"
            placeholder="e.g., BS6"
            disabled={isSubmitting}
            {...register("emission_norms")}
          />
        </div>

        {/* Upload Related Documents */}
        {/* <div className="mb-4 sm:mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Upload Related Documents
          </h4>
          <Controller
            control={control}
            name="other_info_documents"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload Documents"
                value={value as File[] | null}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                maxFiles={5}
                helperText="Upload up to 5 additional documents (JPG, PNG, PDF)"
                icon={<Paperclip className="h-4 w-4" />}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div> */}

        {/* Other Documents */}
        {/* <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Document List</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", file_path: "" })}
              icon={<Plus className="h-4 w-4" />}
              disabled={isSubmitting}
            >
              Add Document
            </Button>
          </div>

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
                <X className="h-5 w-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <Input
                  label="Document Name"
                  placeholder="e.g., National Permit"
                  disabled={isSubmitting}
                  {...register(`other_documents.${index}.name` as const)}
                />

                <Input
                  label="Issue Date"
                  type="date"
                  disabled={isSubmitting}
                  {...register(`other_documents.${index}.issue_date` as const)}
                />

                <Input
                  label="Expiry Date"
                  type="date"
                  disabled={isSubmitting}
                  {...register(`other_documents.${index}.expiry_date` as const)}
                />

                <Input
                  label="Document Cost (₹)"
                  type="number"
                  placeholder="e.g., 1000"
                  disabled={isSubmitting}
                  {...register(`other_documents.${index}.cost` as const, {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <Controller
                control={control}
                name={`other_documents.${index}.file_obj` as const}
                render={({ field: { value, onChange, ...field } }) => (
                  <FileUpload
                    label="Upload Document"
                    value={value as File | null}
                    onChange={onChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    icon={<Upload className="h-4 w-4" />}
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />
            </div>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-4 sm:py-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">
                No documents added yet. Click "Add Document" to add one.
              </p>
            </div>
          )}
        </div> */}
      </CollapsibleSection>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 sm:space-x-4 pt-4 sm:pt-6 border-t border-gray-200">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmittingForm || isSubmitting}>
          {initialData ? "Update Vehicle" : "Save Vehicle"}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;
