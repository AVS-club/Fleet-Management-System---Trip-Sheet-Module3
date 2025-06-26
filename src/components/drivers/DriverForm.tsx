import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Driver, Vehicle } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import { User, Phone, Mail, Calendar, FileText, Upload, Trash2, Plus, Truck, Users, FileCheck, Droplet, Database } from 'lucide-react';
import { getVehicles } from '../../utils/storage';
import CollapsibleSection from '../ui/CollapsibleSection';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<Omit<Driver, 'id'>>({
    defaultValues: {
      status: 'active',
      ...initialData,
      other_documents: initialData?.other_documents || []
    }
  });

  // Field array for other documents
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'other_documents'
  });

  // Fetch vehicles for the dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesData = await getVehicles();
        // Filter out archived vehicles
        const activeVehicles = vehiclesData.filter(v => v.status !== 'archived');
        setVehicles(activeVehicles);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    
    fetchVehicles();
  }, []);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Top-level Fetch Block */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <p className="text-sm text-gray-600 mb-3">Fetch Driver Info from Government Portal</p>
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-2/5">
            <Input
              label="License Number"
              icon={<FileText className="h-4 w-4" />}
              error={errors.license_number?.message}
              required
              disabled={isSubmitting}
              {...register('license_number', { required: 'License number is required' })}
            />
          </div>
          <div className="w-full md:w-2/5">
            <Input
              label="Date of Birth"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              placeholder="DD-MM-YYYY"
              disabled={isSubmitting}
              {...register('dob')}
            />
          </div>
          <div className="w-full md:w-1/5">
            <Button
              type="button"
              disabled={isSubmitting}
              className="w-full"
            >
              Fetch Details
            </Button>
          </div>
        </div>
      </div>

      {/* Driver Photo */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Driver" 
                className="h-full w-full object-cover" 
              />
            ) : (
              <User className="h-12 w-12 text-gray-400" />
            )}
          </div>
          <Controller
            control={control}
            name="photo"
            render={({ field: { onChange, value, ...field } }) => (
              <div className="absolute bottom-0 right-0">
                <label 
                  htmlFor="photo-upload" 
                  className="cursor-pointer bg-primary-600 text-white p-1.5 rounded-full hover:bg-primary-700 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
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

      {/* Personal Information */}
      <CollapsibleSection 
        title="Personal Information" 
        icon={<User className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            icon={<User className="h-4 w-4" />}
            error={errors.name?.message}
            required
            {...register('name', { required: 'Full name is required' })}
          />

          <Input
            label="Father/Husband Name"
            icon={<Users className="h-4 w-4" />}
            {...register('father_or_husband_name')}
          />

          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select
                label="Gender"
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'OTHER', label: 'Other' }
                ]}
                {...field}
              />
            )}
          />

          <Input
            label="Date of Birth"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            {...register('dob')}
          />

          <Controller
            control={control}
            name="blood_group"
            render={({ field }) => (
              <Select
                label="Blood Group"
                icon={<Droplet className="h-4 w-4" />}
                options={[
                  { value: '', label: 'Select Blood Group' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' }
                ]}
                {...field}
              />
            )}
          />
        </div>
      </CollapsibleSection>

      {/* Contact & License Details */}
      <CollapsibleSection 
        title="Contact & License Details" 
        icon={<FileCheck className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={true}
      >
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

          <Input
            label="License Number"
            icon={<FileText className="h-4 w-4" />}
            error={errors.license_number?.message}
            required
            {...register('license_number', { required: 'License number is required' })}
          />

          <Controller
            control={control}
            name="vehicle_class"
            render={({ field }) => (
              <Select
                label="Vehicle Class"
                icon={<Truck className="h-4 w-4" />}
                options={[
                  { value: '', label: 'Select Vehicle Class' },
                  { value: 'LMV', label: 'LMV - Light Motor Vehicle' },
                  { value: 'HMV', label: 'HMV - Heavy Motor Vehicle' },
                  { value: 'TRANS', label: 'TRANS - Transport' },
                  { value: 'MCWG', label: 'MCWG - Motorcycle with Gear' }
                ]}
                {...field}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="License Issue Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            {...register('license_issue_date')}
          />

          <Input
            label="Valid From"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            {...register('valid_from')}
          />

          <Input
            label="Valid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.license_expiry_date?.message}
            required
            {...register('license_expiry_date', { required: 'License expiry date is required' })}
          />
        </div>
      </CollapsibleSection>

      {/* RTO Information */}
      <CollapsibleSection 
        title="RTO Information" 
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-orange-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="RTO Code"
            placeholder="e.g., CG06"
            {...register('rto_code')}
          />

          <Input
            label="RTO Name"
            placeholder="e.g., MAHASAMUND"
            {...register('rto')}
          />

          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select
                label="State"
                options={[
                  { value: '', label: 'Select State' },
                  { value: 'CHHATTISGARH', label: 'Chhattisgarh' },
                  { value: 'ODISHA', label: 'Odisha' },
                  { value: 'MAHARASHTRA', label: 'Maharashtra' },
                  { value: 'MADHYA PRADESH', label: 'Madhya Pradesh' }
                ]}
                {...field}
              />
            )}
          />
        </div>
      </CollapsibleSection>

      {/* Employment Details */}
      <CollapsibleSection 
        title="Employment Details" 
        icon={<Users className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <Controller
            control={control}
            name="primary_vehicle_id"
            render={({ field }) => (
              <Select
                label="Assigned Vehicle"
                options={[
                  { value: '', label: 'Select Vehicle' },
                  ...vehicles.map(vehicle => ({
                    value: vehicle.id,
                    label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
                  }))
                ]}
                {...field}
              />
            )}
          />
        </div>

        <div className="mt-4">
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
      </CollapsibleSection>

      {/* Documents */}
      <CollapsibleSection 
        title="Documents" 
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-red-600"
        defaultExpanded={true}
      >
        <div className="space-y-4">
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

          {/* Other Documents */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Other Documents</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ name: '', file_obj: undefined })}
                icon={<Plus className="h-4 w-4" />}
              >
                Add Document
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">No additional documents added</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-gray-50 relative">
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-gray-400 hover:text-error-500"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Input
                        label="Document Name"
                        placeholder="e.g., Medical Certificate"
                        {...register(`other_documents.${index}.name` as const)}
                      />

                      <Input
                        label="Issue/Expiry Date"
                        type="date"
                        {...register(`other_documents.${index}.issue_date` as const)}
                      />
                    </div>

                    <Controller
                      control={control}
                      name={`other_documents.${index}.file_obj` as const}
                      render={({ field: { value, onChange, ...field } }) => (
                        <FileUpload
                          label="Upload Document"
                          value={value as File | null}
                          onChange={onChange}
                          accept=".jpg,.jpeg,.png,.pdf"
                          {...field}
                        />
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Notes */}
      <CollapsibleSection 
        title="Notes" 
        icon={<Database className="h-5 w-5" />}
        iconColor="text-gray-600"
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks / Internal Notes
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              rows={4}
              placeholder="Add any additional notes or remarks about this driver (for internal use only)"
              {...register('notes')}
            ></textarea>
          </div>
        </div>
      </CollapsibleSection>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
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