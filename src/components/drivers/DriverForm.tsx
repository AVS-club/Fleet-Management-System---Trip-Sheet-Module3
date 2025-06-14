import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Driver, Vehicle } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import { User, Phone, Mail, Calendar, FileText, IdCard, Truck, Upload } from 'lucide-react';
import { getVehicles } from '../../utils/storage';

interface DriverFormProps {
  initialData?: Partial<Driver>;
  onSubmit: (data: Omit<Driver, 'id'>, documents: { 
    photo?: File;
    license?: File;
    aadhar?: File;
    police?: File;
    bank?: File;
  }) => void;
  isSubmitting?: boolean;
}

const DriverForm: React.FC<DriverFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [policeFile, setPoliceFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm<Omit<Driver, 'id'>>({
    defaultValues: {
      status: 'active',
      ...initialData
    }
  });

  // Load vehicles for the dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehicleData = await getVehicles();
        setVehicles(vehicleData || []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    fetchVehicles();
  }, []);

  const handleFormSubmit = (data: Omit<Driver, 'id'>) => {
    // Collect document files
    const documents = {
      photo: photoFile,
      license: licenseFile,
      aadhar: aadharFile,
      police: policeFile,
      bank: bankFile
    };
    
    onSubmit(data, documents);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <Input
          label="Full Name"
          icon={<User className="h-4 w-4" />}
          error={errors.name?.message}
          required
          {...register('name', { required: 'Full name is required' })}
        />

        <Input
          label="Contact Number"
          icon={<Phone className="h-4 w-4" />}
          error={errors.contact_number?.message}
          required
          {...register('contact_number', { 
            required: 'Contact number is required',
            pattern: {
              value: /^[0-9]{10}$/,
              message: 'Please enter a valid 10-digit phone number'
            }
          })}
        />

        <Input
          label="License Number"
          icon={<IdCard className="h-4 w-4" />}
          error={errors.license_number?.message}
          required
          {...register('license_number', { 
            required: 'License number is required',
            setValueAs: (value) => value?.toUpperCase()
          })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="License Expiry Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.license_expiry_date?.message}
            required
            {...register('license_expiry_date', { required: 'License expiry date is required' })}
          />

          <Input
            label="Experience (Years)"
            type="number"
            error={errors.experience_years?.message}
            required
            {...register('experience_years', {
              required: 'Experience is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Experience must be positive' }
            })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Join Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.join_date?.message}
            required
            {...register('join_date', { required: 'Join date is required' })}
          />

          <Input
            label="Email"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email', { 
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: 'Please enter a valid email'
              },
              setValueAs: (value) => value?.toLowerCase()
            })}
          />
        </div>

        <Controller
          control={control}
          name="primary_vehicle_id"
          render={({ field }) => (
            <Select
              label="Assigned Vehicle"
              options={[
                { value: '', label: 'No Vehicle Assigned' },
                ...vehicles.map(v => ({
                  value: v.id,
                  label: `${v.registration_number} - ${v.make} ${v.model}`
                }))
              ]}
              error={errors.primary_vehicle_id?.message}
              icon={<Truck className="h-4 w-4" />}
              {...field}
            />
          )}
        />
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Documents
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            label="Driver Photo"
            accept=".jpg,.jpeg,.png"
            value={photoFile}
            onChange={setPhotoFile}
            icon={<User className="h-4 w-4" />}
            helperText="Upload a clear photo of the driver"
          />

          <FileUpload
            label="License Document"
            accept=".jpg,.jpeg,.png,.pdf"
            value={licenseFile}
            onChange={setLicenseFile}
            required
            icon={<IdCard className="h-4 w-4" />}
            helperText="Upload front and back of license (required)"
          />

          <FileUpload
            label="Aadhar Card"
            accept=".jpg,.jpeg,.png,.pdf"
            value={aadharFile}
            onChange={setAadharFile}
            icon={<IdCard className="h-4 w-4" />}
            helperText="Upload Aadhar card (optional)"
          />

          <FileUpload
            label="Police Verification"
            accept=".jpg,.jpeg,.png,.pdf"
            value={policeFile}
            onChange={setPoliceFile}
            icon={<FileText className="h-4 w-4" />}
            helperText="Upload police verification (optional)"
          />

          <FileUpload
            label="Bank Document"
            accept=".jpg,.jpeg,.png,.pdf"
            value={bankFile}
            onChange={setBankFile}
            icon={<FileText className="h-4 w-4" />}
            helperText="Upload bank passbook/cancelled cheque (optional)"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          isLoading={isSubmitting}
          icon={<Upload className="h-4 w-4" />}
        >
          {initialData ? 'Update Driver' : 'Add Driver'}
        </Button>
      </div>
    </form>
  );
};

export default DriverForm;