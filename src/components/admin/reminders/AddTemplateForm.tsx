import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Bell, Clock, RefreshCw, User } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Checkbox from '../../ui/Checkbox';
import { ReminderTemplate, ReminderContact } from '../../../types/reminders';
import { toast } from 'react-toastify';

interface AddTemplateFormProps {
  contacts: ReminderContact[];
  onSubmit: (template: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const AddTemplateForm: React.FC<AddTemplateFormProps> = ({ contacts, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>>({
    defaultValues: {
      reminder_type: '',
      default_days_before: 14,
      repeat: false,
      default_contact_id: undefined
    }
  });

  const handleFormSubmit = async (data: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      reset();
      toast.success('Reminder template added successfully');
    } catch (error) {
      toast.error('Failed to add reminder template');
      console.error('Error adding template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Reminder Template</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Reminder Type"
          icon={<Bell className="h-4 w-4" />}
          error={errors.reminder_type?.message}
          required
          placeholder="e.g., Insurance Expiry"
          {...register('reminder_type', { required: 'Reminder type is required' })}
        />
        
        <Input
          label="Days Before"
          type="number"
          icon={<Clock className="h-4 w-4" />}
          error={errors.default_days_before?.message}
          required
          min={1}
          max={365}
          {...register('default_days_before', { 
            required: 'Days before is required',
            valueAsNumber: true,
            min: { value: 1, message: 'Must be at least 1 day' },
            max: { value: 365, message: 'Cannot exceed 365 days' }
          })}
        />
        
        <Controller
          control={control}
          name="repeat"
          render={({ field: { value, onChange } }) => (
            <Checkbox
              label="Repeat Reminder"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              helperText="Send again if not acknowledged"
              icon={<RefreshCw className="h-4 w-4" />}
            />
          )}
        />
        
        <Controller
          control={control}
          name="default_contact_id"
          render={({ field }) => (
            <Select
              label="Default Contact"
              icon={<User className="h-4 w-4" />}
              options={[
                { value: '', label: 'None' },
                ...contacts
                  .filter(contact => contact.is_active)
                  .map(contact => ({
                    value: contact.id,
                    label: `${contact.full_name}${contact.is_global ? ' (Global Receiver)' : ''}`
                  }))
              ]}
              {...field}
            />
          )}
        />
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          Add Template
        </Button>
      </div>
    </form>
  );
};

export default AddTemplateForm;