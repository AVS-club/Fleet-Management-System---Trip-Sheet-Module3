import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Bell, Clock, RefreshCw, User } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Checkbox from '../../ui/Checkbox';
import { ReminderTemplate, ReminderContact } from '@/types/reminders';
import { toast } from 'react-toastify';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('AddTemplateForm');

// Predefined reminder types with labels and internal values
const REMINDER_TYPE_OPTIONS = [
  { value: 'insurance', label: 'Insurance Expiry' },
  { value: 'fitness', label: 'Fitness Certificate' },
  { value: 'puc', label: 'Pollution Certificate (PUC)' },
  { value: 'tax', label: 'Tax Renewal' },
  { value: 'permit', label: 'Permit Renewal' },
  { value: 'service', label: 'Service Due' },
  { value: 'tire', label: 'Tire Change Reminder' },
  { value: 'battery', label: 'Battery Replacement' },
  { value: 'amc', label: 'Annual Maintenance Contract' },
  { value: 'speedgovernor', label: 'Speed Governor Calibration' },
  { value: 'fireextinguisher', label: 'Fire Extinguisher Recharge' },
  { value: 'firstaid', label: 'First Aid Kit Refill' },
  { value: 'ais140', label: 'AIS 140 Device Reverification' },
  { value: 'warranty', label: 'Spare Parts Warranty Expiry' },
  { value: 'documents', label: 'Document Upload Check' },
  { value: 'custom', label: 'Custom' }
];

interface AddTemplateFormProps {
  contacts: ReminderContact[];
  onSubmit: (template: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const AddTemplateForm: React.FC<AddTemplateFormProps> = ({ contacts, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReminderType, setSelectedReminderType] = useState('');
  const [customReminderType, setCustomReminderType] = useState('');
  
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
      
      // Use custom type if 'custom' is selected, otherwise use the predefined type
      const finalReminderType = selectedReminderType === 'custom' ? customReminderType : selectedReminderType;
      
      if (!finalReminderType) {
        toast.error('Please select or enter a reminder type');
        return;
      }
      
      const submitData = {
        ...data,
        reminder_type: finalReminderType
      };
      
      await onSubmit(submitData);
      reset();
      setSelectedReminderType('');
      setCustomReminderType('');
      toast.success('Reminder template added successfully');
    } catch (error) {
      toast.error('Failed to add reminder template');
      logger.error('Error adding template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get contact display name with preferred contact mode
  const getContactDisplayName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return 'Unknown Contact';
    
    const modeText = contact.preferred_contact_mode === 'Both' ? 'SMS+Email' : contact.preferred_contact_mode;
    return `${contact.full_name} (${modeText})`;
  };
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Reminder Template</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Reminder Type"
            options={REMINDER_TYPE_OPTIONS.map(option => ({
              value: option.value,
              label: option.label
            }))}
            value={selectedReminderType}
            onChange={(e) => setSelectedReminderType(e.target.value)}
            required
          />
          
          {selectedReminderType === 'custom' && (
            <div className="mt-2">
              <Input
                placeholder="Enter custom reminder type"
                value={customReminderType}
                onChange={(e) => setCustomReminderType(e.target.value)}
                required
              />
            </div>
          )}
        </div>
        
        <Input
          label="Days Before"
          type="number"
          icon={<Clock className="h-4 w-4" />}
          helperText="Number of days before expiry to send the first alert"
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
              helperText="Sends the same reminder again if not marked acknowledged in 24h"
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
                    label: `${contact.full_name} (${contact.preferred_contact_mode === 'Both' ? 'SMS+Email' : contact.preferred_contact_mode})`
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