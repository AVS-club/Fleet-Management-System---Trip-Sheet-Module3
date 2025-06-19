import React, { useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Vehicle, RCDetails, InsuranceDetails } from '../../types';
import { processRCDocument, extractRCDetails } from '../../utils/ocrService';
import { Truck, Calendar, FileText, Upload, X, Plus, Database, Info, Paperclip, IndianRupee, Shield, CheckSquare, FileCheck, BadgeCheck, Wind, Bell } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import FileUpload from '../ui/FileUpload';
import Checkbox from '../ui/Checkbox';
import RCPreviewModal from './RCPreviewModal';
import InsurancePreviewModal from './InsurancePreviewModal';
import { toast } from 'react-toastify';
import CollapsibleSection from '../ui/CollapsibleSection';

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Omit<Vehicle, 'id'>) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [rcPreviewData, setRcPreviewData] = useState<RCDetails[] | null>(null);
  const [insurancePreviewData, setInsurancePreviewData] = useState<InsuranceDetails | null>(null);
  const [rcProcessing, setRcProcessing] = useState(false);
  const [insuranceProcessing, setInsuranceProcessing] = useState(false);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<Vehicle>({
    defaultValues: {
      registration_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      type: 'truck',
      fuel_type: 'diesel',
      current_odometer: 0,
      status: 'active',
      ...initialData
    }
  });

  // Field array for other documents
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'other_documents'
  });

  // Watch values for conditional rendering
  const remindInsurance = watch('remind_insurance');
  const remindFitness = watch('remind_fitness');
  const remindPuc = watch('remind_puc');
  const remindTax = watch('remind_tax');
  const remindPermit = watch('remind_permit');
  const remindService = watch('remind_service');

  // Process RC document
  const handleRCUpload = async (file: File) => {
    if (!file) return;

    setRcProcessing(true);
    try {
      const result = await processRCDocument(file);
      setRcPreviewData([result]);
    } catch (error) {
      console.error('Error processing RC document:', error);
      
      // Try to extract data from OCR text if available
      if (error instanceof Error && error.message.includes('text')) {
        try {
          const text = error.message.split('text:')[1] || '';
          const extractedData = extractRCDetails(text);
          setRcPreviewData(extractedData);
        } catch (extractError) {
          console.error('Error extracting RC details:', extractError);
          toast.error('Failed to process RC document');
        }
      } else {
        toast.error('Failed to process RC document');
      }
    } finally {
      setRcProcessing(false);
    }
  };

  // Process Insurance document
  const handleInsuranceUpload = async (file: File) => {
    if (!file) return;

    setInsuranceProcessing(true);
    try {
      // This would be replaced with actual insurance document processing
      // For now, we'll just simulate it
      setTimeout(() => {
        const mockData: InsuranceDetails = {
          policyNumber: 'POL' + Math.floor(Math.random() * 10000000),
          insurerName: 'Sample Insurance Co.',
          validFrom: new Date().toISOString(),
          validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          vehicleNumber: watch('registration_number'),
          coverage: 'Comprehensive',
          premium: 25000,
          confidence: 0.9
        };
        setInsurancePreviewData(mockData);
        setInsuranceProcessing(false);
      }, 1500);
    } catch (error) {
      console.error('Error processing insurance document:', error);
      toast.error('Failed to process insurance document');
      setInsuranceProcessing(false);
    }
  };

  // Handle RC details confirmation
  const handleRCConfirm = (details: RCDetails) => {
    setValue('registration_number', details.registrationNumber || watch('registration_number'));
    setValue('chassis_number', details.chassisNumber || watch('chassis_number'));
    setValue('engine_number', details.engineNumber || watch('engine_number'));
    setValue('make', details.make || watch('make'));
    setValue('model', details.model || watch('model'));
    setValue('year', parseInt(details.yearOfManufacture || watch('year').toString()));
    setValue('fuel_type', (details.fuelType?.toLowerCase() as 'diesel' | 'petrol' | 'cng') || watch('fuel_type'));
    setValue('owner_name', details.ownerName || watch('owner_name'));
    setValue('color', details.color || watch('color'));
    
    // Set RC document flag
    setValue('rc_copy', true);
    
    setRcPreviewData(null);
  };

  // Handle Insurance details confirmation
  const handleInsuranceConfirm = (details: InsuranceDetails) => {
    setValue('policy_number', details.policyNumber || watch('policy_number'));
    setValue('insurer_name', details.insurerName || watch('insurer_name'));
    setValue('insurance_start_date', details.validFrom ? new Date(details.validFrom).toISOString().split('T')[0] : watch('insurance_start_date'));
    setValue('insurance_expiry_date', details.validUntil ? new Date(details.validUntil).toISOString().split('T')[0] : watch('insurance_expiry_date'));
    setValue('insurance_premium_amount', details.premium || watch('insurance_premium_amount'));
    
    // Set insurance document flag
    setValue('insurance_document', true);
    
    setInsurancePreviewData(null);
  };

  // Fetch vehicle details from external API
  const fetchVehicleDetails = async () => {
    const registrationNumber = watch('registration_number');
    if (!registrationNumber || registrationNumber.length < 6) {
      toast.error('Please enter a valid registration number');
      return;
    }

    try {
      toast.info('Fetching vehicle details...');
      
      // Call the Supabase Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-rc-details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ registration_number: registrationNumber })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed with status ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Process the vehicle data
        const vehicleData = data.data;
        
        // Update form fields with the fetched data
        setValue('make', vehicleData.maker || watch('make'));
        setValue('model', vehicleData.model || watch('model'));
        setValue('chassis_number', vehicleData.chasi_no || watch('chassis_number'));
        setValue('engine_number', vehicleData.engine_no || watch('engine_number'));
        setValue('registration_date', vehicleData.regn_dt ? new Date(vehicleData.regn_dt).toISOString().split('T')[0] : watch('registration_date'));
        setValue('owner_name', vehicleData.owner_name || watch('owner_name'));
        setValue('fuel_type', (vehicleData.fuel_type?.toLowerCase() as 'diesel' | 'petrol' | 'cng') || watch('fuel_type'));
        
        // Set additional VAHAN fields
        setValue('vehicle_class', vehicleData.vehicle_class || watch('vehicle_class'));
        setValue('color', vehicleData.color || watch('color'));
        setValue('seating_capacity', vehicleData.seating_capacity ? parseInt(vehicleData.seating_capacity) : watch('seating_capacity'));
        setValue('cubic_capacity', vehicleData.cubic_capacity ? parseFloat(vehicleData.cubic_capacity) : watch('cubic_capacity'));
        setValue('unladen_weight', vehicleData.unld_wt ? parseFloat(vehicleData.unld_wt) : watch('unladen_weight'));
        setValue('vahan_last_fetched_at', new Date().toISOString());
        
        toast.success('Vehicle details fetched successfully');
      } else {
        toast.warning('No vehicle details found');
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('service unavailable') || error.message.includes('Service Unavailable')) {
          toast.error('Vehicle details service is temporarily unavailable. Please try again later.');
        } else {
          toast.error(`Failed to fetch vehicle details: ${error.message}`);
        }
      } else {
        toast.error('Failed to fetch vehicle details');
      }
    }
  };

  const handleFormSubmit = (data: Vehicle) => {
    // Process file uploads
    const processedData = { ...data };
    
    // Process other documents to handle file uploads
    if (Array.isArray(processedData.other_documents)) {
      processedData.other_documents = processedData.other_documents.map(doc => {
        // If there's a file_obj property, move it to file
        if (doc.file_obj) {
          doc.file = doc.file_obj;
          delete doc.file_obj;
        }
        return doc;
      });
    }
    
    onSubmit(processedData);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Vehicle Number"
              placeholder="CG04NJ5907"
              error={errors.registration_number?.message}
              required
              {...register('registration_number', { required: 'Vehicle number is required' })}
            />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchVehicleDetails}
              >
                Get Details
              </Button>
            </div>
          </div>

          <Input
            label="Chassis Number"
            placeholder="17 characters"
            error={errors.chassis_number?.message}
            required
            {...register('chassis_number', { required: 'Chassis number is required' })}
          />

          <Input
            label="Engine Number"
            error={errors.engine_number?.message}
            required
            {...register('engine_number', { required: 'Engine number is required' })}
          />

          <Input
            label="Make"
            placeholder="Tata, Ashok Leyland, etc."
            error={errors.make?.message}
            required
            {...register('make', { required: 'Make is required' })}
          />

          <Input
            label="Model"
            placeholder="407, 1109, etc."
            error={errors.model?.message}
            required
            {...register('model', { required: 'Model is required' })}
          />

          <Controller
            control={control}
            name="year"
            rules={{ required: 'Year is required' }}
            render={({ field }) => (
              <Select
                label="Year"
                options={Array.from({ length: 30 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return { value: year.toString(), label: year.toString() };
                })}
                error={errors.year?.message}
                required
                {...field}
                value={field.value?.toString()}
                onChange={e => field.onChange(parseInt(e.target.value))}
              />
            )}
          />

          <Input
            label="Owner Name"
            placeholder="Enter owner's name"
            {...register('owner_name')}
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

          <Input
            label="Tyre Size"
            placeholder="e.g., 215/75 R15"
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            placeholder="6, 10, etc."
            {...register('number_of_tyres', { valueAsNumber: true })}
          />

          <Input
            label="Registration Date"
            type="date"
            {...register('registration_date')}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            {...register('rc_expiry_date')}
          />

          <Input
            label="Current Odometer"
            type="number"
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
                  { value: 'maintenance', label: 'Maintenance' },
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

        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="rc_copy_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload RC"
                buttonMode
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  if (file) handleRCUpload(file);
                }}
                accept=".jpg,.jpeg,.png,.pdf"
                icon={<Upload className="h-4 w-4" />}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Policy Number"
            placeholder="e.g., POL123456789"
            {...register('policy_number')}
          />

          <Input
            label="Insurer Name"
            placeholder="e.g., ICICI Lombard"
            {...register('insurer_name')}
          />

          <Input
            label="Insurance Start Date"
            type="date"
            {...register('insurance_start_date')}
          />

          <Input
            label="Insurance Expiry Date"
            type="date"
            {...register('insurance_expiry_date')}
          />

          <Input
            label="Premium Amount (₹)"
            type="number"
            placeholder="e.g., 25000"
            {...register('insurance_premium_amount', { valueAsNumber: true })}
          />

          <Input
            label="IDV Amount (₹)"
            type="number"
            placeholder="e.g., 500000"
            {...register('insurance_idv', { valueAsNumber: true })}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="insurance_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload Insurance"
                buttonMode
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  if (file) handleInsuranceUpload(file);
                }}
                accept=".jpg,.jpeg,.png,.pdf"
                icon={<Upload className="h-4 w-4" />}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <Checkbox
            label="Set Insurance Expiry Reminder"
            checked={remindInsurance}
            onChange={(e) => setValue('remind_insurance', e.target.checked)}
          />

          {remindInsurance && (
            <div className="mt-3 pl-6 border-l-2 border-gray-200 space-y-4">
              <Controller
                control={control}
                name="insurance_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: '', label: 'Default Contact' },
                      { value: 'contact1', label: 'John Doe (Fleet Manager)' },
                      { value: 'contact2', label: 'Jane Smith (Admin)' }
                    ]}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                {...register('insurance_reminder_days_before', { valueAsNumber: true })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Fitness Certificate Number"
            placeholder="e.g., FC123456789"
            {...register('fitness_certificate_number')}
          />

          <Input
            label="Fitness Issue Date"
            type="date"
            {...register('fitness_issue_date')}
          />

          <Input
            label="Fitness Expiry Date"
            type="date"
            {...register('fitness_expiry_date')}
          />

          <Input
            label="Fitness Cost (₹)"
            type="number"
            placeholder="e.g., 2000"
            {...register('fitness_cost', { valueAsNumber: true })}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="fitness_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload Fitness Certificate"
                buttonMode
                value={value as File | null}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                icon={<Upload className="h-4 w-4" />}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <Checkbox
            label="Set Fitness Expiry Reminder"
            checked={remindFitness}
            onChange={(e) => setValue('remind_fitness', e.target.checked)}
          />

          {remindFitness && (
            <div className="mt-3 pl-6 border-l-2 border-gray-200 space-y-4">
              <Controller
                control={control}
                name="fitness_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: '', label: 'Default Contact' },
                      { value: 'contact1', label: 'John Doe (Fleet Manager)' },
                      { value: 'contact2', label: 'Jane Smith (Admin)' }
                    ]}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                {...register('fitness_reminder_days_before', { valueAsNumber: true })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Tax Receipt Number"
            placeholder="e.g., TR123456789"
            {...register('tax_receipt_number')}
          />

          <Input
            label="Tax Amount (₹)"
            type="number"
            placeholder="e.g., 5000"
            {...register('tax_amount', { valueAsNumber: true })}
          />

          <Input
            label="Tax Scope"
            placeholder="e.g., State, National"
            {...register('tax_scope')}
          />

          <Input
            label="Tax Paid Up To"
            type="date"
            placeholder="e.g., 2025-03-31"
            {...register('tax_paid_upto')}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="tax_receipt_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload Tax Receipt"
                buttonMode
                value={value as File | null}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                icon={<Upload className="h-4 w-4" />}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <Checkbox
            label="Set Tax Expiry Reminder"
            checked={remindTax}
            onChange={(e) => setValue('remind_tax', e.target.checked)}
          />

          {remindTax && (
            <div className="mt-3 pl-6 border-l-2 border-gray-200 space-y-4">
              <Controller
                control={control}
                name="tax_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: '', label: 'Default Contact' },
                      { value: 'contact1', label: 'John Doe (Fleet Manager)' },
                      { value: 'contact2', label: 'Jane Smith (Admin)' }
                    ]}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                {...register('tax_reminder_days_before', { valueAsNumber: true })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Permit Number"
            placeholder="e.g., PER123456789"
            {...register('permit_number')}
          />

          <Input
            label="Issuing State"
            placeholder="e.g., Chhattisgarh"
            {...register('permit_issuing_state')}
          />

          <Input
            label="Permit Type"
            placeholder="e.g., National, State"
            {...register('permit_type')}
          />

          <Input
            label="Permit Issue Date"
            type="date"
            {...register('permit_issue_date')}
          />

          <Input
            label="Permit Expiry Date"
            type="date"
            {...register('permit_expiry_date')}
          />

          <Input
            label="Permit Cost (₹)"
            type="number"
            placeholder="e.g., 10000"
            {...register('permit_cost', { valueAsNumber: true })}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="permit_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload Permit"
                buttonMode
                value={value as File | null}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                icon={<Upload className="h-4 w-4" />}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <Checkbox
            label="Set Permit Expiry Reminder"
            checked={remindPermit}
            onChange={(e) => setValue('remind_permit', e.target.checked)}
          />

          {remindPermit && (
            <div className="mt-3 pl-6 border-l-2 border-gray-200 space-y-4">
              <Controller
                control={control}
                name="permit_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: '', label: 'Default Contact' },
                      { value: 'contact1', label: 'John Doe (Fleet Manager)' },
                      { value: 'contact2', label: 'Jane Smith (Admin)' }
                    ]}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 30"
                {...register('permit_reminder_days_before', { valueAsNumber: true })}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="PUC Certificate Number"
            placeholder="e.g., PUC123456789"
            {...register('puc_certificate_number')}
          />

          <Input
            label="PUC Issue Date"
            type="date"
            {...register('puc_issue_date')}
          />

          <Input
            label="PUC Expiry Date"
            type="date"
            {...register('puc_expiry_date')}
          />

          <Input
            label="PUC Cost (₹)"
            type="number"
            placeholder="e.g., 500"
            {...register('puc_cost', { valueAsNumber: true })}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="puc_document_file"
            render={({ field: { value, onChange, ...field } }) => (
              <FileUpload
                label="Upload PUC Certificate"
                buttonMode
                value={value as File | null}
                onChange={onChange}
                accept=".jpg,.jpeg,.png,.pdf"
                icon={<Upload className="h-4 w-4" />}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
          <Checkbox
            label="Set PUC Expiry Reminder"
            checked={remindPuc}
            onChange={(e) => setValue('remind_puc', e.target.checked)}
          />

          {remindPuc && (
            <div className="mt-3 pl-6 border-l-2 border-gray-200 space-y-4">
              <Controller
                control={control}
                name="puc_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: '', label: 'Default Contact' },
                      { value: 'contact1', label: 'John Doe (Fleet Manager)' },
                      { value: 'contact2', label: 'Jane Smith (Admin)' }
                    ]}
                    {...field}
                  />
                )}
              />

              <Input
                label="Days Before Expiry"
                type="number"
                placeholder="e.g., 15"
                {...register('puc_reminder_days_before', { valueAsNumber: true })}
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
        <div className="space-y-4">
          <Checkbox
            label="Enable Service Reminders"
            checked={remindService}
            onChange={(e) => setValue('remind_service', e.target.checked)}
          />

          {remindService && (
            <div className="pl-6 border-l-2 border-gray-200 space-y-4">
              <Controller
                control={control}
                name="service_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Notify Contact"
                    options={[
                      { value: '', label: 'Default Contact' },
                      { value: 'contact1', label: 'John Doe (Fleet Manager)' },
                      { value: 'contact2', label: 'Jane Smith (Admin)' }
                    ]}
                    {...field}
                  />
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Days Before Service"
                  type="number"
                  placeholder="e.g., 7"
                  {...register('service_reminder_days_before', { valueAsNumber: true })}
                />

                <Input
                  label="KM Before Service"
                  type="number"
                  placeholder="e.g., 500"
                  {...register('service_reminder_km', { valueAsNumber: true })}
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
        {/* VAHAN Data Summary */}
        {initialData && initialData.vahan_last_fetched_at && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div>
                <h4 className="text-blue-700 font-medium">VAHAN Data Summary</h4>
                <p className="text-blue-600 text-sm mt-1">
                  Last fetched: {new Date(initialData.vahan_last_fetched_at).toLocaleString()}
                </p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {initialData.vehicle_class && (
                    <div>
                      <span className="text-blue-700 font-medium">Vehicle Class:</span>{' '}
                      <span className="text-blue-600">{initialData.vehicle_class}</span>
                    </div>
                  )}
                  {initialData.financer && (
                    <div>
                      <span className="text-blue-700 font-medium">Financer:</span>{' '}
                      <span className="text-blue-600">{initialData.financer}</span>
                    </div>
                  )}
                  {initialData.cubic_capacity && (
                    <div>
                      <span className="text-blue-700 font-medium">Cubic Capacity:</span>{' '}
                      <span className="text-blue-600">{initialData.cubic_capacity} cc</span>
                    </div>
                  )}
                  {initialData.unladen_weight && (
                    <div>
                      <span className="text-blue-700 font-medium">Unladen Weight:</span>{' '}
                      <span className="text-blue-600">{initialData.unladen_weight} kg</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Information Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Input
            label="Financer"
            placeholder="e.g., HDFC Bank"
            {...register('financer')}
          />

          <Input
            label="Vehicle Class"
            placeholder="e.g., LMV"
            {...register('vehicle_class')}
          />

          <Input
            label="Color"
            placeholder="e.g., White"
            {...register('color')}
          />

          <Input
            label="Cubic Capacity"
            type="number"
            placeholder="e.g., 2500"
            {...register('cubic_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Cylinders"
            type="number"
            placeholder="e.g., 4"
            {...register('cylinders', { valueAsNumber: true })}
          />

          <Input
            label="Unladen Weight (kg)"
            type="number"
            placeholder="e.g., 3500"
            {...register('unladen_weight', { valueAsNumber: true })}
          />

          <Input
            label="Seating Capacity"
            type="number"
            placeholder="e.g., 2"
            {...register('seating_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Emission Norms"
            placeholder="e.g., BS6"
            {...register('emission_norms')}
          />
        </div>

        {/* Upload Related Documents */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Related Documents</h4>
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
                {...field}
              />
            )}
          />
        </div>

        {/* Other Documents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Document List</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', file: null })}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Document
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg bg-gray-50 relative">
              <button
                type="button"
                className="absolute top-2 right-2 text-gray-400 hover:text-error-500"
                onClick={() => remove(index)}
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Document Name"
                  placeholder="e.g., National Permit"
                  {...register(`other_documents.${index}.name` as const)}
                />

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
                  label="Document Cost (₹)"
                  type="number"
                  placeholder="e.g., 1000"
                  {...register(`other_documents.${index}.cost` as const, { valueAsNumber: true })}
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
                    {...field}
                  />
                )}
              />
            </div>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No documents added yet. Click "Add Document" to add one.</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {initialData ? 'Update Vehicle' : 'Save Vehicle'}
        </Button>
      </div>

      {/* RC Preview Modal */}
      {rcPreviewData && (
        <RCPreviewModal
          details={rcPreviewData}
          onConfirm={handleRCConfirm}
          onClose={() => setRcPreviewData(null)}
        />
      )}

      {/* Insurance Preview Modal */}
      {insurancePreviewData && (
        <InsurancePreviewModal
          details={insurancePreviewData}
          onConfirm={handleInsuranceConfirm}
          onClose={() => setInsurancePreviewData(null)}
        />
      )}
    </form>
  );
};

export default VehicleForm;