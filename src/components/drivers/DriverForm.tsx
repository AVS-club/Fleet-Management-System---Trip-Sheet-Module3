import React from 'react';
import { useForm } from 'react-hook-form';
import { Driver } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import { User, Phone, Mail, Calendar, FileText } from 'lucide-react';

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
  const { register, handleSubmit, formState: { errors } } = useForm<Omit<Driver, 'id'>>({
    defaultValues: {
      status: 'active',
      ...initialData
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          error={errors.licenseNumber?.message}
          required
          {...register('licenseNumber', { required: 'License number is required' })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Contact Number"
            icon={<Phone className="h-4 w-4" />}
            error={errors.contactNumber?.message}
            required
            {...register('contactNumber', { required: 'Contact number is required' })}
          />

          <Input
            label="Email"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            required
            {...register('email', { required: 'Email is required' })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Join Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.joinDate?.message}
            required
            {...register('joinDate', { required: 'Join date is required' })}
          />

          <Input
            label="Experience (Years)"
            type="number"
            error={errors.experience?.message}
            required
            {...register('experience', {
              required: 'Experience is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Experience must be positive' }
            })}
          />
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>

        <FileUpload
          label="Driver Photo"
          accept=".jpg,.jpeg,.png"
          {...register('photo')}
        />

        <FileUpload
          label="License Document"
          accept=".jpg,.jpeg,.png,.pdf"
          {...register('licenseDocument')}
        />

        <Input
          label="License Expiry Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          error={errors.licenseExpiryDate?.message}
          required
          {...register('licenseExpiryDate', { required: 'License expiry date is required' })}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {initialData ? 'Update Driver' : 'Add Driver'}
        </Button>
      </div>
    </form>
  );
};

export default DriverForm;