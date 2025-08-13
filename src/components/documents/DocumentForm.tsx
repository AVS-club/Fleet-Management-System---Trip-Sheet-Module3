import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { FileText, Upload, Calendar, IndianRupee } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import { toast } from 'react-toastify';

interface DocumentFormData {
  document_type: string;
  document_name: string;
  issue_date?: string;
  expiry_date?: string;
  cost?: number;
  document_file?: File[];
  notes?: string;
}

interface DocumentFormProps {
  onSubmit?: (data: DocumentFormData) => void;
  isSubmitting?: boolean;
}

const DocumentForm: React.FC<DocumentFormProps> = ({
  onSubmit,
  isSubmitting = false
}) => {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<DocumentFormData>({
    defaultValues: {
      document_type: '',
      document_name: '',
      cost: 0
    }
  });

  const handleFormSubmit = async (data: DocumentFormData) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
        reset();
        toast.success('Document added successfully');
      } else {
        // Default behavior - just show success message
        console.log('Document form data:', data);
        reset();
        toast.success('Document form submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting document:', error);
      toast.error('Failed to submit document');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          control={control}
          name="document_type"
          rules={{ required: 'Document type is required' }}
          render={({ field }) => (
            <Select
              label="Document Type"
              options={[
                { value: '', label: 'Select Document Type' },
                { value: 'rc', label: 'RC Document' },
                { value: 'insurance', label: 'Insurance' },
                { value: 'fitness', label: 'Fitness Certificate' },
                { value: 'permit', label: 'Permit' },
                { value: 'puc', label: 'PUC Certificate' },
                { value: 'tax', label: 'Tax Receipt' },
                { value: 'license', label: 'Driver License' },
                { value: 'other', label: 'Other Document' }
              ]}
              error={errors.document_type?.message}
              required
              {...field}
            />
          )}
        />

        <Input
          label="Document Name"
          icon={<FileText className="h-4 w-4" />}
          error={errors.document_name?.message}
          required
          placeholder="Enter document name"
          {...register('document_name', { required: 'Document name is required' })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Issue Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          {...register('issue_date')}
        />

        <Input
          label="Expiry Date"
          type="date"
          icon={<Calendar className="h-4 w-4" />}
          {...register('expiry_date')}
        />
      </div>

      <Input
        label="Cost (₹)"
        type="number"
        icon={<IndianRupee className="h-4 w-4" />}
        placeholder="Enter document cost"
        {...register('cost', { 
          valueAsNumber: true,
          min: { value: 0, message: 'Cost must be positive' }
        })}
      />

      <Controller
        control={control}
        name="document_file"
        render={({ field: { value, onChange, ...field } }) => (
          <FileUpload
            label="Upload Document"
            value={value as File[] | undefined}
            onChange={onChange}
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            helperText="Upload document files (JPG, PNG, PDF)"
            {...field}
          />
        )}
      />

      <Input
        label="Notes"
        placeholder="Additional notes about this document"
        {...register('notes')}
      />

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          isLoading={isSubmitting}
          icon={<Upload className="h-4 w-4" />}
        >
          Add Document
        </Button>
      </div>
    </form>
  );
};

export default DocumentForm;