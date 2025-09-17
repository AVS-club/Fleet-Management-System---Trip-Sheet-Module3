import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Vehicle, Driver } from '../../types';
import { getReminderContacts, getDrivers } from '../utils/storage';
import { toast } from 'react-toastify';

interface UseVehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Vehicle) => void;
  onCancel?: () => void;
}

export const useVehicleForm = ({ initialData, onSubmit, onCancel }: UseVehicleFormProps) => {
  const [reminderContacts, setReminderContacts] = useState<any[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [fieldsDisabled, setFieldsDisabled] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string[]>>({});

  const methods = useForm<Vehicle>({
    defaultValues: {
      type: 'truck',
      fuel_type: 'diesel',
      status: 'active',
      current_odometer: 0,
      remind_insurance: false,
      remind_fitness: false,
      remind_puc: false,
      remind_tax: false,
      remind_permit: false,
      remind_service: false,
      other_documents: [],
      ...initialData,
    },
  });

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = methods;

  // Enable fields if initialData is present (for edit mode)
  useEffect(() => {
    if (initialData?.id) setFieldsDisabled(false);
  }, [initialData]);

  // Fetch required data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsData, driversData] = await Promise.all([
          getReminderContacts(),
          getDrivers()
        ]);
        
        setReminderContacts(Array.isArray(contactsData) ? contactsData : []);
        setAvailableDrivers(Array.isArray(driversData) ? driversData : []);
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      }
    };

    fetchData();
  }, []);

  // Handle document upload completion
  const handleDocumentUpload = (docType: string, filePaths: string[]) => {
    setUploadedDocuments(prev => ({
      ...prev,
      [docType]: filePaths
    }));
  };

  // Handle form submission
  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save vehicle');
    }
  });

  // Handle form cancellation
  const handleFormCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      reset();
    }
  };

  return {
    // Form methods
    methods,
    register,
    handleSubmit: handleFormSubmit,
    control,
    errors,
    reset,
    watch,
    setValue,
    
    // State
    reminderContacts,
    availableDrivers,
    fieldsDisabled,
    isFetching,
    fetchStatus,
    uploadedDocuments,
    
    // Actions
    handleDocumentUpload,
    handleFormCancel,
    setFieldsDisabled,
    setIsFetching,
    setFetchStatus,
  };
};
