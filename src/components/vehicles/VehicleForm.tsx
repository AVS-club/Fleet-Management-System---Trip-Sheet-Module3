import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Vehicle, RCDetails, InsuranceDetails } from '../../types';
import { processRCDocument, extractRCDetails } from '../../utils/ocrService';
import { processInsuranceDocument, extractInsuranceDetails } from '../../utils/insuranceParser';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import RCPreviewModal from './RCPreviewModal';
import InsurancePreviewModal from './InsurancePreviewModal';
import { Truck, Calendar, FileText, Upload } from 'lucide-react';

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Omit<Vehicle, 'id'>) => void;
  isSubmitting?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false
}) => {
  const [rcFile, setRCFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [fitnessFile, setFitnessFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [pucFile, setPUCFile] = useState<File | null>(null);
  const [rcPreviewData, setRCPreviewData] = useState<RCDetails[] | null>(null);
  const [insurancePreviewData, setInsurancePreviewData] = useState<InsuranceDetails[] | null>(null);
  const [rcImageUrl, setRCImageUrl] = useState<string>();
  const [insuranceImageUrl, setInsuranceImageUrl] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<Omit<Vehicle, 'id'>>({
    defaultValues: {
      status: 'active',
      fuelType: 'diesel',
      type: 'truck',
      currentOdometer: 0,
      ...initialData
    }
  });

  const handleRCUpload = async (file: File | null) => {
    setRCFile(file);
    setProcessingError(null);
    if (!file) {
      setRCPreviewData(null);
      setRCImageUrl(undefined);
      return;
    }

    try {
      setIsProcessing(true);
      setRCImageUrl(URL.createObjectURL(file));
      
      const text = await processRCDocument(file);
      const details = extractRCDetails(text);
      
      setRCPreviewData(details);
    } catch (error) {
      console.error('Error processing RC:', error);
      setProcessingError(error instanceof Error ? error.message : 'Failed to process RC document');
      setRCPreviewData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInsuranceUpload = async (file: File | null) => {
    setInsuranceFile(file);
    setProcessingError(null);
    if (!file) {
      setInsurancePreviewData(null);
      setInsuranceImageUrl(undefined);
      return;
    }

    try {
      setIsProcessing(true);
      setInsuranceImageUrl(URL.createObjectURL(file));
      
      const details = await processInsuranceDocument(file);
      setInsurancePreviewData([details]);
    } catch (error) {
      console.error('Error processing Insurance:', error);
      setProcessingError(error instanceof Error ? error.message : 'Failed to process insurance document');
      setInsurancePreviewData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRCDetailsConfirm = (details: RCDetails) => {
    setValue('registrationNumber', details.registrationNumber || '');
    setValue('chassisNumber', details.chassisNumber || '');
    setValue('engineNumber', details.engineNumber || '');
    setValue('make', details.make || '');
    setValue('model', details.model || '');
    setValue('year', parseInt(details.manufactureDate?.split('/')[0] || '0') || undefined);
    
    setRCPreviewData(null);
  };

  const handleInsuranceDetailsConfirm = (details: InsuranceDetails) => {
    if (details.validUntil) {
      setValue('insuranceEndDate', details.validUntil);
    }
    setInsurancePreviewData(null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {processingError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative\" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{processingError}</span>
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Registration Number"
            error={errors.registrationNumber?.message}
            required
            {...register('registrationNumber', { required: 'Registration number is required' })}
          />

          <Input
            label="Chassis Number"
            error={errors.chassisNumber?.message}
            required
            {...register('chassisNumber', { required: 'Chassis number is required' })}
          />

          <Input
            label="Engine Number"
            error={errors.engineNumber?.message}
            required
            {...register('engineNumber', { required: 'Engine number is required' })}
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
            error={errors.year?.message}
            required
            {...register('year', {
              required: 'Year is required',
              valueAsNumber: true,
              min: { value: 1900, message: 'Invalid year' },
              max: { value: new Date().getFullYear(), message: 'Invalid year' }
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
            name="fuelType"
            rules={{ required: 'Fuel type is required' }}
            render={({ field }) => (
              <Select
                label="Fuel Type"
                options={[
                  { value: 'diesel', label: 'Diesel' },
                  { value: 'petrol', label: 'Petrol' },
                  { value: 'cng', label: 'CNG' }
                ]}
                error={errors.fuelType?.message}
                required
                {...field}
              />
            )}
          />

          <Input
            label="Current Odometer"
            type="number"
            error={errors.currentOdometer?.message}
            required
            {...register('currentOdometer', {
              required: 'Current odometer reading is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Odometer reading must be positive' }
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
                  { value: 'inactive', label: 'Inactive' }
                ]}
                error={errors.status?.message}
                required
                {...field}
              />
            )}
          />
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Documents
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FileUpload
              label="RC Copy"
              accept=".jpg,.jpeg,.png,.pdf"
              value={rcFile}
              onChange={handleRCUpload}
              icon={<Upload className="h-4 w-4" />}
              error={errors.rcCopy?.message}
            />
            {isProcessing && (
              <p className="mt-2 text-sm text-primary-600">
                Processing RC document...
              </p>
            )}
          </div>

          <FileUpload
            label="Insurance Document"
            accept=".jpg,.jpeg,.png,.pdf"
            value={insuranceFile}
            onChange={handleInsuranceUpload}
            icon={<Upload className="h-4 w-4" />}
            error={errors.insuranceDocument?.message}
          />

          <FileUpload
            label="Fitness Certificate"
            accept=".jpg,.jpeg,.png,.pdf"
            value={fitnessFile}
            onChange={setFitnessFile}
            icon={<Upload className="h-4 w-4" />}
            error={errors.fitnessDocument?.message}
          />

          <FileUpload
            label="Permit Document"
            accept=".jpg,.jpeg,.png,.pdf"
            value={permitFile}
            onChange={setPermitFile}
            icon={<Upload className="h-4 w-4" />}
            error={errors.permitDocument?.message}
          />

          <FileUpload
            label="PUC Certificate"
            accept=".jpg,.jpeg,.png,.pdf"
            value={pucFile}
            onChange={setPUCFile}
            icon={<Upload className="h-4 w-4" />}
            error={errors.pucDocument?.message}
          />
        </div>
      </div>

      {/* Document Expiry Dates */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary-500" />
          Document Validity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Insurance Expiry Date"
            type="date"
            error={errors.insuranceEndDate?.message}
            {...register('insuranceEndDate')}
          />

          <Input
            label="Fitness Expiry Date"
            type="date"
            error={errors.fitnessExpiryDate?.message}
            {...register('fitnessExpiryDate')}
          />

          <Input
            label="Permit Expiry Date"
            type="date"
            error={errors.permitExpiryDate?.message}
            {...register('permitExpiryDate')}
          />

          <Input
            label="PUC Expiry Date"
            type="date"
            error={errors.pucExpiryDate?.message}
            {...register('pucExpiryDate')}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {initialData ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>

      {/* RC Preview Modal */}
      {rcPreviewData && (
        <RCPreviewModal
          details={rcPreviewData}
          imageUrl={rcImageUrl}
          onConfirm={handleRCDetailsConfirm}
          onClose={() => setRCPreviewData(null)}
        />
      )}

      {/* Insurance Preview Modal */}
      {insurancePreviewData && (
        <InsurancePreviewModal
          details={insurancePreviewData[0]}
          imageUrl={insuranceImageUrl}
          onConfirm={handleInsuranceDetailsConfirm}
          onClose={() => setInsurancePreviewData(null)}
        />
      )}
    </form>
  );
};

export default VehicleForm;