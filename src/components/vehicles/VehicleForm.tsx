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

  // Handle fetch vehicle details from VAHAN
  const handleFetchDetails = async () => {
    const regNumber = watch('registration_number');
    const chassisNumber = watch('chassis_number');

    if (!regNumber) {
      toast.error('Please enter registration number');
      return;
    }

    setIsFetching(true);
    setFetchStatus('fetching');
    setFieldsDisabled(true);

    try {
      // Skip VAHAN fetch for now due to CORS issues
      toast.warning('VAHAN fetch is temporarily unavailable. Please enter vehicle details manually.');
      setFieldsDisabled(false);
      setFetchStatus('error');
    } catch (err: any) {
      console.error('VAHAN fetch error:', err);
      toast.warning('VAHAN fetch is temporarily unavailable. Please enter vehicle details manually.');
      setFieldsDisabled(false);
      setFetchStatus('error');
    } finally {
      setIsFetching(false);
    }
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
      {/* VAHAN Fetch Section */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <p className="text-sm text-gray-600 mb-3">
          Fetch Vehicle Info from VAHAN Portal
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-2/5">
            <Input
              label="Registration Number"
              placeholder="CG04AB1234"
              icon={<Truck className="h-4 w-4" />}
              error={errors.registration_number?.message}
              required
              disabled={isFetching || isSubmitting}
              {...register('registration_number', {
                required: 'Registration number is required',
              })}
            />
          </div>
          <div className="w-full md:w-2/5">
            <Input
              label="Chassis Number (Optional)"
              placeholder="ME4JC9HEXKC012345"
              icon={<Database className="h-4 w-4" />}
              disabled={isFetching || isSubmitting}
              {...register('chassis_number')}
            />
          </div>
          <div className="w-full md:w-1/5 pt-2">
            <Button
              type="button"
              disabled={isFetching || isSubmitting}
              isLoading={isFetching}
              className="w-full"
              onClick={handleFetchDetails}
            >
              {isFetching ? 'Fetching...' : 'Fetch Details'}
            </Button>
            {fetchStatus === 'success' && (
              <div className="text-center mt-1">
                <span className="text-xs text-success-600 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Details found!
                </span>
              </div>
            )}
            {fetchStatus === 'error' && (
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
            icon={<Truck className="h-4 w-4" />}
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
            required
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
