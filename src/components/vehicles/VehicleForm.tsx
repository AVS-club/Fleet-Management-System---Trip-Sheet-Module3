import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Vehicle, Driver } from '@/types';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { getReminderContacts, ReminderContact } from '../../utils/reminderService';
import { getDrivers } from '../../utils/storage';
import { supabase } from '../../utils/supabaseClient';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import DocumentUploader from '../shared/DocumentUploader';
import CollapsibleSection from '../ui/CollapsibleSection';
import VehicleSummaryChips from './VehicleSummaryChips';
import {
  Truck,
  Calendar,
  FileText,
  Fuel,
  User,
  Shield,
  Database,
  MapPin,
  Settings,
  Package,
  Plus,
  Trash2,
  Bell,
  CheckCircle,
  AlertTriangle,
  Car,
  Hash,
  Palette,
  Weight,
  Users,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format, differenceInYears } from 'date-fns';

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Omit<Vehicle, 'id'>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [reminderContacts, setReminderContacts] = useState<ReminderContact[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [fieldsDisabled, setFieldsDisabled] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string[]>>({});

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<Vehicle>({
    defaultValues: {
      type: 'truck',
      fuel_type: 'diesel',
      status: 'active',
      current_odometer: 0,
      remind_insurance: false,
      remind_fitness: false,
      remind_puc: false,
      remind_tax: false,
      remind_permit: false,
      remind_service: false,
      other_documents: [],
      ...initialData,
    },
  });

  // Field array for other documents
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'other_documents',
  });

  // Enable fields if initialData is present (for edit mode)
  useEffect(() => {
    if (initialData?.id) setFieldsDisabled(false);
  }, [initialData]);

  // Fetch required data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsData, contactsData, driversData] = await Promise.all([
          getMaterialTypes(),
          getReminderContacts(),
          getDrivers()
        ]);
        
        setMaterialTypes(Array.isArray(materialsData) ? materialsData : []);
        setReminderContacts(Array.isArray(contactsData) ? contactsData : []);
        setAvailableDrivers(Array.isArray(driversData) ? driversData : []);
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      }
    };

    fetchData();
  }, []);

  // Handle document upload completion
  const handleDocumentUpload = (docType: string, filePaths: string[]) => {
    setUploadedDocuments(prev => ({
      ...prev,
      [docType]: filePaths
    }));
    
    // Update form field with the uploaded file paths
    const fieldName = `${docType}_document_url` as keyof Vehicle;
    setValue(fieldName, filePaths as any);
  };

  // Handle fetch vehicle details from RC API
  const handleFetchDetails = async () => {
    const regNumber = watch('registration_number');

    if (!regNumber) {
      toast.error('Please enter registration number');
      return;
    }

    setIsFetching(true);
    setFetchStatus('fetching');
    setFieldsDisabled(true);

    try {
      // Call the Edge function - fetch-rc-details
      const { data: result, error } = await supabase.functions.invoke('fetch-rc-details', {
        body: {
          registration_number: regNumber,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch details');
      }

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch vehicle details');
      }

      // Extract the RC data from the response
      const rcData = result.data?.response || result.data || {};

      // Map RC API response to form fields
      const mappedData: Partial<Vehicle> = {
        registration_number: regNumber.toUpperCase(),
        make: rcData.maker_model || rcData.maker || '',
        model: rcData.maker_model || rcData.model || '',
        year: parseInt(rcData.manufacturing_year || rcData.m_y_manufacturing) || new Date().getFullYear(),
        chassis_number: rcData.chassis_number || rcData.ch_no || '',
        engine_number: rcData.engine_number || rcData.eng_no || '',
        owner_name: rcData.owner_name || rcData.registered_owner_name || '',
        fuel_type: mapFuelType(rcData.fuel_type || rcData.fuel || 'diesel'),
        vehicle_class: rcData.vehicle_class || rcData.v_catg || rcData.vch_catg || '',
        color: rcData.color || rcData.colour || '',
        cubic_capacity: parseFloat(rcData.cubic_capacity || rcData.cubic_cap) || undefined,
        cylinders: parseInt(rcData.no_of_cylinders || rcData.no_cyl) || undefined,
        unladen_weight: parseFloat(rcData.unladen_weight || rcData.u_weight) || undefined,
        seating_capacity: parseInt(rcData.seating_capacity || rcData.seat_cap) || undefined,
        emission_norms: rcData.emission_norms || rcData.norms || '',
        financer: rcData.financer || rcData.financed_by || '',
        insurance_policy_number: rcData.insurance_policy_no || rcData.insurance_policy || '',
        insurer_name: rcData.insurance_company || rcData.insurance_comp || '',
        insurance_expiry_date: formatDateString(rcData.insurance_validity || rcData.insurance_upto),
        fitness_expiry_date: formatDateString(rcData.fitness_validity || rcData.fitness_upto),
        tax_paid_upto: formatDateString(rcData.tax_validity || rcData.tax_upto),
        permit_expiry_date: formatDateString(rcData.permit_validity_upto || rcData.permit_upto),
        permit_number: rcData.permit_no || rcData.permit_number || '',
        permit_issuing_state: rcData.permit_issue_state || '',
        puc_expiry_date: formatDateString(rcData.pucc_validity || rcData.pucc_upto),
        puc_certificate_number: rcData.pucc_no || rcData.pucc_number || '',
        rc_status: rcData.rc_status || rcData.status || '',
        registration_date: formatDateString(rcData.registration_date || rcData.regd_date),
        noc_details: rcData.noc_details || rcData.noc || '',
        national_permit_number: rcData.national_permit_no || '',
        national_permit_upto: formatDateString(rcData.national_permit_validity),
        type: getVehicleTypeFromClass(rcData.vehicle_class || rcData.v_catg || ''),
      };

      // Update form with fetched data
      Object.entries(mappedData).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          setValue(key as keyof Vehicle, value as any);
        }
      });

      // Mark that data was fetched from VAHAN
      setValue('vahan_last_fetched_at', new Date().toISOString());
      setVehicleInfo(mappedData);

      setFieldsDisabled(false);
      setFetchStatus('success');
      toast.success('Vehicle details fetched successfully! Please verify and complete the form.');
    } catch (err: any) {
      console.error('RC fetch error:', err);
      toast.error(err.message || 'Failed to fetch vehicle details. Please enter details manually.');
      setFieldsDisabled(false);
      setFetchStatus('error');
    } finally {
      setIsFetching(false);
    }
  };

  // Helper function to map fuel type from API response
  const mapFuelType = (fuelType: string): Vehicle['fuel_type'] => {
    const fuel = fuelType.toLowerCase();
    if (fuel.includes('diesel')) return 'diesel';
    if (fuel.includes('petrol')) return 'petrol';
    if (fuel.includes('cng')) return 'cng';
    if (fuel.includes('electric') || fuel.includes('battery')) return 'electric';
    if (fuel.includes('hybrid')) return 'hybrid';
    return 'diesel'; // default
  };

  // Helper function to determine vehicle type from class
  const getVehicleTypeFromClass = (vehicleClass: string): Vehicle['type'] => {
    const classLower = vehicleClass.toLowerCase();
    if (classLower.includes('truck') || classLower.includes('goods')) return 'truck';
    if (classLower.includes('bus')) return 'bus';
    if (classLower.includes('van')) return 'van';
    if (classLower.includes('tanker')) return 'tanker';
    if (classLower.includes('tipper')) return 'tipper';
    if (classLower.includes('trailer')) return 'trailer';
    if (classLower.includes('container')) return 'container';
    if (classLower.includes('tempo')) return 'tempo';
    return 'truck'; // default
  };

  // Helper function to format date strings from API
  const formatDateString = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return undefined;
    
    // Handle different date formats from API
    // Format: DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      // Assume DD-MM-YYYY or DD/MM/YYYY format
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      // Assume YYYY-MM-DD format (already correct)
      if (parts[0].length === 4) {
        return dateStr.replace(/\//g, '-');
      }
    }
    
    return dateStr;
  };

  const onFormSubmit = (data: Vehicle) => {
    // Include uploaded document URLs in the submission
    const formData = {
      ...data,
      rc_document_url: uploadedDocuments.rc || [],
      insurance_document_url: uploadedDocuments.insurance || [],
      fitness_document_url: uploadedDocuments.fitness || [],
      tax_document_url: uploadedDocuments.tax || [],
      permit_document_url: uploadedDocuments.permit || [],
      puc_document_url: uploadedDocuments.puc || [],
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* RC Fetch Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-700 font-medium">
            Fetch Vehicle Info from RC Details (VAHAN Portal)
          </p>
          {vehicleInfo?.vahan_last_fetched_at && (
            <span className="text-xs text-gray-500">
              Last fetched: {format(new Date(vehicleInfo.vahan_last_fetched_at), 'dd MMM yyyy HH:mm')}
            </span>
          )}
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-3/5">
            <Input
              label="Registration Number"
              placeholder="CG04AB1234"
              icon={<Truck className="h-4 w-4" />}
              error={errors.registration_number?.message}
              required
              disabled={isFetching || isSubmitting}
              {...register('registration_number', {
                required: 'Registration number is required',
                pattern: {
                  value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$/i,
                  message: 'Invalid registration number format (e.g., CG04AB1234)'
                }
              })}
            />
          </div>
          <div className="w-full md:w-2/5 pt-2">
            <Button
              type="button"
              disabled={isFetching || isSubmitting || !watch('registration_number')}
              isLoading={isFetching}
              className="w-full"
              onClick={handleFetchDetails}
            >
              {isFetching ? 'Fetching...' : 'Fetch RC Details'}
            </Button>
            {fetchStatus === 'success' && (
              <div className="text-center mt-1">
                <span className="text-xs text-success-600 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Details fetched successfully!
                </span>
              </div>
            )}
            {fetchStatus === 'error' && (
              <div className="text-center mt-1">
                <span className="text-xs text-error-600 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Fetch failed - Enter manually
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <CollapsibleSection
        title="Basic Information"
        icon={<Truck className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Make"
            icon={<Truck className="h-4 w-4" />}
            error={errors.make?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register('make', { required: 'Make is required' })}
          />

          <Input
            label="Model"
            icon={<Car className="h-4 w-4" />}
            error={errors.model?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register('model', { required: 'Model is required' })}
          />

          <Input
            label="Year"
            type="number"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.year?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register('year', {
              required: 'Year is required',
              valueAsNumber: true,
              min: { value: 1900, message: 'Invalid year' },
              max: { value: new Date().getFullYear() + 1, message: 'Invalid year' }
            })}
          />

          <Controller
            control={control}
            name="type"
            rules={{ required: 'Vehicle type is required' }}
            render={({ field }) => (
              <Select
                label="Vehicle Type"
                options={[
                  { value: 'truck', label: 'Truck' },
                  { value: 'tempo', label: 'Tempo' },
                  { value: 'trailer', label: 'Trailer' },
                  { value: 'bus', label: 'Bus' },
                  { value: 'van', label: 'Van' },
                  { value: 'tanker', label: 'Tanker' },
                  { value: 'tipper', label: 'Tipper' },
                  { value: 'container', label: 'Container' },
                  { value: 'car', label: 'Car' },
                  { value: 'other', label: 'Other' }
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
            rules={{ required: 'Fuel type is required' }}
            render={({ field }) => (
              <Select
                label="Fuel Type"
                options={[
                  { value: 'diesel', label: 'Diesel' },
                  { value: 'petrol', label: 'Petrol' },
                  { value: 'cng', label: 'CNG' },
                  { value: 'electric', label: 'Electric' },
                  { value: 'hybrid', label: 'Hybrid' }
                ]}
                error={errors.fuel_type?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="status"
            rules={{ required: 'Status is required' }}
            render={({ field }) => (
              <Select
                label="Status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'maintenance', label: 'Under Maintenance' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                error={errors.status?.message}
                required
                disabled={isSubmitting}
                {...field}
              />
            )}
          />

          <Input
            label="Current Odometer (km)"
            type="number"
            icon={<MapPin className="h-4 w-4" />}
            error={errors.current_odometer?.message}
            required
            disabled={isSubmitting}
            {...register('current_odometer', {
              required: 'Current odometer is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Odometer must be positive' }
            })}
          />

          <Controller
            name="primary_driver_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Primary Driver"
                options={[
                  { value: '', label: 'Select driver' },
                  ...availableDrivers.map(driver => ({
                    value: driver.id,
                    label: `${driver.name} - ${driver.license_number}`
                  }))
                ]}
                icon={<User className="h-4 w-4" />}
                error={errors.primary_driver_id?.message}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>
      </CollapsibleSection>

      {/* Technical Details */}
      <CollapsibleSection
        title="Technical Details"
        icon={<Database className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Chassis Number"
            icon={<Hash className="h-4 w-4" />}
            error={errors.chassis_number?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('chassis_number')}
          />

          <Input
            label="Engine Number"
            icon={<Hash className="h-4 w-4" />}
            error={errors.engine_number?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('engine_number')}
          />

          <Input
            label="Owner Name"
            icon={<User className="h-4 w-4" />}
            error={errors.owner_name?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('owner_name')}
          />

          <Input
            label="Vehicle Class"
            icon={<Car className="h-4 w-4" />}
            error={errors.vehicle_class?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('vehicle_class')}
          />

          <Input
            label="Color"
            icon={<Palette className="h-4 w-4" />}
            error={errors.color?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('color')}
          />

          <Input
            label="Cubic Capacity (cc)"
            type="number"
            icon={<Database className="h-4 w-4" />}
            error={errors.cubic_capacity?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('cubic_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Number of Cylinders"
            type="number"
            icon={<Database className="h-4 w-4" />}
            error={errors.cylinders?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('cylinders', { valueAsNumber: true })}
          />

          <Input
            label="Unladen Weight (kg)"
            type="number"
            icon={<Weight className="h-4 w-4" />}
            error={errors.unladen_weight?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('unladen_weight', { valueAsNumber: true })}
          />

          <Input
            label="Seating Capacity"
            type="number"
            icon={<Users className="h-4 w-4" />}
            error={errors.seating_capacity?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('seating_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Emission Norms"
            icon={<Database className="h-4 w-4" />}
            error={errors.emission_norms?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('emission_norms')}
          />

          <Input
            label="Tyre Size"
            placeholder="e.g., 295/80 R22.5"
            icon={<Settings className="h-4 w-4" />}
            error={errors.tyre_size?.message}
            disabled={isSubmitting}
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            icon={<Settings className="h-4 w-4" />}
            error={errors.number_of_tyres?.message}
            disabled={isSubmitting}
            {...register('number_of_tyres', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Registration & Finance Details */}
      <CollapsibleSection
        title="Registration & Finance"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Registration Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.registration_date?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('registration_date')}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.rc_expiry_date?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('rc_expiry_date')}
          />

          <Input
            label="RC Status"
            icon={<FileText className="h-4 w-4" />}
            error={errors.rc_status?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('rc_status')}
          />

          <Input
            label="Financer"
            icon={<Shield className="h-4 w-4" />}
            error={errors.financer?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('financer')}
          />

          <Input
            label="NOC Details"
            icon={<FileText className="h-4 w-4" />}
            error={errors.noc_details?.message}
            disabled={fieldsDisabled || isSubmitting}
            {...register('noc_details')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DocumentUploader
            label="RC Document"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="rc"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('rc', paths)}
            initialFilePaths={initialData?.rc_document_url || []}
            required
            helperText="Upload RC copy (PDF/Image)"
          />

          <DocumentUploader
            label="Insurance Document"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="insurance"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('insurance', paths)}
            initialFilePaths={initialData?.insurance_document_url || []}
            required
            helperText="Upload insurance policy (PDF/Image)"
          />

          <DocumentUploader
            label="Fitness Certificate"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="fitness"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('fitness', paths)}
            initialFilePaths={initialData?.fitness_document_url || []}
            helperText="Upload fitness certificate (PDF/Image)"
          />

          <DocumentUploader
            label="Tax Receipt"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="tax"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('tax', paths)}
            initialFilePaths={initialData?.tax_document_url || []}
            helperText="Upload tax receipt (PDF/Image)"
          />

          <DocumentUploader
            label="Permit Document"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="permit"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('permit', paths)}
            initialFilePaths={initialData?.permit_document_url || []}
            helperText="Upload permit document (PDF/Image)"
          />

          <DocumentUploader
            label="PUC Certificate"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="puc"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('puc', paths)}
            initialFilePaths={initialData?.puc_document_url || []}
            required
            helperText="Upload PUC certificate (PDF/Image)"
          />
        </div>
      </CollapsibleSection>

      {/* Insurance Details */}
      <CollapsibleSection
        title="Insurance Details"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Policy Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_policy_number')}
          />

          <Input
            label="Insurer Name"
            icon={<Shield className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurer_name')}
          />

          <Input
            label="Start Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_start_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_expiry_date')}
          />

          <Input
            label="Premium Amount"
            type="number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_premium_amount', { valueAsNumber: true })}
          />

          <Input
            label="IDV Amount"
            type="number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_idv', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Fitness Details */}
      <CollapsibleSection
        title="Fitness Details"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-yellow-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Fitness Certificate Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_certificate_number')}
          />

          <Input
            label="Fitness Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_issue_date')}
          />

          <Input
            label="Fitness Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_expiry_date')}
          />

          <Input
            label="Fitness Cost"
            type="number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_cost', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Tax Details */}
      <CollapsibleSection
        title="Tax Details"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-indigo-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tax Receipt Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_receipt_number')}
          />

          <Input
            label="Tax Amount"
            type="number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_amount', { valueAsNumber: true })}
          />

          <Input
            label="Tax Paid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_paid_upto')}
          />

          <Input
            label="Tax Period"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_period')}
          />
        </div>
      </CollapsibleSection>

      {/* Permit Details */}
      <CollapsibleSection
        title="Permit Details"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-orange-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Permit Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_number')}
          />

          <Input
            label="Permit Issuing State"
            icon={<MapPin className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_issuing_state')}
          />

          <Controller
            control={control}
            name="permit_type"
            render={({ field }) => (
              <Select
                label="Permit Type"
                options={[
                  { value: '', label: 'Select permit type' },
                  { value: 'national', label: 'National' },
                  { value: 'state', label: 'State' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'tourist', label: 'Tourist' }
                ]}
                icon={<FileText className="h-4 w-4" />}
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
          />

          <Input
            label="Permit Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_issue_date')}
          />

          <Input
            label="Permit Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_expiry_date')}
          />

          <Input
            label="Permit Cost"
            type="number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_cost', { valueAsNumber: true })}
          />

          <Input
            label="National Permit Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('national_permit_number')}
          />

          <Input
            label="National Permit Valid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('national_permit_upto')}
          />
        </div>
      </CollapsibleSection>

      {/* PUC Details */}
      <CollapsibleSection
        title="PUC Details"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="PUC Certificate Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_certificate_number')}
          />

          <Input
            label="PUC Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_issue_date')}
          />

          <Input
            label="PUC Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_expiry_date')}
          />

          <Input
            label="PUC Cost"
            type="number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_cost', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3 pt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={fieldsDisabled && !initialData?.id}
        >
          {initialData?.id ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;