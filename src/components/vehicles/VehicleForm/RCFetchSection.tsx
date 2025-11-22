/**
 * RCFetchSection - Fetch vehicle details from RC
 *
 * Handles:
 * - Registration number input
 * - Fetch button to auto-populate vehicle details from RC database
 * - Status indicators (fetching, success, error)
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Vehicle } from '@/types';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Truck, CheckCircle, AlertTriangle } from 'lucide-react';

interface RCFetchSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  onFetchRC: () => Promise<void>;
  isFetching: boolean;
  fetchStatus: 'idle' | 'fetching' | 'success' | 'error';
  disabled?: boolean;
}

export const RCFetchSection: React.FC<RCFetchSectionProps> = ({
  formMethods,
  onFetchRC,
  isFetching,
  fetchStatus,
  disabled = false
}) => {
  const { register, watch, formState: { errors } } = formMethods;
  const registrationNumber = watch('registration_number');

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <p className="text-sm text-gray-700 font-medium mb-3">
        Fetch Vehicle Info from RC Details
      </p>

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Registration Number Input */}
        <div className="w-full md:w-3/5">
          <Input
            label="Registration Number"
            placeholder="CG04AB1234"
            icon={<Truck className="h-4 w-4" />}
            hideIconWhenFocused={true}
            error={errors.registration_number?.message}
            required
            disabled={isFetching || disabled}
            {...register('registration_number', {
              required: 'Registration number is required',
              pattern: {
                value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{1,4}$/i,
                message: 'Invalid registration number format (e.g., CG04AB1234)'
              }
            })}
          />
        </div>

        {/* Fetch Button */}
        <div className="w-full md:w-2/5 pt-2">
          <Button
            type="button"
            disabled={isFetching || disabled || !registrationNumber}
            isLoading={isFetching}
            className="w-full"
            onClick={onFetchRC}
          >
            {isFetching ? 'Fetching...' : 'Fetch RC Details'}
          </Button>

          {/* Success Indicator */}
          {fetchStatus === 'success' && (
            <div className="text-center mt-1">
              <span className="text-xs text-green-600 flex items-center justify-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Details fetched successfully!
              </span>
            </div>
          )}

          {/* Error Indicator */}
          {fetchStatus === 'error' && (
            <div className="text-center mt-1">
              <span className="text-xs text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Could not fetch details
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Auto-fill vehicle make, model, and other details by fetching RC information
      </p>
    </div>
  );
};
