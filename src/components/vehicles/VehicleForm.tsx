import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Vehicle } from '../../types';
import { ReminderContact, ReminderTemplate, ReminderAssignedType } from '../../types/reminders';
import { getReminderContacts, getReminderTemplates } from '../../utils/reminderService';
import Input from '../ui/Input';
import Select from '../ui/Select';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import CollapsibleSection from '../ui/CollapsibleSection';
import { 
  Truck, 
  FileText, 
  Calendar, 
  Shield, 
  FileCheck, 
  Receipt, 
  Ticket, 
  Wind, 
  Plus, 
  Trash2,
  Upload,
  Paperclip,
  Bell
} from 'lucide-react';

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Omit<Vehicle, 'id'>) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

interface OtherDocument {
  id: string;
  name: string;
  file?: File | null;
  issueDate?: string;
  expiryDate?: string;
  cost?: number;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1994 }, (_, i) => ({
  value: String(1995 + i),
  label: String(1995 + i)
})).reverse();

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
  onCancel
}) => {
  const [otherDocuments, setOtherDocuments] = useState<OtherDocument[]>([]);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [fitnessFile, setFitnessFile] = useState<File | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [pucFile, setPucFile] = useState<File | null>(null);
  const [reminderContacts, setReminderContacts] = useState<ReminderContact[]>([]);
  const [reminderTemplates, setReminderTemplates] = useState<ReminderTemplate[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<Omit<Vehicle, 'id'>>({
    defaultValues: {
      status: 'active',
      fuel_type: 'diesel',
      type: 'truck',
      current_odometer: 0,
      // Reminder defaults
      remind_insurance: false,
      remind_fitness: false,
      remind_puc: false,
      remind_tax: false,
      remind_permit: false,
      remind_service: false,
      ...initialData
    }
  });

  // Watch reminder checkbox values to conditionally show reminder settings
  const remindInsurance = watch('remind_insurance');
  const remindFitness = watch('remind_fitness');
  const remindPuc = watch('remind_puc');
  const remindTax = watch('remind_tax');
  const remindPermit = watch('remind_permit');
  const remindService = watch('remind_service');

  // Fetch reminder contacts and templates
  useEffect(() => {
    const fetchReminderData = async () => {
      setLoadingReminders(true);
      try {
        const [contacts, templates] = await Promise.all([
          getReminderContacts(),
          getReminderTemplates()
        ]);
        setReminderContacts(contacts);
        setReminderTemplates(templates);
      } catch (error) {
        console.error('Error fetching reminder data:', error);
      } finally {
        setLoadingReminders(false);
      }
    };

    fetchReminderData();
  }, []);

  const handleFormSubmit = (data: any) => {
    // Convert file objects to boolean flags for database storage
    // In a real app, you would upload these files to storage and store the URLs
   // Convert empty date strings to null to avoid timestamp errors
   const processedData = { ...data };
   const dateFields = [
     'registration_date', 'rc_expiry_date', 
     'insurance_start_date', 'insurance_end_date', 
     'fitness_issue_date', 'fitness_expiry_date',
     'permit_issue_date', 'permit_expiry_date',
     'puc_issue_date', 'puc_expiry_date'
   ];
   
   // Convert empty date strings to null
   dateFields.forEach(field => {
     if (processedData[field] === '') {
       processedData[field] = null;
     }
   });
   
    const formattedData = {
     ...processedData,
      rc_copy: !!rcFile,
      insurance_document: !!insuranceFile,
      fitness_document: !!fitnessFile,
      tax_receipt_document: !!taxFile,
      permit_document: !!permitFile,
      puc_document: !!pucFile,
      other_documents: otherDocuments.map(doc => ({
        name: doc.name,
        file: !!doc.file,
       issue_date: doc.issueDate || null,
       expiry_date: doc.expiryDate || null,
        cost: doc.cost
      }))
    };
    
    onSubmit(formattedData);
  };

  const addOtherDocument = () => {
    setOtherDocuments([...otherDocuments, { 
      id: `doc-${Date.now()}`, 
      name: '' 
    }]);
  };

  const removeOtherDocument = (id: string) => {
    setOtherDocuments(otherDocuments.filter(doc => doc.id !== id));
  };

  const updateOtherDocument = (id: string, field: keyof OtherDocument, value: any) => {
    setOtherDocuments(otherDocuments.map(doc => 
      doc.id === id ? { ...doc, [field]: value } : doc
    ));
  };

  // Helper function to get default days before from template
  const getDefaultDaysBefore = (reminderType: ReminderAssignedType): number => {
    const template = reminderTemplates.find(t => t.reminder_type === reminderType);
    return template?.default_days_before || 14; // Default to 14 days if no template found
  };

  // Get contacts for a specific reminder type or global contacts
  const getContactsForType = (reminderType: ReminderAssignedType): ReminderContact[] => {
    // First, get all global contacts
    const globalContacts = reminderContacts.filter(c => c.is_global && c.is_active);
    
    // Then, get contacts assigned to this specific type
    const typeContacts = reminderContacts.filter(
      c => c.is_active && !c.is_global && c.assigned_types.includes(reminderType)
    );
    
    // Return global contacts first, then type-specific contacts
    return [...globalContacts, ...typeContacts];
  };

  // Render reminder settings for a specific document type
  const renderReminderSettings = (
    documentType: ReminderAssignedType,
    remindField: string,
    contactIdField: string,
    daysBeforeField: string
  ) => {
    const contacts = getContactsForType(documentType);
    const defaultDaysBefore = getDefaultDaysBefore(documentType);
    
    return (
      <div className="mt-3 pl-6 border-l-2 border-gray-100">
        <div className="flex items-center mb-2">
          <Bell className="h-4 w-4 text-primary-500 mr-2" />
          <span className="text-sm font-medium text-primary-600">Reminder Settings</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            control={control}
            name={contactIdField as any}
            render={({ field }) => (
              <Select
                label="Contact"
                options={[
                  { value: '', label: 'Select Contact' },
                  ...contacts.map(contact => ({
                    value: contact.id,
                    label: `${contact.full_name}${contact.is_global ? ' (Global)' : ''}`
                  }))
                ]}
                {...field}
              />
            )}
          />
          
          <Input
            label={`Days Before (Default: ${defaultDaysBefore})`}
            type="number"
            min="1"
            max="365"
            placeholder={defaultDaysBefore.toString()}
            {...register(daysBeforeField as any, {
              valueAsNumber: true,
              min: { value: 1, message: 'Must be at least 1 day' },
              max: { value: 365, message: 'Cannot exceed 365 days' }
            })}
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information Section - Always Expanded */}
      <CollapsibleSection 
        title="Basic Information" 
        icon={<Truck className="h-5 w-5" />} 
        defaultExpanded={true}
        iconColor="text-blue-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Vehicle Number"
            placeholder="CG04AB1234"
            error={errors.registration_number?.message}
            required
            {...register('registration_number', { 
              required: 'Vehicle number is required',
              setValueAs: (v) => v?.toUpperCase()
            })}
          />

          <Input
            label="Chassis Number"
            error={errors.chassis_number?.message}
            required
            placeholder="17 characters"
            {...register('chassis_number', { 
              required: 'Chassis number is required',
              minLength: {
                value: 17,
                message: 'Chassis number should be 17 characters'
              },
              maxLength: {
                value: 17,
                message: 'Chassis number should be 17 characters'
              }
            })}
          />

          <Input
            label="Engine Number"
            error={errors.engine_number?.message}
            required
            {...register('engine_number', { required: 'Engine number is required' })}
          />

          <Input
            label="Make"
            error={errors.make?.message}
            required
            placeholder="Tata, Ashok Leyland, etc."
            {...register('make', { required: 'Make is required' })}
          />

          <Input
            label="Model"
            error={errors.model?.message}
            required
            placeholder="407, 1109, etc."
            {...register('model', { required: 'Model is required' })}
          />

          <Controller
            control={control}
            name="year"
            rules={{ required: 'Year is required' }}
            render={({ field }) => (
              <Select
                label="Year"
                options={yearOptions}
                error={errors.year?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="type"
            rules={{ required: 'Vehicle type is required' }}
            render={({ field }) => (
              <Select
                label="Vehicle Type"
                options={[
                  { value: 'truck', label: 'Truck' },
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'van', label: 'Van' },
                  { value: 'tempo', label: 'Tempo' },
                  { value: 'trailer', label: 'Trailer' }
                ]}
                error={errors.type?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="fuel_type"
            rules={{ required: 'Fuel type is required' }}
            render={({ field }) => (
              <Select
                label="Fuel Type"
                options={[
                  { value: 'diesel', label: 'Diesel' },
                  { value: 'petrol', label: 'Petrol' },
                  { value: 'cng', label: 'CNG' },
                  { value: 'ev', label: 'Electric' }
                ]}
                error={errors.fuel_type?.message}
                required
                {...field}
              />
            )}
          />

          <Input
            label="Tyre Size"
            placeholder="e.g., 215/75 R15"
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            min="4"
            placeholder="6, 10, etc."
            {...register('number_of_tyres', {
              valueAsNumber: true,
              min: {
                value: 4,
                message: 'Minimum 4 tyres required'
              }
            })}
          />

          <Input
            label="Registration Date"
            type="date"
            {...register('registration_date')}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            {...register('rc_expiry_date')}
          />

          <Input
            label="Current Odometer"
            type="number"
            error={errors.current_odometer?.message}
            required
            {...register('current_odometer', {
              required: 'Current odometer reading is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Odometer reading must be positive' }
            })}
          />

          <Controller
            control={control}
            name="status"
            rules={{ required: 'Status is required' }}
            render={({ field }) => (
              <Select
                label="Status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'maintenance', label: 'Under Maintenance' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'stood', label: 'Stood' }
                ]}
                error={errors.status?.message}
                required
                {...field}
              />
            )}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <FileUpload
            buttonMode={true}
            label="Upload RC"
            accept=".jpg,.jpeg,.png,.pdf"
            value={rcFile}
            onChange={setRcFile}
            icon={<Paperclip className="h-4 w-4" />}
          />
        </div>
      </CollapsibleSection>

      {/* Insurance Details Section */}
      <CollapsibleSection 
        title="Insurance Details" 
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-purple-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Policy Number"
            placeholder="e.g., POL123456789"
            {...register('policy_number')}
          />

          <Input
            label="Insurer Name"
            placeholder="e.g., ICICI Lombard"
            {...register('insurer_name')}
          />

          <Input
            label="Start Date"
            type="date"
            {...register('insurance_start_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            {...register('insurance_end_date')}
          />

          <Input
            label="Premium Amount (₹)"
            type="number"
            min="0"
            placeholder="e.g., 25000"
            {...register('insurance_premium_amount', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Premium amount must be positive'
              }
            })}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <FileUpload
            buttonMode={true}
            label="Upload Insurance PDF"
            accept=".jpg,.jpeg,.png,.pdf"
            value={insuranceFile}
            onChange={setInsuranceFile}
            icon={<Paperclip className="h-4 w-4" />}
          />
        </div>

        {/* Insurance Reminder Settings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Controller
            control={control}
            name="remind_insurance"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Set Insurance Expiry Reminder"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                icon={<Bell className="h-4 w-4" />}
              />
            )}
          />
          
          {remindInsurance && renderReminderSettings(
            ReminderAssignedType.Insurance,
            'remind_insurance',
            'insurance_reminder_contact_id',
            'insurance_reminder_days_before'
          )}
        </div>
      </CollapsibleSection>

      {/* Fitness Certificate Section */}
      <CollapsibleSection 
        title="Fitness Certificate" 
        icon={<FileCheck className="h-5 w-5" />}
        iconColor="text-green-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Certificate Number"
            placeholder="e.g., FC123456789"
            {...register('fitness_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            {...register('fitness_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            {...register('fitness_expiry_date')}
          />

          <Input
            label="Fitness Cost (₹)"
            type="number"
            min="0"
            placeholder="e.g., 2000"
            {...register('fitness_cost', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Cost must be positive'
              }
            })}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <FileUpload
            buttonMode={true}
            label="Upload Fitness Certificate"
            accept=".jpg,.jpeg,.png,.pdf"
            value={fitnessFile}
            onChange={setFitnessFile}
            icon={<Paperclip className="h-4 w-4" />}
          />
        </div>

        {/* Fitness Reminder Settings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Controller
            control={control}
            name="remind_fitness"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Set Fitness Certificate Expiry Reminder"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                icon={<Bell className="h-4 w-4" />}
              />
            )}
          />
          
          {remindFitness && renderReminderSettings(
            ReminderAssignedType.Fitness,
            'remind_fitness',
            'fitness_reminder_contact_id',
            'fitness_reminder_days_before'
          )}
        </div>
      </CollapsibleSection>

      {/* Tax Details Section */}
      <CollapsibleSection 
        title="Tax Details" 
        icon={<Receipt className="h-5 w-5" />}
        iconColor="text-yellow-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Tax Receipt Number"
            placeholder="e.g., TR123456789"
            {...register('tax_receipt_number')}
          />

          <Input
            label="Tax Amount (₹)"
            type="number"
            min="0"
            placeholder="e.g., 5000"
            {...register('tax_amount', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Tax amount must be positive'
              }
            })}
          />

          <Controller
            control={control}
            name="tax_period"
            render={({ field }) => (
              <Select
                label="Tax Period"
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'half-yearly', label: 'Half-yearly' },
                  { value: 'yearly', label: 'Yearly' }
                ]}
                {...field}
              />
            )}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <FileUpload
            buttonMode={true}
            label="Upload Tax Receipt"
            accept=".jpg,.jpeg,.png,.pdf"
            value={taxFile}
            onChange={setTaxFile}
            icon={<Paperclip className="h-4 w-4" />}
          />
        </div>

        {/* Tax Reminder Settings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Controller
            control={control}
            name="remind_tax"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Set Tax Expiry Reminder"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                icon={<Bell className="h-4 w-4" />}
              />
            )}
          />
          
          {remindTax && renderReminderSettings(
            ReminderAssignedType.Tax,
            'remind_tax',
            'tax_reminder_contact_id',
            'tax_reminder_days_before'
          )}
        </div>
      </CollapsibleSection>

      {/* Permit Details Section */}
      <CollapsibleSection 
        title="Permit Details" 
        icon={<Ticket className="h-5 w-5" />}
        iconColor="text-red-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Permit Number"
            placeholder="e.g., PER123456789"
            {...register('permit_number')}
          />

          <Input
            label="Issuing State"
            placeholder="e.g., Chhattisgarh"
            {...register('issuing_state')}
          />

          <Controller
            control={control}
            name="permit_type"
            render={({ field }) => (
              <Select
                label="Permit Type"
                options={[
                  { value: 'national', label: 'National' },
                  { value: 'state', label: 'State' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'tourist', label: 'Tourist' }
                ]}
                {...field}
              />
            )}
          />

          <Input
            label="Issue Date"
            type="date"
            {...register('permit_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            {...register('permit_expiry_date')}
          />

          <Input
            label="Permit Cost (₹)"
            type="number"
            min="0"
            placeholder="e.g., 10000"
            {...register('permit_cost', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Cost must be positive'
              }
            })}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <FileUpload
            buttonMode={true}
            label="Upload Permit Document"
            accept=".jpg,.jpeg,.png,.pdf"
            value={permitFile}
            onChange={setPermitFile}
            icon={<Paperclip className="h-4 w-4" />}
          />
        </div>

        {/* Permit Reminder Settings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Controller
            control={control}
            name="remind_permit"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Set Permit Expiry Reminder"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                icon={<Bell className="h-4 w-4" />}
              />
            )}
          />
          
          {remindPermit && renderReminderSettings(
            ReminderAssignedType.Permit,
            'remind_permit',
            'permit_reminder_contact_id',
            'permit_reminder_days_before'
          )}
        </div>
      </CollapsibleSection>

      {/* PUC Section */}
      <CollapsibleSection 
        title="Pollution Certificate (PUC)" 
        icon={<Wind className="h-5 w-5" />}
        iconColor="text-amber-600"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Certificate Number"
            placeholder="e.g., PUC123456789"
            {...register('puc_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            {...register('puc_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            {...register('puc_expiry_date')}
          />

          <Input
            label="PUC Cost (₹)"
            type="number"
            min="0"
            placeholder="e.g., 500"
            {...register('puc_cost', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Cost must be positive'
              }
            })}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <FileUpload
            buttonMode={true}
            label="Upload PUC Certificate"
            accept=".jpg,.jpeg,.png,.pdf"
            value={pucFile}
            onChange={setPucFile}
            icon={<Paperclip className="h-4 w-4" />}
          />
        </div>

        {/* PUC Reminder Settings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Controller
            control={control}
            name="remind_puc"
            render={({ field: { value, onChange } }) => (
              <Checkbox
                label="Set Pollution Certificate Expiry Reminder"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                icon={<Bell className="h-4 w-4" />}
              />
            )}
          />
          
          {remindPuc && renderReminderSettings(
            ReminderAssignedType.Pollution,
            'remind_puc',
            'puc_reminder_contact_id',
            'puc_reminder_days_before'
          )}
        </div>
      </CollapsibleSection>

      {/* Service Reminder Section */}
      <CollapsibleSection 
        title="Service Reminder" 
        icon={<Bell className="h-5 w-5" />}
        iconColor="text-blue-600"
      >
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-sm text-blue-700">
            Configure reminders for regular service intervals based on time or odometer reading.
          </p>
        </div>

        <Controller
          control={control}
          name="remind_service"
          render={({ field: { value, onChange } }) => (
            <Checkbox
              label="Enable Service Due Reminders"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
              icon={<Bell className="h-4 w-4" />}
            />
          )}
        />
        
        {remindService && (
          <div className="mt-3 pl-6 border-l-2 border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                control={control}
                name="service_reminder_contact_id"
                render={({ field }) => (
                  <Select
                    label="Contact"
                    options={[
                      { value: '', label: 'Select Contact' },
                      ...getContactsForType(ReminderAssignedType.ServiceDue).map(contact => ({
                        value: contact.id,
                        label: `${contact.full_name}${contact.is_global ? ' (Global)' : ''}`
                      }))
                    ]}
                    {...field}
                  />
                )}
              />
              
              <Input
                label={`Days Before (Default: ${getDefaultDaysBefore(ReminderAssignedType.ServiceDue)})`}
                type="number"
                min="1"
                max="365"
                placeholder={getDefaultDaysBefore(ReminderAssignedType.ServiceDue).toString()}
                {...register('service_reminder_days_before', {
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1 day' },
                  max: { value: 365, message: 'Cannot exceed 365 days' }
                })}
              />
              
              <Input
                label="Kilometers Before Service Due"
                type="number"
                min="500"
                max="50000"
                placeholder="e.g., 5000"
                {...register('service_reminder_km', {
                  valueAsNumber: true,
                  min: { value: 500, message: 'Must be at least 500 km' },
                  max: { value: 50000, message: 'Cannot exceed 50000 km' }
                })}
              />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Other Documents Section */}
      <CollapsibleSection 
        title="Other Documents" 
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-gray-600"
      >
        <div className="space-y-6">
          {otherDocuments.map((doc, index) => (
            <div key={doc.id} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">Document #{index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeOtherDocument(doc.id)}
                  className="text-error-500 hover:text-error-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Document Name"
                  required
                  value={doc.name}
                  onChange={(e) => updateOtherDocument(doc.id, 'name', e.target.value)}
                />
                
                <div className="flex items-end space-x-2">
                  <FileUpload
                    buttonMode={true}
                    label="Upload Document"
                    accept=".jpg,.jpeg,.png,.pdf"
                    value={doc.file || null}
                    onChange={(file) => updateOtherDocument(doc.id, 'file', file)}
                  />
                </div>
                
                <Input
                  label="Issue Date"
                  type="date"
                  value={doc.issueDate || ''}
                  onChange={(e) => updateOtherDocument(doc.id, 'issueDate', e.target.value)}
                />
                
                <Input
                  label="Expiry Date"
                  type="date"
                  value={doc.expiryDate || ''}
                  onChange={(e) => updateOtherDocument(doc.id, 'expiryDate', e.target.value)}
                />
                
                <Input
                  label="Document Cost (₹)"
                  type="number"
                  min="0"
                  value={doc.cost || ''}
                  onChange={(e) => updateOtherDocument(doc.id, 'cost', parseFloat(e.target.value))}
                />
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addOtherDocument}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Another Document
          </Button>
        </div>
      </CollapsibleSection>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-8 -mx-4 flex justify-end space-x-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          Save Vehicle
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;