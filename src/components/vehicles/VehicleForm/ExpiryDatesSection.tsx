/**
 * ExpiryDatesSection - Document expiry dates
 *
 * Handles:
 * - Insurance expiry
 * - Fitness certificate expiry
 * - Permit expiry
 * - PUC expiry
 * - Tax expiry
 * - Registration date
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Vehicle } from '@/types';
import Input from '../../ui/Input';
import { Calendar, Shield, FileText } from 'lucide-react';

interface ExpiryDatesSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  disabled?: boolean;
}

// Helper function to get max date (10 years from today)
const getMaxDate = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() + 10);
  return today.toISOString().split('T')[0];
};

export const ExpiryDatesSection: React.FC<ExpiryDatesSectionProps> = ({
  formMethods,
  disabled = false
}) => {
  const { register, formState: { errors } } = formMethods;
  const maxDate = getMaxDate();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Calendar className="h-5 w-5 mr-2" />
        Important Dates & Expiry
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Registration Date */}
        <Input
          label="Registration Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          error={errors.registration_date?.message}
          max={new Date().toISOString().split('T')[0]}
          disabled={disabled}
          {...register('registration_date')}
        />

        {/* Insurance Expiry */}
        <Input
          label="Insurance Expiry Date"
          type="date"
          icon={<Shield className="h-4 w-4" />}
          error={errors.insurance_expiry_date?.message}
          max={maxDate}
          disabled={disabled}
          {...register('insurance_expiry_date')}
        />

        {/* Fitness Expiry */}
        <Input
          label="Fitness Certificate Expiry"
          type="date"
          icon={<FileText className="h-4 w-4" />}
          error={errors.fitness_expiry_date?.message}
          max={maxDate}
          disabled={disabled}
          {...register('fitness_expiry_date')}
        />

        {/* Permit Expiry */}
        <Input
          label="Permit Expiry Date"
          type="date"
          icon={<FileText className="h-4 w-4" />}
          error={errors.permit_expiry_date?.message}
          max={maxDate}
          disabled={disabled}
          {...register('permit_expiry_date')}
        />

        {/* PUC Expiry */}
        <Input
          label="PUC (Pollution) Expiry Date"
          type="date"
          icon={<FileText className="h-4 w-4" />}
          error={errors.pollution_expiry_date?.message}
          max={maxDate}
          disabled={disabled}
          {...register('pollution_expiry_date')}
        />

        {/* Tax Expiry */}
        <Input
          label="Road Tax Expiry Date"
          type="date"
          icon={<FileText className="h-4 w-4" />}
          error={errors.tax_expiry_date?.message}
          max={maxDate}
          disabled={disabled}
          {...register('tax_expiry_date')}
        />
      </div>
    </div>
  );
};
