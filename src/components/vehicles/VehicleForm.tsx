import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Vehicle } from '../../types';
import { ReminderContact, ReminderTemplate, ReminderAssignedType } from '../../types/reminders';
import { getReminderContacts, getReminderTemplates } from '../../utils/reminderService';
import { uploadVehicleDocument } from '../../utils/supabaseStorage';
import { supabase } from '../../utils/supabaseClient';
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
  Bell,
  Info,
  Database,
  User,
  Search,
  Loader
} from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Omit<Vehicle, 'id'>) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

interface OtherDocument {
  id: string;
  name: string;
  file_obj?: File | null;
  file_url?: string;
  issueDate?: string;
  expiryDate?: string;
  cost?: number;
}

interface VehicleAPIResponse {
  code: number;
  status: string;
  message: string;
  request_id: string;
  response: {
    license_plate: string;
    owner_name: string;
    chassis_number: string;
    engine_number: string;
    brand_name: string;
    brand_model: string;
    registration_date: string;
    fuel_type: string;
    class: string;
    color: string;
    cubic_capacity: string;
    cylinders: string;
    gross_weight: string;
    seating_capacity: string;
    manufacturing_date_formatted: string;
    rc_status: string;
    fit_up_to: string;
    insurance_company: string;
    insurance_policy: string;
    insurance_expiry: string;
    financer: string;
    vehicle_age: string | null;
    [key: string]: any;
  };
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
  const [otherInfoDocuments, setOtherInfoDocuments] = useState<File[]>([]);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [fitnessFile, setFitnessFile] = useState<File | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [pucFile, setPucFile] = useState<File | null>(null);
  const [reminderContacts, setReminderContacts] = useState<ReminderContact[]>([]);
  const [reminderTemplates, setReminderTemplates] = useState<ReminderTemplate[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fieldsDisabled, setFieldsDisabled] = useState(true);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const { register, handleSubmit, control, setValue, watch, formState: { errors }, reset } = useForm<Omit<Vehicle, 'id'>>({
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
  const registrationNumber = watch('registration_number');

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

  // Initialize other documents from initialData
  useEffect(() => {
    if (initialData?.other_documents && Array.isArray(initialData.other_documents)) {
      const formattedDocs = initialData.other_documents.map(doc => ({
        id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: doc.name,
        file_url: typeof doc.file === 'string' ? doc.file : undefined,
        issueDate: doc.issue_date,
        expiryDate: doc.expiry_date,
        cost: doc.cost
      }));
      setOtherDocuments(formattedDocs);
    }

    // Initialize otherInfoDocuments if they exist in initialData
    if (initialData?.other_info_documents && Array.isArray(initialData.other_info_documents)) {
      // If they are strings (URLs), we can't convert them to File objects
      // But we'll handle displaying them separately in the UI
    }

    // If we have initialData, enable all fields
    if (initialData && Object.keys(initialData).length > 0) {
      setFieldsDisabled(false);
    }
  }, [initialData?.other_documents, initialData?.other_info_documents, initialData]);

  const fetchVehicleDetails = async () => {
    if (!registrationNumber) {
      toast.error('Please enter a vehicle registration number');
      return;
    }

    setFetchingDetails(true);
    try {
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      if (!authToken) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-rc-details`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ registration_number: registrationNumber })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch vehicle details: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data || !data.data.response) {
        throw new Error('Invalid response from API');
      }

      const vehicleData = data.data.response;
      console.log(vehicleData)
      
      // Map API response to form fields
      mapApiResponseToForm(vehicleData);
      
      // Enable all fields for editing
      setFieldsDisabled(false);
      
      toast.success('Vehicle details fetched successfully');
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      toast.error(`Error fetching vehicle details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Enable fields anyway so user can enter data manually
      setFieldsDisabled(false);
    } finally {
      setFetchingDetails(false);
    }
  };

  const mapApiResponseToForm = (data: any) => {
    // Map API response fields to form fields
    const manufacturingYear = data.manufacturing_date_formatted ? 
      parseInt(data.manufacturing_date_formatted.split('-')[0]) : data.manufacturing_date?parseInt(data.manufacturing_date_formatted.split('/')[1]):
      null;

    // Map fuel type from API to our enum values
    let mappedFuelType: 'diesel' | 'petrol' | 'cng' | 'ev' = 'diesel';
    if (data.fuel_type) {
      const fuelLower = data.fuel_type.toLowerCase();
      if (fuelLower.includes('petrol')) mappedFuelType = 'petrol';
      else if (fuelLower.includes('cng')) mappedFuelType = 'cng';
      else if (fuelLower.includes('electric')) mappedFuelType = 'ev';
    }

    // Map vehicle type based on class
    let mappedVehicleType: 'truck' | 'tempo' | 'trailer' | 'pickup' | 'van' = 'truck';
    if (data.class) {
      const classLower = data.class.toLowerCase();
      if (classLower.includes('tempo')) mappedVehicleType = 'tempo';
      else if (classLower.includes('trailer')) mappedVehicleType = 'trailer';
      else if (classLower.includes('pickup')) mappedVehicleType = 'pickup';
      else if (classLower.includes('van')) mappedVehicleType = 'van';
    }

    // Set form values
    setValue('registration_number', data.license_plate || registrationNumber);
    setValue('chassis_number', data.chassis_number);
    setValue('engine_number', data.engine_number);
    setValue('make', data.brand_name);
    setValue('model', data.brand_model);
    setValue('year', manufacturingYear);
    setValue('type', mappedVehicleType);
    setValue('fuel_type', mappedFuelType);
    setValue('owner_name', data.owner_name);
    setValue('registration_date', data.registration_date);
    setValue('rc_expiry_date', data.fit_up_to);
    
    // Insurance details
    setValue('insurer_name', data.insurance_company);
    setValue('policy_number', data.insurance_policy);
    setValue('insurance_end_date', data.insurance_expiry);
    
    // Fitness details
    setValue('fitness_expiry_date', data.fit_up_to);

    // Permit details
    setValue('permit_number', data.permit_number);
    setValue('permit_issuing_state', data.rto_name.spliy(",")[1].trim());
   setValue('permit_issue_date', data.permit_issue_date||data.permit_valid_from);
   setValue('permit_expiry_date', data.permit_valid_upto);
   setValue('permit_type', data.permit_type || 'national');
    
    // Additional details
    setValue('financer', data.financer);
    setValue('class', data.class);
    setValue('color', data.color);
    setValue('cubic_capacity', parseFloat(data.cubic_capacity) || undefined);
    setValue('cylinders', parseInt(data.cylinders) || undefined);
    setValue('gross_weight', parseFloat(data.gross_weight) || undefined);
    setValue('seating_capacity', parseInt(data.seating_capacity) || undefined);
    setValue('emission_norms', data.norms);
    setValue('rc_status', data.rc_status);
    setValue('national_permit_number', data.national_permit_number);
    setValue('national_permit_upto', data.national_permit_upto);
  };

  const handleFormSubmit = async (data: Omit<Vehicle, 'id'>) => {
    try {
      setUploadingFiles(true);
      
      // Create a copy of the data to modify
      const formData: any = { ...data };
      
      // Upload RC document if provided
      if (rcFile) {
        try {
          const rcUrl = await uploadVehicleDocument(rcFile, initialData?.id || 'new', 'rc');
          formData.rc_document_url = rcUrl;
          formData.rc_copy = true; // Set the legacy flag for backward compatibility
        } catch (error) {
          console.error('Error uploading RC document:', error);
          toast.error('Failed to upload RC document');
        }
      }
      
      // Upload insurance document if provided
      if (insuranceFile) {
        try {
          const insuranceUrl = await uploadVehicleDocument(insuranceFile, initialData?.id || 'new', 'insurance');
          formData.insurance_document_url = insuranceUrl;
          formData.insurance_document = true; // Set the legacy flag for backward compatibility
        } catch (error) {
          console.error('Error uploading insurance document:', error);
          toast.error('Failed to upload insurance document');
        }
      }
      
      // Upload fitness document if provided
      if (fitnessFile) {
        try {
          const fitnessUrl = await uploadVehicleDocument(fitnessFile, initialData?.id || 'new', 'fitness');
          formData.fitness_document_url = fitnessUrl;
          formData.fitness_document = true; // Set the legacy flag for backward compatibility
        } catch (error) {
          console.error('Error uploading fitness document:', error);
          toast.error('Failed to upload fitness document');
        }
      }
      
      // Upload tax document if provided
      if (taxFile) {
        try {
          const taxUrl = await uploadVehicleDocument(taxFile, initialData?.id || 'new', 'tax');
          formData.tax_document_url = taxUrl;
          formData.tax_receipt_document = true; // Set the legacy flag for backward compatibility
        } catch (error) {
          console.error('Error uploading tax document:', error);
          toast.error('Failed to upload tax document');
        }
      }
      
      // Upload permit document if provided
      if (permitFile) {
        try {
          const permitUrl = await uploadVehicleDocument(permitFile, initialData?.id || 'new', 'permit');
          formData.permit_document_url = permitUrl;
          formData.permit_document = true; // Set the legacy flag for backward compatibility
        } catch (error) {
          console.error('Error uploading permit document:', error);
          toast.error('Failed to upload permit document');
        }
      }
      
      // Upload PUC document if provided
      if (pucFile) {
        try {
          const pucUrl = await uploadVehicleDocument(pucFile, initialData?.id || 'new', 'puc');
          formData.puc_document_url = pucUrl;
          formData.puc_document = true; // Set the legacy flag for backward compatibility
        } catch (error) {
          console.error('Error uploading PUC document:', error);
          toast.error('Failed to upload PUC document');
        }
      }
      
      // Process other documents
      if (otherDocuments.length > 0) {
        const processedDocs = await Promise.all(otherDocuments.map(async (doc) => {
          const processedDoc: any = {
            id: doc.id,
            name: doc.name,
            issue_date: doc.issueDate,
            expiry_date: doc.expiryDate,
            cost: doc.cost
          };
          
          // If there's a new file to upload
          if (doc.file_obj) {
            try {
              const fileUrl = await uploadVehicleDocument(
                doc.file_obj, 
                initialData?.id || 'new', 
                `other_${doc.id}`
              );
              processedDoc.file = fileUrl;
            } catch (error) {
              console.error(`Error uploading other document ${doc.name}:`, error);
              toast.error(`Failed to upload ${doc.name}`);
              // Keep existing URL if available
              processedDoc.file = doc.file_url;
            }
          } else {
            // Keep existing URL if available
            processedDoc.file = doc.file_url;
          }
          
          return processedDoc;
        }));
        
        formData.other_documents = processedDocs;
      }

      // Process Other Information & Documents
      if (otherInfoDocuments.length > 0) {
        try {
          const otherInfoDocUrls = await Promise.all(otherInfoDocuments.map(async (file) => {
            const url = await uploadVehicleDocument(
              file,
              initialData?.id || 'new',
              `other_info_${Date.now()}_${file.name}`
            );
            return url;
          }));
          
          formData.other_info_documents = otherInfoDocUrls;
        } catch (error) {
          console.error('Error uploading other info documents:', error);
          toast.error('Failed to upload some additional documents');
        }
      }
      
      // Remove file objects from the form data
      delete formData.rc_copy_file;
      delete formData.insurance_document_file;
      delete formData.fitness_document_file;
      delete formData.tax_receipt_document_file;
      delete formData.permit_document_file;
      delete formData.puc_document_file;
      
      // Submit the form data
      onSubmit(formData);
    } catch (error) {
      console.error('Error processing form submission:', error);
      toast.error('An error occurred while saving the vehicle');
    } finally {
      setUploadingFiles(false);
    }
  };

  const addOtherDocument = () => {
    setOtherDocuments([...otherDocuments, { 
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, 
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
                disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
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
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Vehicle Number"
                placeholder="CG04AB1234"
                error={errors.registration_number?.message}
                required
                disabled={false} // This field is always enabled
                {...register('registration_number', { 
                  required: 'Vehicle number is required',
                  setValueAs: (v) => v?.toUpperCase()
                })}
              />
            </div>
            <Button
              type="button"
              onClick={fetchVehicleDetails}
              isLoading={fetchingDetails}
              icon={fetchingDetails ? undefined : <Search className="h-4 w-4" />}
              className="mb-0.5"
            >
              {fetchingDetails ? 'Fetching...' : 'Get Details'}
            </Button>
          </div>

          <Input
            label="Chassis Number"
            error={errors.chassis_number?.message}
            required
            disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            {...register('engine_number', { required: 'Engine number is required' })}
          />

          <Input
            label="Make"
            error={errors.make?.message}
            required
            disabled={fieldsDisabled}
            placeholder="Tata, Ashok Leyland, etc."
            {...register('make', { required: 'Make is required' })}
          />

          <Input
            label="Model"
            error={errors.model?.message}
            required
            disabled={fieldsDisabled}
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
                disabled={fieldsDisabled}
                {...field}
              />
            )}
          />

          <Input
            label="Owner Name"
            placeholder="Enter owner's name"
            disabled={fieldsDisabled}
            {...register('owner_name')}
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
                disabled={fieldsDisabled}
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
                disabled={fieldsDisabled}
                {...field}
              />
            )}
          />

          <Input
            label="Tyre Size"
            placeholder="e.g., 215/75 R15"
            disabled={fieldsDisabled}
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            min="4"
            placeholder="6, 10, etc."
            disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            {...register('registration_date')}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('rc_expiry_date')}
          />

          <Input
            label="Current Odometer"
            type="number"
            error={errors.current_odometer?.message}
            required
            disabled={fieldsDisabled}
            {...register('current_odometer', {
              required: 'Current odometer reading is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Odometer reading must be positive' }
            })}
          />

