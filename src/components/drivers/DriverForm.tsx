import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Driver } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import { User, Phone, Mail, Calendar, FileText, Upload } from 'lucide-react';

interface DriverFormProps {
  initialData?: Partial<Driver>;
  onSubmit: (data: Omit<Driver, 'id'>) => void;
  isSubmitting?: boolean;
}

const DriverForm: React.FC<DriverFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.driver_photo_url || null
  );

  const { register, handleSubmit, control, formState: { errors } } = useForm<Omit<Driver, 'id'>>({
    defaultValues: {
      status: 'active',
      ...initialData
    }
  });

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Driver Photo */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Driver" 
                className="h-full w-full object-cover" 
              />
            ) : (
              <User className="h-16 w-16 text-gray-400" />
            )}
          </div>
          <Controller
            control={control}
            name="photo"
            render={({ field: { onChange, value, ...field } }) => (
              <div className="absolute bottom-0 right-0">
                <label 
                  htmlFor="photo-upload" 
                  className="cursor-pointer bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors"
                >
                  <Upload className="h-4 w-4" />
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
                    {...field}
                  />
                </label>
              </div>
            )}
          />
        </div>
      </div>

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
          label="License Number"
          icon={<FileText className="h-4 w-4" />}
          error={errors.license_number?.message}
          required
          {...register('license_number', { required: 'License number is required' })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Contact Number"
            icon={<Phone className="h-4 w-4" />}
            error={errors.contact_number?.message}
            required
            {...register('contact_number', { required: 'Contact number is required' })}
          />

          <Input
            label="Email"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
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

        <Controller
          control={control}
          name="status"
          rules={{ required: 'Status is required' }}
          render={({ field }) => (
            <Select
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'onLeave', label: 'On Leave' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'blacklisted', label: 'Blacklisted' }
              ]}
              error={errors.status?.message}
              required
              {...field}
            />
          )}
        />
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>

        <Controller
          control={control}
          name="license_document"
          render={({ field: { value, onChange, ...field } }) => (
            <FileUpload
              label="License Document"
              accept=".jpg,.jpeg,.png,.pdf"
              value={value as File | null}
              onChange={onChange}
              {...field}
            />
          )}
        />

        <Input
          label="License Expiry Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          error={errors.license_expiry_date?.message}
          required
          {...register('license_expiry_date', { required: 'License expiry date is required' })}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {initialData?.id ? 'Update Driver' : 'Add Driver'}
        </Button>
      </div>
    </form>
  );
};

export default DriverForm;