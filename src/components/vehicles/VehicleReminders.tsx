import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Vehicle } from '../../types';
import { Bell, Calendar, AlertTriangle } from 'lucide-react';
import Switch from '../ui/Switch';
import Input from '../ui/Input';

const VehicleReminders: React.FC = () => {
  const { register, formState: { errors }, watch } = useFormContext<Vehicle>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Reminder Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insurance Reminders */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">Insurance</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable reminders</span>
            <Switch
              {...register('remind_insurance')}
              checked={watch('remind_insurance')}
            />
          </div>
          
          <Input
            label="Reminder days before expiry"
            type="number"
            {...register('insurance_reminder_days', { 
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 90, message: 'Cannot be more than 90 days' }
            })}
            error={errors.insurance_reminder_days?.message}
            placeholder="30"
          />
        </div>

        {/* Fitness Reminders */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Fitness Certificate</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable reminders</span>
            <Switch
              {...register('remind_fitness')}
              checked={watch('remind_fitness')}
            />
          </div>
          
          <Input
            label="Reminder days before expiry"
            type="number"
            {...register('fitness_reminder_days', { 
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 90, message: 'Cannot be more than 90 days' }
            })}
            error={errors.fitness_reminder_days?.message}
            placeholder="30"
          />
        </div>

        {/* PUC Reminders */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h4 className="font-medium text-gray-900">PUC Certificate</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable reminders</span>
            <Switch
              {...register('remind_puc')}
              checked={watch('remind_puc')}
            />
          </div>
          
          <Input
            label="Reminder days before expiry"
            type="number"
            {...register('puc_reminder_days', { 
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 90, message: 'Cannot be more than 90 days' }
            })}
            error={errors.puc_reminder_days?.message}
            placeholder="15"
          />
        </div>

        {/* Tax Reminders */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <h4 className="font-medium text-gray-900">Tax Certificate</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable reminders</span>
            <Switch
              {...register('remind_tax')}
              checked={watch('remind_tax')}
            />
          </div>
          
          <Input
            label="Reminder days before expiry"
            type="number"
            {...register('tax_reminder_days', { 
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 90, message: 'Cannot be more than 90 days' }
            })}
            error={errors.tax_reminder_days?.message}
            placeholder="30"
          />
        </div>

        {/* Permit Reminders */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <h4 className="font-medium text-gray-900">Permit</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable reminders</span>
            <Switch
              {...register('remind_permit')}
              checked={watch('remind_permit')}
            />
          </div>
          
          <Input
            label="Reminder days before expiry"
            type="number"
            {...register('permit_reminder_days', { 
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 90, message: 'Cannot be more than 90 days' }
            })}
            error={errors.permit_reminder_days?.message}
            placeholder="30"
          />
        </div>

        {/* Service Reminders */}
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-600" />
            <h4 className="font-medium text-gray-900">Service</h4>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Enable reminders</span>
            <Switch
              {...register('remind_service')}
              checked={watch('remind_service')}
            />
          </div>
          
          <Input
            label="Service interval (km)"
            type="number"
            {...register('service_interval_km', { 
              min: { value: 1000, message: 'Must be at least 1000 km' },
              max: { value: 50000, message: 'Cannot be more than 50000 km' }
            })}
            error={errors.service_interval_km?.message}
            placeholder="10000"
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleReminders;
