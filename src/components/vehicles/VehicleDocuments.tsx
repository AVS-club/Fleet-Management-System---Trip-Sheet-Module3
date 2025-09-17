import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Vehicle } from '../../types';
import { FileText, Calendar, AlertTriangle } from 'lucide-react';
import Input from '../ui/Input';
import DocumentUploader from '../shared/DocumentUploader';

const VehicleDocuments: React.FC = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext<Vehicle>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Documents & Certificates</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insurance */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">Insurance</h4>
          </div>
          
          <Input
            label="Insurance Number"
            {...register('insurance_number')}
            error={errors.insurance_number?.message}
            placeholder="Enter insurance number"
          />
          
          <Input
            label="Insurance Company"
            {...register('insurance_company')}
            error={errors.insurance_company?.message}
            placeholder="Enter insurance company name"
          />
          
          <Input
            label="Insurance Expiry Date"
            type="date"
            {...register('insurance_expiry_date')}
            error={errors.insurance_expiry_date?.message}
          />
          
          <DocumentUploader
            label="Insurance Document"
            onUpload={(urls) => setValue('insurance_doc_url', urls[0] || '')}
            acceptedTypes={['application/pdf', 'image/*']}
            maxFiles={1}
          />
        </div>

        {/* Fitness Certificate */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Fitness Certificate</h4>
          </div>
          
          <Input
            label="Fitness Certificate Number"
            {...register('fitness_certificate_number')}
            error={errors.fitness_certificate_number?.message}
            placeholder="Enter fitness certificate number"
          />
          
          <Input
            label="Fitness Expiry Date"
            type="date"
            {...register('fitness_expiry_date')}
            error={errors.fitness_expiry_date?.message}
          />
          
          <DocumentUploader
            label="Fitness Certificate"
            onUpload={(urls) => setValue('fitness_doc_url', urls[0] || '')}
            acceptedTypes={['application/pdf', 'image/*']}
            maxFiles={1}
          />
        </div>

        {/* PUC Certificate */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h4 className="font-medium text-gray-900">PUC Certificate</h4>
          </div>
          
          <Input
            label="PUC Certificate Number"
            {...register('puc_certificate_number')}
            error={errors.puc_certificate_number?.message}
            placeholder="Enter PUC certificate number"
          />
          
          <Input
            label="PUC Expiry Date"
            type="date"
            {...register('puc_expiry_date')}
            error={errors.puc_expiry_date?.message}
          />
          
          <DocumentUploader
            label="PUC Certificate"
            onUpload={(urls) => setValue('puc_doc_url', urls[0] || '')}
            acceptedTypes={['application/pdf', 'image/*']}
            maxFiles={1}
          />
        </div>

        {/* Tax Certificate */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            <h4 className="font-medium text-gray-900">Tax Certificate</h4>
          </div>
          
          <Input
            label="Tax Certificate Number"
            {...register('tax_certificate_number')}
            error={errors.tax_certificate_number?.message}
            placeholder="Enter tax certificate number"
          />
          
          <Input
            label="Tax Expiry Date"
            type="date"
            {...register('tax_expiry_date')}
            error={errors.tax_expiry_date?.message}
          />
          
          <DocumentUploader
            label="Tax Certificate"
            onUpload={(urls) => setValue('tax_doc_url', urls[0] || '')}
            acceptedTypes={['application/pdf', 'image/*']}
            maxFiles={1}
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleDocuments;
