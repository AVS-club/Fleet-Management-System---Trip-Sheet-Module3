import React from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, Clock } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

interface DestinationFormData {
  name: string;
  latitude: number;
  longitude: number;
  standardDistance: number;
  estimatedTime: string;
  state: 'chhattisgarh' | 'odisha';
  type: 'district' | 'city' | 'village';
  active?: boolean;
}

interface DestinationFormProps {
  initialData?: Partial<DestinationFormData>;
  onSubmit: (data: DestinationFormData) => void;
  onCancel: () => void;
}

const DestinationForm: React.FC<DestinationFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<DestinationFormData>({
    defaultValues: initialData
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-gray-50 rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Destination Name"
          icon={<MapPin className="h-4 w-4" />}
          error={errors.name?.message}
          {...register('name', { required: 'Destination name is required' })}
        />

        <Select
          label="State"
          options={[
            { value: 'chhattisgarh', label: 'Chhattisgarh' },
            { value: 'odisha', label: 'Odisha' }
          ]}
          error={errors.state?.message}
          {...register('state', { required: 'State is required' })}
        />

        <Select
          label="Type"
          options={[
            { value: 'district', label: 'District' },
            { value: 'city', label: 'City' },
            { value: 'village', label: 'Village' }
          ]}
          error={errors.type?.message}
          {...register('type', { required: 'Type is required' })}
        />

        <Input
          label="Standard Distance (km)"
          type="number"
          min="0"
          error={errors.standardDistance?.message}
          {...register('standardDistance', {
            required: 'Standard distance is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Distance must be positive' }
          })}
        />

        <Input
          label="Estimated Time"
          icon={<Clock className="h-4 w-4" />}
          placeholder="e.g., 2h 30m"
          error={errors.estimatedTime?.message}
          {...register('estimatedTime', {
            required: 'Estimated time is required',
            pattern: {
              value: /^\d+h(?:\s+\d+m)?$/,
              message: 'Use format: 2h 30m'
            }
          })}
        />

        <Input
          label="Latitude"
          type="number"
          step="any"
          icon={<MapPin className="h-4 w-4" />}
          error={errors.latitude?.message}
          {...register('latitude', {
            required: 'Latitude is required',
            valueAsNumber: true,
            min: { value: -90, message: 'Invalid latitude' },
            max: { value: 90, message: 'Invalid latitude' }
          })}
        />

        <Input
          label="Longitude"
          type="number"
          step="any"
          icon={<MapPin className="h-4 w-4" />}
          error={errors.longitude?.message}
          {...register('longitude', {
            required: 'Longitude is required',
            valueAsNumber: true,
            min: { value: -180, message: 'Invalid longitude' },
            max: { value: 180, message: 'Invalid longitude' }
          })}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Destination' : 'Add Destination'}
        </Button>
      </div>
    </form>
  );
};

export default DestinationForm;