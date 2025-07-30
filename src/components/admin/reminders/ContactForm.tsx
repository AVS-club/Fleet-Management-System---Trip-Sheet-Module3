import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { X, User, Briefcase, Phone, Mail, Upload } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Checkbox from '../../ui/Checkbox';
import { ReminderContactFormData, ReminderContactMode, ReminderAssignedType } from '../../../types/reminders';
import { toast } from 'react-toastify';

interface ContactFormProps {
  initialData?: Partial<ReminderContactFormData>;
  onSubmit: (data: ReminderContactFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ContactForm: React.FC<ContactFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<ReminderContactFormData>({
    defaultValues: {
      full_name: '',
      position: '',
      duty: '',
      phone_number: '',
      email: '',
      preferred_contact_mode: ReminderContactMode.SMS,
      is_active: true,
      assigned_types: [],
      is_global: false, // Default value for is_global
      ...initialData
    }
  });

  const isGlobal = watch('is_global');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: ReminderContactFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      toast.error('Failed to save contact');
      console.error('Error saving contact:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {initialData?.full_name ? 'Edit Contact' : 'Add New Contact'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : initialData?.photo ? (
                  <img src={URL.createObjectURL(initialData.photo)} alt="Contact" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center cursor-pointer"
              >
                <Upload className="h-4 w-4 text-white" />
                <Controller
                  control={control}
                  name="photo"
                  render={({ field: { onChange } }) => (
                    <input
                      id="photo-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        onChange(file);
                        handlePhotoChange(e);
                      }}
                    />
                  )}
                />
              </label>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              Upload a photo of the contact person. This helps identify them quickly.
            </p>
          </div>
        </div>

        <Input
          label="Full Name"
          icon={<User className="h-4 w-4" />}
          error={errors.full_name?.message}
          required
          {...register('full_name', { required: 'Full name is required' })}
        />

        <Input
          label="Position"
          icon={<Briefcase className="h-4 w-4" />}
          error={errors.position?.message}
          required
          {...register('position', { required: 'Position is required' })}
        />

        <Input
          label="Phone Number"
          icon={<Phone className="h-4 w-4" />}
          error={errors.phone_number?.message}
          required
          {...register('phone_number', { 
            required: 'Phone number is required',
            pattern: {
              value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
              message: 'Please enter a valid phone number'
            }
          })}
        />

        <Input
          label="Email"
          type="email"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email', {
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address'
            }
          })}
        />

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duty/Responsibility
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            {...register('duty')}
          />
        </div>

        <Controller
          control={control}
          name="preferred_contact_mode"
          render={({ field }) => (
            <Select
              label="Preferred Contact Mode"
              options={[
                { value: ReminderContactMode.SMS, label: 'SMS' },
                { value: ReminderContactMode.Email, label: 'Email' },
                { value: ReminderContactMode.Both, label: 'Both SMS & Email' }
              ]}
              error={errors.preferred_contact_mode?.message}
              required
              {...field}
            />
          )}
        />

        <Controller
          control={control}
          name="is_active"
          render={({ field: { value, onChange } }) => (
            <Checkbox
              label="Active Contact"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              helperText="Inactive contacts won't receive reminders"
            />
          )}
        />

        <div className="md:col-span-2">
          <Controller
            control={control}
            name="is_global"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Global Contact (Receives all reminders regardless of category)"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="mb-4"
              />
            )}
          />

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assigned Reminder Types
            {isGlobal && <span className="text-xs text-gray-500 ml-2">(Optional when Global Contact is enabled)</span>}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.values(ReminderAssignedType).map((type) => (
              <Controller
                key={type}
                control={control}
                name="assigned_types"
                render={({ field }) => (
                  <Checkbox
                    label={type}
                    checked={field.value?.includes(type)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const updatedTypes = checked
                        ? [...(field.value || []), type]
                        : (field.value || []).filter(t => t !== type);
                      field.onChange(updatedTypes);
                    }}
                  />
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {initialData?.full_name ? 'Update Contact' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
};

export default ContactForm;