          <Controller
            control={control}
            name="rc_status"
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
                error={errors.rc_status?.message}
                required
                disabled={fieldsDisabled}
                {...field}
              />
            )}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="rc_copy_file"
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload RC"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  setRcFile(file as File);
                }}
                icon={<Paperclip className="h-4 w-4" />}
                disabled={fieldsDisabled}
              />
            )}
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
            disabled={fieldsDisabled}
            {...register('policy_number')}
          />

          <Input
            label="Insurer Name"
            placeholder="e.g., ICICI Lombard"
            disabled={fieldsDisabled}
            {...register('insurer_name')}
          />

          <Input
            label="Start Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('insurance_start_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('insurance_end_date')}
          />

          <Input
            label="Premium Amount (₹)"
            type="number"
            min="0"
            placeholder="e.g., 25000"
            disabled={fieldsDisabled}
            {...register('insurance_premium_amount', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'Premium amount must be positive'
              }
            })}
          />

          <Input
            label="IDV Amount (₹)"
            type="number"
            min="0"
            placeholder="e.g., 500000"
            disabled={fieldsDisabled}
            {...register('insurance_idv', {
              valueAsNumber: true,
              min: {
                value: 0,
                message: 'IDV amount must be positive'
              }
            })}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="insurance_document_file"
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload Insurance PDF"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  setInsuranceFile(file as File);
                }}
                icon={<Paperclip className="h-4 w-4" />}
                disabled={fieldsDisabled}
              />
            )}
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
                disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            {...register('fitness_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('fitness_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('fitness_expiry_date')}
          />

          <Input
            label="Fitness Cost (₹)"
            type="number"
            min="0"
            placeholder="e.g., 2000"
            disabled={fieldsDisabled}
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
          <Controller
            control={control}
            name="fitness_document_file"
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload Fitness Certificate"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  setFitnessFile(file as File);
                }}
                icon={<Paperclip className="h-4 w-4" />}
                disabled={fieldsDisabled}
              />
            )}
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
                disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            {...register('tax_receipt_number')}
          />

          <Input
            label="Tax Amount (₹)"
            type="number"
            min="0"
            placeholder="e.g., 5000"
            disabled={fieldsDisabled}
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
                disabled={fieldsDisabled}
                {...field}
              />
            )}
          />

          <Input
            label="Tax Scope"
            placeholder="e.g., State, National"
            disabled={fieldsDisabled}
            {...register('tax_scope')}
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <Controller
            control={control}
            name="tax_receipt_document_file"
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload Tax Receipt"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  setTaxFile(file as File);
                }}
                icon={<Paperclip className="h-4 w-4" />}
                disabled={fieldsDisabled}
              />
            )}
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
                disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            {...register('permit_number')}
          />

          <Input
            label="Issuing State"
            placeholder="e.g., Chhattisgarh"
            disabled={fieldsDisabled}
            {...register('permit_issuing_state')}
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
                disabled={fieldsDisabled}
                {...field}
              />
            )}
          />

          <Input
            label="Issue Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('permit_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('permit_expiry_date')}
          />

          <Input
            label="Permit Cost (₹)"
            type="number"
            min="0"
            placeholder="e.g., 10000"
            disabled={fieldsDisabled}
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
          <Controller
            control={control}
            name="permit_document_file"
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload Permit Document"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  setPermitFile(file as File);
                }}
                icon={<Paperclip className="h-4 w-4" />}
                disabled={fieldsDisabled}
              />
            )}
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
                disabled={fieldsDisabled}
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
            disabled={fieldsDisabled}
            {...register('puc_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('puc_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            disabled={fieldsDisabled}
            {...register('puc_expiry_date')}
          />

          <Input
            label="PUC Cost (₹)"
            type="number"
            min="0"
            placeholder="e.g., 500"
            disabled={fieldsDisabled}
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
          <Controller
            control={control}
            name="puc_document_file"
            render={({ field: { value, onChange } }) => (
              <FileUpload
                buttonMode={true}
                label="Upload PUC Certificate"
                accept=".jpg,.jpeg,.png,.pdf"
                value={value as File | null}
                onChange={(file) => {
                  onChange(file);
                  setPucFile(file as File);
                }}
                icon={<Paperclip className="h-4 w-4" />}
                disabled={fieldsDisabled}
              />
            )}
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
                disabled={fieldsDisabled}
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
              disabled={fieldsDisabled}
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
                    disabled={fieldsDisabled}
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
                disabled={fieldsDisabled}
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
                disabled={fieldsDisabled}
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
                  disabled={fieldsDisabled}
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
                  disabled={fieldsDisabled}
                />
                
                <div className="flex items-end space-x-2">
                  <FileUpload
                    buttonMode={true}
                    label="Upload Document"
                    accept=".jpg,.jpeg,.png,.pdf"
                    value={doc.file_obj || null}
                    onChange={(file) => updateOtherDocument(doc.id, 'file_obj', file)}
                    disabled={fieldsDisabled}
                  />
                  
                  {doc.file_url && (
                    <a 
                      href={doc.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 bg-white rounded-md border border-primary-200 hover:bg-primary-50"
                    >
                      View
                    </a>
                  )}
                </div>
                
                <Input
                  label="Issue Date"
                  type="date"
                  value={doc.issueDate || ''}
                  onChange={(e) => updateOtherDocument(doc.id, 'issueDate', e.target.value)}
                  disabled={fieldsDisabled}
                />
                
                <Input
                  label="Expiry Date"
                  type="date"
                  value={doc.expiryDate || ''}
                  onChange={(e) => updateOtherDocument(doc.id, 'expiryDate', e.target.value)}
                  disabled={fieldsDisabled}
                />
                
                <Input
                  label="Document Cost (₹)"
                  type="number"
                  min="0"
                  value={doc.cost || ''}
                  onChange={(e) => updateOtherDocument(doc.id, 'cost', parseFloat(e.target.value))}
                  disabled={fieldsDisabled}
                />
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addOtherDocument}
            icon={<Plus className="h-4 w-4" />}
            disabled={fieldsDisabled}
          >
            Add Another Document
          </Button>
        </div>
      </CollapsibleSection>

      {/* Other Information & Documents Section */}
      <CollapsibleSection 
        title="Other Information & Documents" 
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-gray-600"
        defaultExpanded={false}
      >
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {/* Financed By */}
              {initialData?.financer && initialData.financer !== "DUMMY COMPANY" && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Financed By</span>
                  <span className="text-gray-700">{initialData.financer}</span>
                </div>
              )}
              
              {/* Engine Number */}
              {initialData?.engine_number && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Engine Number</span>
                  <span className="text-gray-700 font-mono">{initialData.engine_number.toUpperCase()}</span>
                </div>
              )}
              
              {/* Chassis Number */}
              {initialData?.chassis_number && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Chassis Number</span>
                  <span className="text-gray-700 font-mono">{initialData.chassis_number.toUpperCase()}</span>
                </div>
              )}
              
              {/* Fuel Type */}
              {initialData?.fuel_type && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Fuel Type</span>
                  <span className="text-gray-700 capitalize">{initialData.fuel_type}</span>
                </div>
              )}
              
              {/* Vehicle Class */}
              {initialData?.class && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Vehicle Class</span>
                  <span className="text-gray-700">{initialData.class}</span>
                </div>
              )}
              
              {/* Color */}
              {initialData?.color && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Color</span>
                  <span className="text-gray-700">{initialData.color}</span>
                </div>
              )}
              
              {/* Cubic Capacity */}
              {initialData?.cubic_capacity && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Cubic Capacity (cc)</span>
                  <span className="text-gray-700">{initialData.cubic_capacity}</span>
                </div>
              )}
              
              {/* Cylinder Count */}
              {initialData?.cylinders && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Cylinder Count</span>
                  <span className="text-gray-700">{initialData.cylinders}</span>
                </div>
              )}
              
              {/* Unladen Weight */}
              {initialData?.gross_weight && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Unladen Weight (kg)</span>
                  <span className="text-gray-700">{initialData.gross_weight}</span>
                </div>
              )}
              
              {/* Seating Capacity */}
              {initialData?.seating_capacity && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Seating Capacity</span>
                  <span className="text-gray-700">{initialData.seating_capacity}</span>
                </div>
              )}
              
              {/* Emission Norms */}
              {initialData?.emission_norms && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Emission Norms</span>
                  <span className="text-gray-700">{initialData.emission_norms}</span>
                </div>
              )}
              
              {/* NOC Details */}
              {initialData?.noc_details && (
                <div className="py-1.5">
                  <span className="block text-gray-500">NOC Details</span>
                  <span className="text-gray-700">{initialData.noc_details}</span>
                </div>
              )}
              
              {/* National Permit Number */}
              {initialData?.national_permit_number && (
                <div className="py-1.5">
                  <span className="block text-gray-500">National Permit Number</span>
                  <span className="text-gray-700">{initialData.national_permit_number}</span>
                </div>
              )}
              
              {/* Permit Valid Till */}
              {initialData?.national_permit_upto && initialData.national_permit_upto !== "1900-01-01" && (
                <div className="py-1.5">
                  <span className="block text-gray-500">Permit Valid Till</span>
                  <span className="text-gray-700">
                    {new Date(initialData.national_permit_upto).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {/* RC Status */}
              {initialData?.rc_status && (
                <div className="py-1.5">
                  <span className="block text-gray-500">RC Status</span>
                  <span className="text-gray-700">{initialData.rc_status}</span>
                </div>
              )}
            </div>
            
            {/* Last fetched from VAHAN date */}
            {initialData?.vahan_last_fetched_date && (
              <div className="text-right mt-4 text-xs text-gray-400">
                Last fetched from VAHAN: {
                  new Date(initialData.vahan_last_fetched_date).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }
              </div>
            )}

            {/* If no data available yet, show a message */}
            {!initialData?.financer && 
             !initialData?.engine_number && 
             !initialData?.chassis_number && 
             !initialData?.class && 
             !initialData?.rc_status && (
              <div className="flex items-center justify-center py-8">
                <Database className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-500">No VAHAN data available for this vehicle</span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <FileUpload
              label="Upload Related Documents"
              helperText="Add additional documents related to the vehicle (max 5 files)"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={true}
              maxFiles={5}
              value={otherInfoDocuments}
              onChange={(files) => setOtherInfoDocuments(files as File[])}
              icon={<Paperclip className="h-4 w-4" />}
              disabled={fieldsDisabled}
            />

            {/* Display existing document URLs if any */}
            {initialData?.other_info_documents && Array.isArray(initialData.other_info_documents) && initialData.other_info_documents.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Existing Documents</h5>
                <div className="space-y-2">
                  {initialData.other_info_documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center overflow-hidden">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                        <span className="text-sm text-gray-700 truncate">
                          {typeof doc === 'string' ? `Document ${index + 1}` : doc.name}
                        </span>
                      </div>
                      {typeof doc === 'string' && (
                        <a 
                          href={doc}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary-600 hover:text-primary-700 text-sm underline"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          isLoading={isSubmitting || uploadingFiles}
          disabled={fieldsDisabled && !initialData}
        >
          {uploadingFiles ? 'Uploading Files...' : 'Save Vehicle'}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;