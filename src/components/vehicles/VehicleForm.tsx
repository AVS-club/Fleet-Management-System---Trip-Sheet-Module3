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
  DollarSign,
  Clock,
  CreditCard,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

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
        const [contactsData, driversData] = await Promise.all([
          getReminderContacts(),
          getDrivers()
        ]);
        
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

      const rcData = result.data?.response || result.data || {};

      // Map RC API response to form fields - only map fields that exist in database
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

      setValue('vahan_last_fetched_at', new Date().toISOString());

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

  // Helper functions
  const mapFuelType = (fuelType: string): Vehicle['fuel_type'] => {
    const fuel = fuelType.toLowerCase();
    if (fuel.includes('diesel')) return 'diesel';
    if (fuel.includes('petrol')) return 'petrol';
    if (fuel.includes('cng')) return 'cng';
    return 'diesel';
  };

  const getVehicleTypeFromClass = (vehicleClass: string): Vehicle['type'] => {
    const classLower = vehicleClass.toLowerCase();
    if (classLower.includes('tempo')) return 'tempo';
    if (classLower.includes('trailer')) return 'trailer';
    if (classLower.includes('truck') || classLower.includes('goods')) return 'truck';
    return 'truck';
  };

  const formatDateString = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return undefined;
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      if (parts[0].length === 4) {
        return dateStr.replace(/\//g, '-');
      }
    }
    return dateStr;
  };

  const onFormSubmit = (data: Vehicle) => {
    const formData = {
      ...data,
      rc_document_url: uploadedDocuments.rc || data.rc_document_url || [],
      insurance_document_url: uploadedDocuments.insurance || data.insurance_document_url || [],
      fitness_document_url: uploadedDocuments.fitness || data.fitness_document_url || [],
      tax_document_url: uploadedDocuments.tax || data.tax_document_url || [],
      permit_document_url: uploadedDocuments.permit || data.permit_document_url || [],
      puc_document_url: uploadedDocuments.puc || data.puc_document_url || [],
    };

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* RC Fetch Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 mb-6">
        <p className="text-sm text-gray-700 font-medium mb-3">
          Fetch Vehicle Info from RC Details
        </p>
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
                  value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{1,4}$/i,
                  message: 'Invalid registration number format'
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
                  Details fetched!
                </span>
              </div>
            )}
            {fetchStatus === 'error' && (
              <div className="text-center mt-1">
                <span className="text-xs text-error-600 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Enter manually
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
                  { value: 'trailer', label: 'Trailer' }
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
                  { value: 'cng', label: 'CNG' }
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
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'stood', label: 'Stood' },
                  { value: 'archived', label: 'Archived' }
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
            disabled={fieldsDisabled || isSubmitting}
            {...register('chassis_number')}
          />

          <Input
            label="Engine Number"
            icon={<Hash className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('engine_number')}
          />

          <Input
            label="Vehicle Class"
            icon={<Car className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('vehicle_class')}
          />

          <Input
            label="Color"
            icon={<Palette className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('color')}
          />

          <Input
            label="Cubic Capacity (cc)"
            type="number"
            icon={<Database className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('cubic_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Number of Cylinders"
            type="number"
            icon={<Database className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('cylinders', { valueAsNumber: true })}
          />

          <Input
            label="Unladen Weight (kg)"
            type="number"
            icon={<Weight className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('unladen_weight', { valueAsNumber: true })}
          />

          <Input
            label="Seating Capacity"
            type="number"
            icon={<Users className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('seating_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Emission Norms"
            icon={<Database className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('emission_norms')}
          />

          <Input
            label="Tyre Size"
            placeholder="e.g., 295/80 R22.5"
            icon={<Settings className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            icon={<Settings className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register('number_of_tyres', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Registration & Ownership */}
      <CollapsibleSection
        title="Registration & Ownership"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Owner Name"
            icon={<User className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('owner_name')}
          />

          <Input
            label="Registration Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('registration_date')}
          />

          <Input
            label="RC Status"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('rc_status')}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('rc_expiry_date')}
          />

          <Input
            label="Financer"
            icon={<CreditCard className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('financer')}
          />

          <Input
            label="NOC Details"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('noc_details')}
          />
        </div>
      </CollapsibleSection>

      {/* Insurance Details */}
      <CollapsibleSection
        title="Insurance"
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
            icon={<DollarSign className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_premium_amount', { valueAsNumber: true })}
          />

          <Input
            label="IDV Amount"
            type="number"
            icon={<DollarSign className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_idv', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Fitness Certificate */}
      <CollapsibleSection
        title="Fitness Certificate"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-yellow-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Certificate Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_expiry_date')}
          />

          <Input
            label="Cost"
            type="number"
            icon={<DollarSign className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_cost', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Tax Details */}
      <CollapsibleSection
        title="Tax"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-indigo-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Receipt Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_receipt_number')}
          />

          <Input
            label="Amount"
            type="number"
            icon={<DollarSign className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_amount', { valueAsNumber: true })}
          />

          <Input
            label="Period"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_period')}
          />

          <Input
            label="Paid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_paid_upto')}
          />
        </div>
      </CollapsibleSection>

      {/* Permit Details */}
      <CollapsibleSection
        title="Permit"
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
            label="Issuing State"
            icon={<MapPin className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_issuing_state')}
          />

          <Input
            label="Permit Type"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_type')}
          />

          <Input
            label="Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_expiry_date')}
          />

          <Input
            label="Cost"
            type="number"
            icon={<DollarSign className="h-4 w-4" />}
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
        title="Pollution Certificate (PUC)"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Certificate Number"
            icon={<FileText className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_expiry_date')}
          />

          <Input
            label="Cost"
            type="number"
            icon={<DollarSign className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_cost', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Document Uploads */}
      <CollapsibleSection
        title="Document Uploads"
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
            helperText="Upload RC copy"
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
            helperText="Upload insurance policy"
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
            helperText="Upload fitness certificate"
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
            helperText="Upload tax receipt"
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
            helperText="Upload permit document"
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
            helperText="Upload PUC certificate"
          />
        </div>
      </CollapsibleSection>

      {/* Reminders Configuration */}
      <CollapsibleSection
        title="Reminder Settings"
        icon={<Bell className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={false}
      >
        <div className="space-y-6">
          {/* Insurance Reminder */}
          <div className="border-l-4 border-blue-500 pl-4">
            <Controller
              name="remind_insurance"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Insurance Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_insurance') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="insurance_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('insurance_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Fitness Reminder */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <Controller
              name="remind_fitness"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Fitness Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_fitness') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="fitness_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('fitness_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Tax Reminder */}
          <div className="border-l-4 border-indigo-500 pl-4">
            <Controller
              name="remind_tax"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Tax Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_tax') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="tax_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('tax_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Permit Reminder */}
          <div className="border-l-4 border-orange-500 pl-4">
            <Controller
              name="remind_permit"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Permit Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_permit') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="permit_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('permit_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* PUC Reminder */}
          <div className="border-l-4 border-green-500 pl-4">
            <Controller
              name="remind_puc"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable PUC Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_puc') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="puc_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('puc_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Service Reminder */}
          <div className="border-l-4 border-purple-500 pl-4">
            <Controller
              name="remind_service"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Service Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_service') && (
              <div className="space-y-4 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="service_reminder_contact_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Contact Person"
                        options={[
                          { value: '', label: 'Select contact' },
                          ...reminderContacts.map(contact => ({
                            value: contact.id,
                            label: contact.full_name
                          }))
                        ]}
                        {...field}
                      />
                    )}
                  />
                  <Input
                    label="Days Before Service"
                    type="number"
                    {...register('service_reminder_days_before', { valueAsNumber: true })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Service Interval (km)"
                    type="number"
                    {...register('service_interval_km', { valueAsNumber: true })}
                  />
                  <Input
                    label="Service Interval (days)"
                    type="number"
                    {...register('service_interval_days', { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
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