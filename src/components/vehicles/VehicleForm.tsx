import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Vehicle, Driver } from '../../types';
import { getDrivers, getVehicles } from '../../utils/storage';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import DocumentUploader from '../shared/DocumentUploader';
import CollapsibleSection from '../ui/CollapsibleSection';
import ReminderConfigurationSection from './ReminderConfigurationSection';
import VehicleVahanSection from './VehicleVahanSection';
import { 
  Truck, 
  Calendar, 
  FileText, 
  Shield, 
  Database, 
  CheckCircle, 
  Settings,
  Plus,
  Trash2,
  Bell
} from 'lucide-react';
import { toast } from 'react-toastify';

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
  isSubmitting = false
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documentUrls, setDocumentUrls] = useState<{
    rc: string[];
    insurance: string[];
    fitness: string[];
    tax: string[];
    permit: string[];
    puc: string[];
  }>({
    rc: [],
    insurance: [],
    fitness: [],
    tax: [],
    permit: [],
    puc: []
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Vehicle>({
    defaultValues: {
      registration_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      type: 'truck',
      fuel_type: 'diesel',
      current_odometer: 0,
      status: 'active',
      chassis_number: '',
      engine_number: '',
      owner_name: '',
      tyre_size: '',
      number_of_tyres: 6,
      remind_insurance: false,
      remind_fitness: false,
      remind_puc: false,
      remind_tax: false,
      remind_permit: false,
      remind_service: false,
      other_documents: [],
      ...initialData
    }
  });

  const { fields: otherDocFields, append: appendDoc, remove: removeDoc } = useFieldArray({
    control,
    name: 'other_documents'
  });

  // Fetch drivers and vehicles for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversData, vehiclesData] = await Promise.all([
          getDrivers(),
          getVehicles()
        ]);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      }
    };

    fetchData();
  }, []);

  // Generate unique entity ID for uploads (use registration number or temp ID)
  const entityId = useMemo(() => {
    const regNumber = watch('registration_number');
    return regNumber || `temp-${Date.now()}`;
  }, [watch('registration_number')]);

  // Handle document upload completion
  const handleDocumentUpload = useCallback((docType: string, filePaths: string[]) => {
    setDocumentUrls(prev => ({
      ...prev,
      [docType]: filePaths
    }));
  }, []);

  // Handle other document upload
  const handleOtherDocumentUpload = useCallback((index: number, filePaths: string[]) => {
    if (filePaths.length > 0) {
      setValue(`other_documents.${index}.file_path`, filePaths[0]);
    }
  }, [setValue]);

  const handleFormSubmit = async (data: Vehicle) => {
    try {
      // Include uploaded document URLs in the submission
      const submissionData = {
        ...data,
        rc_document_url: documentUrls.rc,
        insurance_document_url: documentUrls.insurance,
        fitness_document_url: documentUrls.fitness,
        tax_document_url: documentUrls.tax,
        permit_document_url: documentUrls.permit,
        puc_document_url: documentUrls.puc
      };

      onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit form');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-4xl mx-auto">
      {/* Basic Information */}
      <CollapsibleSection 
        title="Basic Information" 
        icon={<Truck className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Registration Number"
            icon={<Truck className="h-4 w-4" />}
            error={errors.registration_number?.message}
            required
            {...register('registration_number', { required: 'Registration number is required' })}
          />

          <Input
            label="Make"
            error={errors.make?.message}
            required
            {...register('make', { required: 'Make is required' })}
          />

          <Input
            label="Model"
            error={errors.model?.message}
            required
            {...register('model', { required: 'Model is required' })}
          />

          <Input
            label="Year"
            type="number"
            min="1900"
            max={new Date().getFullYear() + 1}
            error={errors.year?.message}
            required
            {...register('year', { 
              required: 'Year is required',
              valueAsNumber: true,
              min: { value: 1900, message: 'Year must be 1900 or later' },
              max: { value: new Date().getFullYear() + 1, message: 'Year cannot be in the future' }
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
                {...field}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Current Odometer (km)"
            type="number"
            min="0"
            error={errors.current_odometer?.message}
            required
            {...register('current_odometer', { 
              required: 'Current odometer is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Odometer must be positive' }
            })}
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
                  { value: 'stood', label: 'Stood' }
                ]}
                error={errors.status?.message}
                required
                {...field}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Chassis Number"
            error={errors.chassis_number?.message}
            {...register('chassis_number')}
          />

          <Input
            label="Engine Number"
            error={errors.engine_number?.message}
            {...register('engine_number')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Owner Name"
            error={errors.owner_name?.message}
            {...register('owner_name')}
          />

          <Controller
            control={control}
            name="primary_driver_id"
            render={({ field }) => (
              <Select
                label="Primary Driver"
                options={[
                  { value: '', label: 'Select Driver' },
                  ...drivers.map(driver => ({
                    value: driver.id || '',
                    label: driver.name
                  }))
                ]}
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
        iconColor="text-green-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DocumentUploader
            label="RC Document"
            bucketType="vehicle"
            entityId={entityId}
            docType="rc"
            onUploadComplete={(paths) => handleDocumentUpload('rc', paths)}
            helperText="Upload Registration Certificate"
            variant="compact"
          />

          <DocumentUploader
            label="Insurance Document"
            bucketType="vehicle"
            entityId={entityId}
            docType="insurance"
            onUploadComplete={(paths) => handleDocumentUpload('insurance', paths)}
            helperText="Upload Insurance Policy"
            variant="compact"
          />

          <DocumentUploader
            label="Fitness Certificate"
            bucketType="vehicle"
            entityId={entityId}
            docType="fitness"
            onUploadComplete={(paths) => handleDocumentUpload('fitness', paths)}
            helperText="Upload Fitness Certificate"
            variant="compact"
          />

          <DocumentUploader
            label="Tax Receipt"
            bucketType="vehicle"
            entityId={entityId}
            docType="tax"
            onUploadComplete={(paths) => handleDocumentUpload('tax', paths)}
            helperText="Upload Tax Receipt"
            variant="compact"
          />

          <DocumentUploader
            label="Permit Document"
            bucketType="vehicle"
            entityId={entityId}
            docType="permit"
            onUploadComplete={(paths) => handleDocumentUpload('permit', paths)}
            helperText="Upload Transport Permit"
            variant="compact"
          />

          <DocumentUploader
            label="PUC Certificate"
            bucketType="vehicle"
            entityId={entityId}
            docType="puc"
            onUploadComplete={(paths) => handleDocumentUpload('puc', paths)}
            helperText="Upload Pollution Under Control Certificate"
            variant="compact"
          />
        </div>
      </CollapsibleSection>

      {/* Vehicle Details */}
      <CollapsibleSection 
        title="Additional Details" 
        icon={<Settings className="h-5 w-5" />}
        iconColor="text-gray-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tyre Size"
            placeholder="e.g., 215/75 R17.5"
            error={errors.tyre_size?.message}
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            min="2"
            max="22"
            error={errors.number_of_tyres?.message}
            {...register('number_of_tyres', { 
              valueAsNumber: true,
              min: { value: 2, message: 'Must have at least 2 tyres' },
              max: { value: 22, message: 'Maximum 22 tyres allowed' }
            })}
          />

          <Input
            label="Vehicle Class"
            placeholder="e.g., Heavy Motor Vehicle"
            error={errors.vehicle_class?.message}
            {...register('vehicle_class')}
          />

          <Input
            label="Color"
            error={errors.color?.message}
            {...register('color')}
          />

          <Input
            label="Cubic Capacity (CC)"
            type="number"
            min="0"
            error={errors.cubic_capacity?.message}
            {...register('cubic_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Number of Cylinders"
            type="number"
            min="1"
            max="12"
            error={errors.cylinders?.message}
            {...register('cylinders', { valueAsNumber: true })}
          />

          <Input
            label="Unladen Weight (kg)"
            type="number"
            min="0"
            error={errors.unladen_weight?.message}
            {...register('unladen_weight', { valueAsNumber: true })}
          />

          <Input
            label="Seating Capacity"
            type="number"
            min="1"
            max="100"
            error={errors.seating_capacity?.message}
            {...register('seating_capacity', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Other Documents */}
      <CollapsibleSection 
        title="Other Documents" 
        icon={<Database className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={false}
      >
        <div className="space-y-4">
          {otherDocFields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 relative">
              <button
                type="button"
                onClick={() => removeDoc(index)}
                className="absolute top-2 right-2 text-error-500 hover:text-error-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                <Input
                  label="Document Name"
                  placeholder="e.g., NOC, Bank Documents"
                  {...register(`other_documents.${index}.name` as const, {
                    required: 'Document name is required'
                  })}
                />

                <div>
                  <DocumentUploader
                    label="Upload Document"
                    bucketType="vehicle"
                    entityId={entityId}
                    docType={`other_${index}`}
                    onUploadComplete={(paths) => handleOtherDocumentUpload(index, paths)}
                    helperText="Upload additional document"
                    variant="compact"
                  />
                </div>

                <Input
                  label="Issue Date"
                  type="date"
                  {...register(`other_documents.${index}.issue_date` as const)}
                />

                <Input
                  label="Expiry Date"
                  type="date"
                  {...register(`other_documents.${index}.expiry_date` as const)}
                />

                <Input
                  label="Cost (₹)"
                  type="number"
                  min="0"
                  {...register(`other_documents.${index}.cost` as const, { valueAsNumber: true })}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendDoc({ 
              name: '', 
              issue_date: '', 
              expiry_date: '', 
              cost: 0,
              file_path: ''
            })}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Document
          </Button>
        </div>
      </CollapsibleSection>

      {/* Reminder Configuration */}
      <ReminderConfigurationSection />

      {/* VAHAN Integration */}
      <VehicleVahanSection />

      {/* Submit Button */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
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
          icon={<CheckCircle className="h-4 w-4" />}
        >
          {initialData?.id ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;