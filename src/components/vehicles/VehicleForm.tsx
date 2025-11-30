import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Vehicle, Driver } from '@/types';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes';
import { getReminderContacts, ReminderContact } from '../../utils/reminderService';
import { getDrivers } from '../../utils/api/drivers';
import { getTags, assignTagToVehicle, removeTagFromVehicle } from '../../utils/api/tags';
import { Tag as TagType } from '../../types/tags';
import { supabase } from '../../utils/supabaseClient';
import { deleteVehicleDocument, uploadVehicleDocument } from '../../utils/supabaseStorage';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import DocumentUploader from '../shared/DocumentUploader';
import CollapsibleSection from '../ui/CollapsibleSection';
import VehicleTagSelector from './VehicleTagSelector';
import { Truck, Calendar, FileText, Fuel, User, Shield, Database, MapPin, Settings, Package, Plus, Trash2, Bell, CheckCircle, AlertTriangle, Car, Hash, Palette, Weight, Users, IndianRupee, Clock, CreditCard, Tag as TagIcon, Upload, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VehicleForm');

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleFormSubmission extends Omit<Vehicle, 'id'> {}

// Helper function to get max date (10 years from today)
const getMaxDate = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() + 10);
  return today.toISOString().split('T')[0];
};

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: VehicleFormSubmission) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [reminderContacts, setReminderContacts] = useState<ReminderContact[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [fieldsDisabled, setFieldsDisabled] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string[]>>({});
  const [deletedDocuments, setDeletedDocuments] = useState<Record<string, string[]>>({});

  // Tag management state
  const [vehicleTags, setVehicleTags] = useState<TagType[]>([]);
  const [initialVehicleTags, setInitialVehicleTags] = useState<TagType[]>([]);
  
  // Draft state management for document changes
  const [draftState, setDraftState] = useState({
    isDraft: false,
    originalDocuments: {} as Record<string, string[]>,
    pendingUploads: {} as Record<string, File[]>,
    pendingDeletions: {} as Record<string, string[]>,
    pendingNewUploads: {} as Record<string, string[]>
  });

  // Staged documents state
  const [stagedDocuments, setStagedDocuments] = useState<{
    [key: string]: { files: File[], existingPaths: string[] }
  }>({});

  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<Vehicle>({
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

  // Field array for other documents
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'other_documents',
  });

  // Enable draft mode when editing existing vehicle
  useEffect(() => {
    if (initialData?.id) {
      logger.debug('📝 Enabling draft mode for vehicle:', initialData.id);
      
      setDraftState({
        isDraft: true,
        originalDocuments: {
          rc: initialData?.rc_document_url || [],
          insurance: initialData?.insurance_document_url || [],
          fitness: initialData?.fitness_document_url || [],
          tax: initialData?.tax_document_url || [],
          permit: initialData?.permit_document_url || [],
          puc: initialData?.puc_document_url || []
        },
        pendingUploads: {},
        pendingDeletions: {},
        pendingNewUploads: {}
      });
      
      setFieldsDisabled(false);
      logger.debug('✅ Draft mode enabled');
    }
  }, [initialData?.id]);

  // Register all document URL fields to ensure they're included in form data
  useEffect(() => {
    // Register all document URL fields
    register('rc_document_url');
    register('insurance_document_url');
    register('fitness_document_url');
    register('tax_document_url');
    register('permit_document_url');
    register('puc_document_url');
  }, [register]);


  // REMOVED: This was causing infinite loop because reset() changes on every render
  // The form already has defaultValues set in useForm, so this reset is redundant
  // If you need to reset the form when initialData changes, use a stable reference
  // or only depend on initialData (not reset) in the dependency array


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
        logger.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      }
    };

    fetchData();
  }, []);

  // Load existing vehicle tags when editing
  useEffect(() => {
    const loadVehicleTags = async () => {
      if (initialData?.id) {
        try {
          const { data, error } = await supabase
            .from('vehicle_tags')
            .select(`
              tags (
                id,
                name,
                slug,
                color_hex,
                description,
                active,
                created_at,
                updated_at
              )
            `)
            .eq('vehicle_id', initialData.id);

          if (error) throw error;

          const tags = (data || [])
            .map((vt: any) => vt.tags)
            .filter((tag: TagType | null): tag is TagType => tag !== null);

          setVehicleTags(tags);
          setInitialVehicleTags(tags);
          logger.debug('Loaded vehicle tags:', tags);
        } catch (error) {
          logger.error('Error loading vehicle tags:', error);
        }
      }
    };

    loadVehicleTags();
  }, [initialData?.id]);

  const handleDocumentUpload = (docType: string, filePaths: string[]) => {
    logger.debug(`📥 Document upload completed for ${docType}:`, filePaths);
    
    if (draftState.isDraft) {
      // In draft mode, COMBINE with existing files
      const fieldName = `${docType}_document_url` as keyof Vehicle;
      const currentFormValue = watch(fieldName) || [];
      
      // Combine existing + new, remove duplicates
      const combinedPaths = [...new Set([...currentFormValue, ...filePaths])];
      
      logger.debug(`✅ Combined ${docType} documents:`, {
        existing: currentFormValue,
        new: filePaths,
        combined: combinedPaths
      });
      
      // Update form value
      setValue(fieldName, combinedPaths as any);
      
      // Track in pending uploads
      setDraftState(prev => ({
        ...prev,
        pendingNewUploads: {
          ...prev.pendingNewUploads,
          [docType]: [...(prev.pendingNewUploads[docType] || []), ...filePaths]
        }
      }));
      
      logger.debug(`🔍 DRAFT MODE - Stored pending upload for ${docType}`);
    } else {
      // Original behavior for non-draft mode
      const fieldName = `${docType}_document_url` as keyof Vehicle;
      const currentFormValue = watch(fieldName) || [];
      const combinedPaths = [...new Set([...currentFormValue, ...filePaths])];
      
      setUploadedDocuments(prev => ({
        ...prev,
        [docType]: combinedPaths
      }));
      
      setValue(fieldName, combinedPaths as any);
      logger.debug(`✅ Combined ${docType} documents:`, combinedPaths);
    }
  };

  // Handle document deletion - DRAFT MODE
  const handleDocumentDelete = (docType: string, filePath: string) => {
    if (draftState.isDraft) {
      // In draft mode, mark for deletion instead of immediate deletion
      setDraftState(prev => ({
        ...prev,
        pendingDeletions: {
          ...prev.pendingDeletions,
          [docType]: [...(prev.pendingDeletions[docType] || []), filePath]
        }
      }));
      
      // Update form display (remove from form but don't delete from database yet)
      const fieldName = `${docType}_document_url` as keyof Vehicle;
      const currentFormValue = watch(fieldName) || [];
      const updatedPaths = currentFormValue.filter(path => path !== filePath);
      setValue(fieldName, updatedPaths as any);
      
      logger.debug(`🔍 DRAFT MODE - Marked for deletion: ${docType} - ${filePath}`);
    } else {
      // Original behavior for non-draft mode
      setDeletedDocuments(prev => ({
        ...prev,
        [docType]: [...(prev[docType] || []), filePath]
      }));
    }
  };

  // Handle staged document files
  const handleDocumentStaging = (docType: string, files: File[]) => {
    logger.debug(`🔍 STAGED MODE - Staging files for ${docType}:`, files);
    
    setStagedDocuments(prev => ({
      ...prev,
      [docType]: {
        files: [...(prev[docType]?.files || []), ...files],
        existingPaths: prev[docType]?.existingPaths || uploadedDocuments[docType] || []
      }
    }));
  };

  // Helper function to map fuel type
  const mapFuelType = (fuelType: string): Vehicle['fuel_type'] => {
    const fuel = (fuelType || '').toUpperCase();
    if (fuel.includes('DIESEL')) return 'diesel';
    if (fuel.includes('PETROL')) return 'petrol';
    if (fuel.includes('CNG')) return 'cng';
    return 'diesel'; // default
  };

  // Helper function for vehicle type from class
  const getVehicleTypeFromClass = (vehicleClass: string): Vehicle['type'] => {
    const classLower = (vehicleClass || '').toLowerCase();
    
    // Check for specific vehicle types based on your API's class field
    if (classLower.includes('tempo')) return 'tempo';
    if (classLower.includes('trailer')) return 'trailer';
    if (classLower.includes('truck')) return 'truck';
    
    // Check for goods vehicles
    if (classLower.includes('goods') || 
        classLower.includes('carrier') || 
        classLower.includes('lgv')) {
      return 'truck';
    }
    
    // For motorcycles/scooters, default to truck (you might want to add a bike type)
    if (classLower.includes('cycle') || classLower.includes('scooter')) {
      return 'truck'; // or add a new type for two-wheelers
    }
    
    return 'truck'; // default
  };

  // Handle fetch vehicle details from RC API
  const handleFetchDetails = async () => {
    const regNumber = watch('registration_number');

    if (!regNumber) {
      toast.error('Please enter registration number');
      return;
    }

    setIsFetching(true);
    setFetchStatus('fetching');
    setFieldsDisabled(true);

    try {
      logger.info('Fetching RC details for:', regNumber);
      
      // Use proxy server to avoid IP whitelisting issues
      // Uses environment variable if set, otherwise falls back to local proxy
      const proxyUrl = import.meta.env.VITE_RC_PROXY_URL || 'http://localhost:3001/api/fetch-rc-details';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_number: regNumber
        }),
      });
      
      const result = await response.json();
      const error = !response.ok ? { message: result.message || 'Failed to fetch' } : null;

      logger.debug('Supabase function response:', { result, error });

      if (error) {
        logger.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to fetch details');
      }

      if (!result?.success) {
        logger.error('API returned unsuccessful response:', result);
        // Don't fill any data if API fails
        toast.error(result?.message || 'Failed to fetch vehicle details. Please enter details manually.');
        setFieldsDisabled(false);
        setFetchStatus('error');
        setIsFetching(false);
        return; // Exit early without filling any data
      }

      // Extract the RC data - your API returns it in response field
      const rcData = result.data?.response || result.response || {};
      
      logger.debug('RC Data received:', rcData);
      logger.info('Available fields:', Object.keys(rcData).join(', '));
      
      // Helper function to check if date is valid (not 1900-01-01 placeholder)
      const isValidDate = (dateStr: string | undefined): boolean => {
        return dateStr !== undefined && dateStr !== '1900-01-01' && dateStr !== '';
      };
      
      // Helper function to calculate start date from expiry date (364 days before)
      const calculateStartDate = (expiryDate: string | undefined): string | undefined => {
        if (!expiryDate || !isValidDate(expiryDate)) return undefined;
        try {
          const expiry = new Date(expiryDate);
          if (isNaN(expiry.getTime())) return undefined;
          
          const start = new Date(expiry);
          start.setDate(start.getDate() - 364);
          return start.toISOString().split('T')[0];
        } catch {
          return undefined;
        }
      };

      // Map RC API response to form fields using CORRECT field names
      const mappedData: Partial<Vehicle> = {
        registration_number: regNumber.toUpperCase(),
        
        // Basic Information - Using correct field names!
        make: rcData.brand_name || '',  // ✅ CORRECT: brand_name
        model: rcData.brand_model || '', // ✅ CORRECT: brand_model
        year: parseInt(rcData.vehicle_age ? (new Date().getFullYear() - rcData.vehicle_age).toString() : new Date().getFullYear().toString()),
        fuel_type: mapFuelType(rcData.fuel_type || 'diesel'),
        type: getVehicleTypeFromClass(rcData.class || ''),
        
        // Technical Details
        chassis_number: rcData.chassis_number || '',
        engine_number: rcData.engine_number || '',
        vehicle_class: rcData.class || '',
        color: rcData.color || '',
        cubic_capacity: parseFloat(rcData.cubic_capacity) || undefined,
        cylinders: parseInt(rcData.cylinders) || undefined,
        unladen_weight: parseFloat(rcData.unladen_weight) || undefined,
        gvw: parseFloat(rcData.gross_weight) || undefined, // Map gross_weight to GVW
        seating_capacity: parseInt(rcData.seating_capacity) || undefined,
        emission_norms: rcData.norms || '',
        tyre_size: rcData.tyre_size || '', // Add tyre size mapping
        number_of_tyres: parseInt(rcData.number_of_tyres) || undefined, // Add number of tyres
        
        // Registration & Ownership
        owner_name: rcData.owner_name || '',
        father_name: rcData.father_name || '', // Add father's name
        registration_date: isValidDate(rcData.registration_date) ? rcData.registration_date : undefined,
        rc_status: rcData.rc_status || '',
        financer: rcData.financer || '',
        noc_details: rcData.noc_details || '',
        
        // Insurance Details
        insurance_policy_number: rcData.insurance_policy || '',
        insurer_name: rcData.insurance_company || '',
        insurance_expiry_date: isValidDate(rcData.insurance_expiry) ? rcData.insurance_expiry : undefined,
        insurance_start_date: isValidDate(rcData.insurance_expiry) ? calculateStartDate(rcData.insurance_expiry) : undefined,
        
        // Tax Details - Handle LTT (Lifetime Tax)
        tax_paid_upto: rcData.tax_paid_upto === 'LTT' ? '2099-12-31' : (isValidDate(rcData.tax_upto) ? rcData.tax_upto : undefined),
        
        // Permit Details
        permit_number: rcData.permit_number || '',
        permit_type: rcData.permit_type || '',
        permit_issue_date: isValidDate(rcData.permit_issue_date) ? rcData.permit_issue_date : undefined,
        permit_expiry_date: isValidDate(rcData.permit_valid_upto) ? rcData.permit_valid_upto : undefined,
        national_permit_number: rcData.national_permit_number || '',
        national_permit_upto: isValidDate(rcData.national_permit_upto) ? rcData.national_permit_upto : undefined,
        
        // Fitness Certificate
        fitness_expiry_date: isValidDate(rcData.fitness_upto) ? rcData.fitness_upto : undefined,
        fitness_issue_date: isValidDate(rcData.fitness_valid_from) ? rcData.fitness_valid_from : undefined,
        
        // PUC Details
        puc_certificate_number: rcData.pucc_number || '',
        puc_expiry_date: isValidDate(rcData.pucc_upto) ? rcData.pucc_upto : undefined,
        puc_issue_date: isValidDate(rcData.pucc_upto) ? calculateStartDate(rcData.pucc_upto) : undefined,
        
        // Additional RC API fields (100% utilization - capturing ALL data!)
        blacklist_status: rcData.blacklist_status || '', // Critical for compliance
        owner_count: rcData.owner_count || '',
        present_address: rcData.present_address || '',
        permanent_address: rcData.permanent_address || '',
        rto_name: rcData.rto_name || '',
        body_type: rcData.body_type || '',
        manufacturing_date: rcData.manufacturing_date || rcData.manufacturing_date_formatted || '',
        wheelbase: rcData.wheelbase || '',
        sleeper_capacity: rcData.sleeper_capacity ? parseInt(rcData.sleeper_capacity) : undefined,
        standing_capacity: rcData.standing_capacity ? parseInt(rcData.standing_capacity) : undefined,
        
        // Metadata
        vahan_last_fetched_at: new Date().toISOString(),
      };

      // Log the mapped data
      logger.debug('Mapped data:', mappedData);

      // Update form with fetched data - only set if value exists
      Object.entries(mappedData).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          setValue(key as keyof Vehicle, value as any);
        }
      });

      // Special handling for LTT (Lifetime Tax)
      if (rcData.tax_paid_upto === 'LTT') {
        toast.info('This vehicle has Lifetime Tax (LTT) paid');
      }

      setFieldsDisabled(false);
      setFetchStatus('success');
      
      // Success message based on data source
      if (result.dataSource === 'api') {
        toast.success('Vehicle details fetched successfully! Please verify and complete the form.');
      } else {
        toast.info('Details loaded. Please verify all information.');
      }
      
    } catch (err: any) {
      logger.error('RC fetch error:', err);
      toast.error(err.message || 'Failed to fetch vehicle details. Please enter details manually.');
      setFieldsDisabled(false);
      setFetchStatus('error');
    } finally {
      setIsFetching(false);
    }
  };


  const handleCancel = () => {
    logger.debug('🔄 Canceling form - resetting draft state');
    
    // Reset draft state completely
    setDraftState({
      isDraft: false,
      originalDocuments: {},
      pendingUploads: {},
      pendingDeletions: {},
      pendingNewUploads: {}
    });

    // Clear staged documents
    if (Object.keys(stagedDocuments).length > 0) {
      logger.debug('🔍 STAGED MODE - Clearing staged files');
      setStagedDocuments({});
      setUploadProgress({});
    }
    
    // Reset form to initial values (this is the key fix)
    reset(initialData);

    // Reset tag state to initial values
    setVehicleTags(initialVehicleTags);

    // Reset uploaded documents
    setUploadedDocuments({});
    
    // Call the parent's cancel handler
    if (onCancel) {
      onCancel();
    }
  };


  const onFormSubmit = async (data: Vehicle) => {
    try {
      logger.debug('🚀 Form submission started');
      logger.debug('📊 Initial data:', data);
      logger.debug('📦 Staged documents:', stagedDocuments);
      logger.debug('🗑️ Draft deletions:', draftState.pendingDeletions);
      
      // ========================================
      // STEP 1: Upload all staged files
      // ========================================
      if (Object.keys(stagedDocuments).length > 0) {
        logger.debug('📤 Uploading staged files for:', Object.keys(stagedDocuments));
        
        const uploadPromises = Object.entries(stagedDocuments).map(async ([docType, { files, existingPaths }]) => {
          logger.debug(`📂 Processing ${docType}: ${files.length} new files, ${existingPaths.length} existing`);
          const uploadedPaths = [];
          
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
              logger.debug(`⬆️ Uploading ${docType} file ${i + 1}/${files.length}: ${file.name}`);
              
              const path = await uploadVehicleDocument(
                file, 
                data.id || initialData?.id || '', 
                docType, 
                (progress) => {
                  setUploadProgress(prev => ({ 
                    ...prev, 
                    [docType]: Math.round((i / files.length) * 100 + progress / files.length)
                  }));
                }
              );
              
              uploadedPaths.push(path);
              logger.debug(`✅ Uploaded ${docType} [${i + 1}/${files.length}]:`, path);
              
            } catch (error) {
              logger.error(`❌ Failed to upload ${docType} file: ${file.name}`, error);
              toast.error(`Failed to upload ${file.name}`);
              throw error;
            }
          }
          
          // Combine existing paths with newly uploaded paths
          const allPaths = [...existingPaths, ...uploadedPaths];
          logger.debug(`✅ ${docType} total paths after upload:`, allPaths);
          
          return { docType, paths: allPaths };
        });

        // Wait for all uploads to complete
        const uploadResults = await Promise.all(uploadPromises);
        
        // Update data object with all uploaded file paths
        uploadResults.forEach(({ docType, paths }) => {
          const fieldName = `${docType}_document_url` as keyof Vehicle;
          data[fieldName] = paths as any;
          logger.debug(`✅ Updated ${fieldName}:`, paths);
        });
        
        logger.debug('✅ All staged files uploaded successfully');
      } else {
        logger.debug('ℹ️ No staged files to upload');
      }

      // ========================================
      // STEP 2: Handle draft mode deletions
      // ========================================
      if (draftState.isDraft && Object.keys(draftState.pendingDeletions).length > 0) {
        logger.debug('🗑️ Processing draft deletions:', draftState.pendingDeletions);
        
        // Delete files from storage
        for (const [docType, deletedPaths] of Object.entries(draftState.pendingDeletions)) {
          logger.debug(`🗑️ Deleting ${deletedPaths.length} ${docType} file(s)`);
          
          for (const filePath of deletedPaths) {
            try {
              logger.debug(`🗑️ Deleting from storage: ${filePath}`);
              await deleteVehicleDocument(filePath);
              logger.debug(`✅ Deleted from storage: ${filePath}`);
            } catch (error) {
              logger.error(`❌ Failed to delete ${filePath}:`, error);
              // Continue with other deletions even if one fails
            }
          }
        }
        
        // CRITICAL: Clean the document arrays to remove deleted file paths
        const docTypes = ['rc', 'insurance', 'fitness', 'tax', 'permit', 'puc'];
        
        logger.debug('🧹 Cleaning document arrays after deletions');
        
        for (const docType of docTypes) {
          const fieldName = `${docType}_document_url` as keyof Vehicle;
          const currentPaths = (data[fieldName] as string[]) || [];
          const deletedPaths = draftState.pendingDeletions[docType] || [];
          
          if (deletedPaths.length > 0) {
            // Filter out paths that were deleted
            const remainingPaths = currentPaths.filter(path => !deletedPaths.includes(path));
            data[fieldName] = remainingPaths as any;
            
            logger.debug(`✅ Cleaned ${docType}: ${currentPaths.length} → ${remainingPaths.length} files`);
            logger.debug(`   Removed: ${deletedPaths.length} file(s)`);
          }
        }
        
        logger.debug('✅ All deletions processed');
      }

      // ========================================
      // STEP 3: Handle non-draft deletions
      // ========================================
      if (!draftState.isDraft && Object.keys(deletedDocuments).length > 0) {
        logger.debug('🗑️ Processing non-draft deletions:', deletedDocuments);
        
        for (const [docType, deletedPaths] of Object.entries(deletedDocuments)) {
          for (const filePath of deletedPaths) {
            try {
              logger.debug(`🗑️ Deleting: ${filePath}`);
              await deleteVehicleDocument(filePath);
              logger.debug(`✅ Deleted: ${filePath}`);
            } catch (error) {
              logger.error(`❌ Failed to delete ${filePath}:`, error);
            }
          }
        }
        
        // Clean arrays for non-draft mode too
        const docTypes = ['rc', 'insurance', 'fitness', 'tax', 'permit', 'puc'];
        
        for (const docType of docTypes) {
          const fieldName = `${docType}_document_url` as keyof Vehicle;
          const currentPaths = (data[fieldName] as string[]) || [];
          const deletedPaths = deletedDocuments[docType] || [];
          
          if (deletedPaths.length > 0) {
            const remainingPaths = currentPaths.filter(path => !deletedPaths.includes(path));
            data[fieldName] = remainingPaths as any;
          }
        }
      }

      // ========================================
      // STEP 4: Ensure all document fields are arrays
      // ========================================
      logger.debug('🔍 Ensuring document fields are properly formatted');
      
      const finalData = {
        ...data,
        rc_document_url: Array.isArray(data.rc_document_url) ? data.rc_document_url : (data.rc_document_url ? [data.rc_document_url] : []),
        insurance_document_url: Array.isArray(data.insurance_document_url) ? data.insurance_document_url : (data.insurance_document_url ? [data.insurance_document_url] : []),
        fitness_document_url: Array.isArray(data.fitness_document_url) ? data.fitness_document_url : (data.fitness_document_url ? [data.fitness_document_url] : []),
        tax_document_url: Array.isArray(data.tax_document_url) ? data.tax_document_url : (data.tax_document_url ? [data.tax_document_url] : []),
        permit_document_url: Array.isArray(data.permit_document_url) ? data.permit_document_url : (data.permit_document_url ? [data.permit_document_url] : []),
        puc_document_url: Array.isArray(data.puc_document_url) ? data.puc_document_url : (data.puc_document_url ? [data.puc_document_url] : []),
      };

      logger.debug('📊 Final document counts:', {
        rc: finalData.rc_document_url?.length || 0,
        insurance: finalData.insurance_document_url?.length || 0,
        fitness: finalData.fitness_document_url?.length || 0,
        tax: finalData.tax_document_url?.length || 0,
        permit: finalData.permit_document_url?.length || 0,
        puc: finalData.puc_document_url?.length || 0,
      });

      // ========================================
      // STEP 5: Submit to parent component
      // ========================================
      logger.debug('📤 Submitting to parent component');
      await onSubmit(finalData);

      // ========================================
      // STEP 5.5: Handle tag assignments after vehicle creation/update
      // ========================================
      if (data.id || initialData?.id) {
        const vehicleId = data.id || initialData?.id || '';
        logger.debug('🏷️ Managing vehicle tags for vehicle:', vehicleId);

        // Determine which tags to add and remove
        const initialTagIds = new Set(initialVehicleTags.map(t => t.id));
        const currentTagIds = new Set(vehicleTags.map(t => t.id));

        const tagsToAdd = vehicleTags.filter(t => !initialTagIds.has(t.id));
        const tagsToRemove = initialVehicleTags.filter(t => !currentTagIds.has(t.id));

        // Remove tags
        for (const tag of tagsToRemove) {
          try {
            await removeTagFromVehicle(vehicleId, tag.id);
            logger.debug(`✅ Removed tag: ${tag.name}`);
          } catch (error) {
            logger.error(`❌ Failed to remove tag ${tag.name}:`, error);
          }
        }

        // Add tags
        for (const tag of tagsToAdd) {
          try {
            await assignTagToVehicle(vehicleId, tag.id);
            logger.debug(`✅ Assigned tag: ${tag.name}`);
          } catch (error) {
            logger.error(`❌ Failed to assign tag ${tag.name}:`, error);
          }
        }

        // Update initial tags to current state
        setInitialVehicleTags([...vehicleTags]);
      }

      // ========================================
      // STEP 6: Cleanup state after successful submission
      // ========================================
      logger.debug('🧹 Cleaning up component state');
      
      setStagedDocuments({});
      setUploadProgress({});
      setDeletedDocuments({});
      setDraftState({
        isDraft: false,
        originalDocuments: {},
        pendingUploads: {},
        pendingDeletions: {},
        pendingNewUploads: {}
      });
      
      logger.debug('✅ Form submission completed successfully!');
      toast.success('Vehicle updated successfully!');
      
    } catch (error) {
      logger.error('❌ Form submission failed:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast.error(`Failed to update vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* RC Fetch Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700 mb-6">
        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium mb-3">
          Fetch Vehicle Info from RC Details
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-3/5">
            <Input
              label="Registration Number"
              placeholder="CG04AB1234"
              icon={<Truck className="h-4 w-4" />}
              hideIconWhenFocused={true}
              error={errors.registration_number?.message}
              required
              disabled={isFetching || isSubmitting}
              {...register('registration_number', {
                required: 'Registration number is required',
                pattern: {
                  value: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{1,4}$/i,
                  message: 'Invalid registration number format'
                }
              })}
            />
          </div>
          <div className="w-full md:w-2/5 pt-2">
            <Button
              type="button"
              disabled={isFetching || isSubmitting || !watch('registration_number')}
              isLoading={isFetching}
              className="w-full"
              onClick={handleFetchDetails}
            >
              {isFetching ? 'Fetching...' : 'Fetch RC Details'}
            </Button>
            {fetchStatus === 'success' && (
              <div className="text-center mt-1">
                <span className="text-xs text-success-600 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Details fetched!
                </span>
              </div>
            )}
            {fetchStatus === 'error' && (
              <div className="text-center mt-1">
                <span className="text-xs text-error-600 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Enter manually
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <CollapsibleSection
        title="Basic Information"
        icon={<Truck className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Make"
            icon={<Truck className="h-4 w-4" />}
            hideIconWhenFocused={true}
            error={errors.make?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register('make', { required: 'Make is required' })}
          />

          <Input
            label="Model"
            icon={<Car className="h-4 w-4" />}
            hideIconWhenFocused={true}
            error={errors.model?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register('model', { required: 'Model is required' })}
          />

          <Input
            label="Year"
            type="number"
            icon={<Calendar className="h-4 w-4" />}
            hideIconWhenFocused={true}
            error={errors.year?.message}
            required
            disabled={fieldsDisabled || isSubmitting}
            {...register('year', {
              required: 'Year is required',
              valueAsNumber: true,
              min: { value: 1900, message: 'Invalid year' },
              max: { value: new Date().getFullYear() + 1, message: 'Invalid year' }
            })}
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
                  { value: 'tempo', label: 'Tempo' },
                  { value: 'trailer', label: 'Trailer' }
                ]}
                error={errors.type?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
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
                  { value: 'cng', label: 'CNG' }
                ]}
                error={errors.fuel_type?.message}
                required
                disabled={fieldsDisabled || isSubmitting}
                {...field}
              />
            )}
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
                  { value: 'stood', label: 'Stood' },
                  { value: 'archived', label: 'Archived' }
                ]}
                error={errors.status?.message}
                required
                disabled={isSubmitting}
                {...field}
              />
            )}
          />

          <Input
            label="Current Odometer (km)"
            type="number"
            icon={<MapPin className="h-4 w-4" />}
            hideIconWhenFocused={true}
            error={errors.current_odometer?.message}
            required
            disabled={isSubmitting}
            {...register('current_odometer', {
              required: 'Current odometer is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Odometer must be positive' }
            })}
          />

          <Controller
            name="primary_driver_id"
            control={control}
            render={({ field }) => (
              <Select
                label="Primary Driver"
                options={[
                  { value: '', label: 'Select driver' },
                  ...availableDrivers.map(driver => ({
                    value: driver.id,
                    label: `${driver.name} - ${driver.license_number}`
                  }))
                ]}
                icon={<User className="h-4 w-4" />}
                error={errors.primary_driver_id?.message}
                disabled={isSubmitting}
                {...field}
              />
            )}
          />
        </div>

        {/* Vehicle Tags Section */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <TagIcon className="h-4 w-4" />
            Vehicle Tags
          </label>
          <VehicleTagSelector
            selectedTags={vehicleTags}
            onTagsChange={setVehicleTags}
            disabled={isSubmitting}
            placeholder="Select tags to categorize this vehicle..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Tags help you categorize and compare vehicles with similar characteristics
          </p>
        </div>
      </CollapsibleSection>


      {/* Technical Details */}
      <CollapsibleSection
        title="Technical Details"
        icon={<Database className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Chassis Number"
            icon={<Hash className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('chassis_number')}
          />

          <Input
            label="Engine Number"
            icon={<Hash className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('engine_number')}
          />

          <Input
            label="Vehicle Class"
            icon={<Car className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('vehicle_class')}
          />

          <Input
            label="Color"
            icon={<Palette className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('color')}
          />

          <Input
            label="Cubic Capacity (cc)"
            type="number"
            icon={<Database className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('cubic_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Number of Cylinders"
            type="number"
            icon={<Database className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('cylinders', { valueAsNumber: true })}
          />

          <Input
            label="Unladen Weight (kg)"
            type="number"
            icon={<Weight className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('unladen_weight', { valueAsNumber: true })}
          />

          <Input
            label="Gross Vehicle Weight (GVW) (kg)"
            type="number"
            placeholder="Enter GVW in kg"
            icon={<Weight className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('gvw', { valueAsNumber: true })}
          />

          <Input
            label="Gross Brake Weight (GBW) (kg)"
            type="number"
            placeholder="Enter GBW in kg"
            icon={<Weight className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('gbw', { valueAsNumber: true })}
          />

          <Input
            label="Seating Capacity"
            type="number"
            icon={<Users className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('seating_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Emission Norms"
            icon={<Database className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('emission_norms')}
          />

          <Input
            label="Tyre Size"
            placeholder="e.g., 295/80 R22.5"
            icon={<Settings className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={isSubmitting}
            {...register('tyre_size')}
          />

          <Input
            label="Number of Tyres"
            type="number"
            icon={<Settings className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={isSubmitting}
            {...register('number_of_tyres', { valueAsNumber: true })}
          />

          <Input
            label="Body Type"
            icon={<Truck className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            placeholder="e.g., Closed Body, Open Body"
            {...register('body_type')}
          />

          <Input
            label="Manufacturing Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('manufacturing_date')}
          />

          <Input
            label="Wheelbase"
            icon={<Settings className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            placeholder="e.g., 3350 mm"
            {...register('wheelbase')}
          />

          <Input
            label="Sleeper Capacity"
            type="number"
            icon={<Truck className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            placeholder="Number of sleeper berths"
            {...register('sleeper_capacity', { valueAsNumber: true })}
          />

          <Input
            label="Standing Capacity"
            type="number"
            icon={<User className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            placeholder="Standing passenger capacity"
            {...register('standing_capacity', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Registration & Ownership */}
      <CollapsibleSection
        title="Registration & Ownership"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Owner Name"
            icon={<User className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('owner_name')}
          />

          <Input
            label="Father's Name"
            icon={<User className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('father_name')}
          />

          <Input
            label="Registration Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('registration_date')}
          />

          <Input
            label="RC Status"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('rc_status')}
          />

          <Input
            label="RC Expiry Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('rc_expiry_date')}
          />

          <Input
            label="Financer"
            icon={<CreditCard className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('financer')}
          />

          <Input
            label="NOC Details"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('noc_details')}
          />

          <Input
            label="Owner Count"
            icon={<User className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            placeholder="e.g., 1 (First Owner)"
            {...register('owner_count')}
          />

          <Input
            label="RTO Office Name"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            placeholder="e.g., RAIPUR RTO"
            {...register('rto_name')}
          />

          <Input
            label="Owner Present Address"
            icon={<MapPin className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('present_address')}
          />

          <Input
            label="Owner Permanent Address"
            icon={<MapPin className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permanent_address')}
          />

          {/* Blacklist Status Warning */}
          {watch('blacklist_status') && watch('blacklist_status') !== 'NA' && watch('blacklist_status') !== '' && (
            <div className="col-span-2 bg-red-50 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-700">
                  ⚠️ Blacklist Status: {watch('blacklist_status')}
                </span>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Insurance Details */}
      <CollapsibleSection
        title="Insurance"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-blue-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Policy Number"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_policy_number')}
          />

          <Input
            label="Insurer Name"
            icon={<Shield className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurer_name')}
          />

          <Input
            label="Start Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_start_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_expiry_date')}
          />

          <Input
            label="Premium Amount"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_premium_amount', { valueAsNumber: true })}
          />

          <Input
            label="IDV Amount"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('insurance_idv', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Fitness Certificate */}
      <CollapsibleSection
        title="Fitness Certificate"
        icon={<Shield className="h-5 w-5" />}
        iconColor="text-yellow-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Certificate Number"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_expiry_date')}
          />

          <Input
            label="Cost"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('fitness_cost', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Tax Details */}
      <CollapsibleSection
        title="Tax"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-indigo-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Receipt Number"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_receipt_number')}
          />

          <Input
            label="Amount"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_amount', { valueAsNumber: true })}
          />

          <Input
            label="Period"
            icon={<Calendar className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_period')}
          />

          <Input
            label="Paid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('tax_paid_upto')}
          />
        </div>
      </CollapsibleSection>

      {/* Permit Details */}
      <CollapsibleSection
        title="Permit"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-orange-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Permit Number"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_number')}
          />

          <Input
            label="Issuing State"
            icon={<MapPin className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_issuing_state')}
          />

          <Input
            label="Permit Type"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_type')}
          />

          <Input
            label="Issue Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_expiry_date')}
          />

          <Input
            label="Cost"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('permit_cost', { valueAsNumber: true })}
          />

          <Input
            label="National Permit Number"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('national_permit_number')}
          />

          <Input
            label="National Permit Valid Upto"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('national_permit_upto')}
          />
        </div>
      </CollapsibleSection>

      {/* PUC Details */}
      <CollapsibleSection
        title="Pollution Certificate (PUC)"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-green-600"
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Certificate Number"
            icon={<FileText className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_certificate_number')}
          />

          <Input
            label="Issue Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_issue_date')}
          />

          <Input
            label="Expiry Date"
            type="date"
            max={getMaxDate()}
            icon={<Calendar className="h-4 w-4" />}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_expiry_date')}
          />

          <Input
            label="Cost"
            type="number"
            icon={<IndianRupee className="h-4 w-4" />}
            hideIconWhenFocused={true}
            disabled={fieldsDisabled || isSubmitting}
            {...register('puc_cost', { valueAsNumber: true })}
          />
        </div>
      </CollapsibleSection>

      {/* Document Uploads */}
      <CollapsibleSection
        title="Document Uploads"
        icon={<FileText className="h-5 w-5" />}
        iconColor="text-red-600"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DocumentUploader
            label="RC Document"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="rc"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('rc', paths)}
            onFileDelete={(path) => handleDocumentDelete('rc', path)}
            initialFilePaths={initialData?.rc_document_url || []}
            helperText="Upload RC copy"
            uploadMode="staged"
            onStagedFiles={(files) => handleDocumentStaging('rc', files)}
          />

          <DocumentUploader
            label="Insurance Document"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="insurance"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('insurance', paths)}
            onFileDelete={(path) => handleDocumentDelete('insurance', path)}
            initialFilePaths={initialData?.insurance_document_url || []}
            helperText="Upload insurance policy"
            uploadMode="staged"
            onStagedFiles={(files) => handleDocumentStaging('insurance', files)}
          />

          <DocumentUploader
            label="Fitness Certificate"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="fitness"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('fitness', paths)}
            onFileDelete={(path) => handleDocumentDelete('fitness', path)}
            initialFilePaths={initialData?.fitness_document_url || []}
            helperText="Upload fitness certificate"
            uploadMode="staged"
            onStagedFiles={(files) => handleDocumentStaging('fitness', files)}
          />

          <DocumentUploader
            label="Tax Receipt"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="tax"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('tax', paths)}
            onFileDelete={(path) => handleDocumentDelete('tax', path)}
            initialFilePaths={initialData?.tax_document_url || []}
            helperText="Upload tax receipt"
            uploadMode="staged"
            onStagedFiles={(files) => handleDocumentStaging('tax', files)}
          />

          <DocumentUploader
            label="Permit Document"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="permit"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('permit', paths)}
            onFileDelete={(path) => handleDocumentDelete('permit', path)}
            initialFilePaths={initialData?.permit_document_url || []}
            helperText="Upload permit document"
            uploadMode="staged"
            onStagedFiles={(files) => handleDocumentStaging('permit', files)}
          />

          <DocumentUploader
            label="PUC Certificate"
            bucketType="vehicle"
            entityId={initialData?.id || 'temp'}
            docType="puc"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            onUploadComplete={(paths) => handleDocumentUpload('puc', paths)}
            onFileDelete={(path) => handleDocumentDelete('puc', path)}
            initialFilePaths={initialData?.puc_document_url || []}
            helperText="Upload PUC certificate"
            uploadMode="staged"
            onStagedFiles={(files) => handleDocumentStaging('puc', files)}
          />
        </div>
      </CollapsibleSection>

      {/* Reminders Configuration */}
      <CollapsibleSection
        title="Reminder Settings"
        icon={<Bell className="h-5 w-5" />}
        iconColor="text-purple-600"
        defaultExpanded={false}
      >
        <div className="space-y-6">
          {/* Insurance Reminder */}
          <div className="border-l-4 border-blue-500 pl-4">
            <Controller
              name="remind_insurance"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Insurance Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_insurance') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="insurance_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('insurance_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Fitness Reminder */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <Controller
              name="remind_fitness"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Fitness Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_fitness') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="fitness_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('fitness_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Tax Reminder */}
          <div className="border-l-4 border-indigo-500 pl-4">
            <Controller
              name="remind_tax"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Tax Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_tax') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="tax_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('tax_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Permit Reminder */}
          <div className="border-l-4 border-orange-500 pl-4">
            <Controller
              name="remind_permit"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Permit Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_permit') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="permit_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('permit_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* PUC Reminder */}
          <div className="border-l-4 border-green-500 pl-4">
            <Controller
              name="remind_puc"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable PUC Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_puc') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Controller
                  name="puc_reminder_contact_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Contact Person"
                      options={[
                        { value: '', label: 'Select contact' },
                        ...reminderContacts.map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                      ]}
                      {...field}
                    />
                  )}
                />
                <Input
                  label="Days Before Expiry"
                  type="number"
                  {...register('puc_reminder_days_before', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Service Reminder */}
          <div className="border-l-4 border-purple-500 pl-4">
            <Controller
              name="remind_service"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Enable Service Reminder"
                  {...field}
                  checked={field.value}
                />
              )}
            />
            {watch('remind_service') && (
              <div className="space-y-4 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="service_reminder_contact_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Contact Person"
                        options={[
                          { value: '', label: 'Select contact' },
                          ...reminderContacts.map(contact => ({
                            value: contact.id,
                            label: contact.full_name
                          }))
                        ]}
                        {...field}
                      />
                    )}
                  />
                  <Input
                    label="Days Before Service"
                    type="number"
                    {...register('service_reminder_days_before', { valueAsNumber: true })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Service Interval (km)"
                    type="number"
                    {...register('service_interval_km', { valueAsNumber: true })}
                  />
                  <Input
                    label="Service Interval (days)"
                    type="number"
                    {...register('service_interval_days', { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={fieldsDisabled && !initialData?.id}
          icon={isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : undefined}
        >
          {isSubmitting 
            ? (initialData?.id ? 'Updating Vehicle...' : 'Adding Vehicle...') 
            : (initialData?.id ? 'Update Vehicle' : 'Add Vehicle')
          }
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;
