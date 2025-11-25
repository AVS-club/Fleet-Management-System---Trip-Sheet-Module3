import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MaintenanceTaskForm from "../components/maintenance/MaintenanceTaskForm";
import { Vehicle } from "@/types";
import { MaintenanceTask } from "@/types/maintenance";
import {
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../utils/maintenanceStorage";
import { getVehicles } from "../utils/storage";
import Button from "../components/ui/Button";
import { ChevronLeft, Trash2, Edit, Wrench, Camera, FileText, Clock, Truck, Calendar, IndianRupee, Share2, Copy, CheckCircle, AlertTriangle, Shield, ExternalLink, Eye, Download, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";
import { uploadFilesAndGetPublicUrls } from "@/utils/supabaseStorage";
import { processAllServiceGroupFiles, FileUploadCallback } from "@/utils/maintenanceFileUpload";
import "../styles/maintenanceFormUpdates.css";
import { createLogger } from '../utils/logger';
import SaveDiagnosticsModal, { SaveOperation, OperationStatus } from '../components/maintenance/SaveDiagnosticsModal';
import { convertServiceGroupsToDatabase } from '../components/maintenance/ServiceGroupsSection';
import { getVendors, Vendor } from '../utils/vendorStorage';
import { getMaintenanceTasksCatalog } from '../utils/maintenanceCatalog';
import { format, parseISO } from 'date-fns';
import { supabase } from '../utils/supabaseClient';
import { getWarrantyStatus, formatWarrantyExpiryDate } from '../utils/warrantyCalculations';
import { useQueryClient } from "@tanstack/react-query";
import { getAccessibleUrls } from '../utils/storageUrlHelper';

const logger = createLogger('MaintenanceTaskPage');

// Helper function to extract filename from URL
const getFilenameFromUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return 'Document';
  try {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    // Decode URL encoding and remove query params
    return decodeURIComponent(filename.split('?')[0]);
  } catch {
    return 'Document';
  }
};

// Helper function to detect if URL is a PDF
const isPdfUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf');
};

// Define a more specific type for the data coming from MaintenanceTaskForm
interface MaintenanceFormData {
  // Basic fields
  vehicle_id?: string;
  task_type?:
    | "general_scheduled_service"
    | "wear_and_tear_replacement_repairs"
    | "accidental"
    | "others";
  title?: string[];
  description?: string;
  status?: "open" | "in_progress" | "resolved" | "escalated" | "rework";
  priority?: "low" | "medium" | "high" | "critical";
  garage_id?: string;
  category?: string;

  // Service groups
  service_groups?: Array<{
    id?: string;
    maintenance_task_id?: string;
    serviceType: 'purchase' | 'labor' | 'both' | '';
    vendor: string;
    tasks: string[];
    cost: number;
    notes?: string;
    bills?: File[];

    // Parts tracking
    partsData?: Array<{
      partType: string;
      partName: string;
      brand: string;
      serialNumber?: string;
      quantity: number;
      warrantyPeriod?: string;
      warrantyDocument?: File;
    }>;
  }>;

  // Other fields
  complaint_description?: string;
  resolution_summary?: string;
  warranty_expiry?: string;
  warranty_status?: "valid" | "expired" | "not_applicable";
  warranty_claimed?: boolean;

  start_date?: string;
  end_date?: string;
  downtime_period?: string;
  downtime_days?: number;
  odometer_reading?: number;

  next_service_due?: {
    date?: string;
    odometer?: number;
    reminder_set?: boolean;
  };

  attachments?: File[] | string[];
  notes?: string;
}

const MaintenanceTaskPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const locationState = (location.state as { task?: MaintenanceTask; mode?: string } | undefined) || {};
  const [task, setTask] = useState<MaintenanceTask | null>(locationState.task || null);
  const [transformedFormData, setTransformedFormData] = useState<any>(undefined);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveOperations, setSaveOperations] = useState<SaveOperation[]>([]);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [vendorsMap, setVendorsMap] = useState<Map<string, string>>(new Map());
  const [tasksMap, setTasksMap] = useState<Map<string, string>>(new Map());
  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode');
  const isViewMode = (modeParam || (locationState.mode ?? undefined)) === 'view';
  const [linkCopied, setLinkCopied] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{
    id: string;
    image_url: string;
    uploaded_at: string;
    uploaded_by: string | null;
  }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Load vehicles regardless of whether we're creating or editing
        const vehiclesData = await getVehicles();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

        // Load vendors and tasks catalog for display (UUID → Name conversion)
        const [vendorsData, catalogData] = await Promise.all([
          getVendors(),
          getMaintenanceTasksCatalog()
        ]);

        // Create vendor ID → vendor name map
        const vendorMap = new Map<string, string>();
        vendorsData.forEach(vendor => {
          vendorMap.set(vendor.id, vendor.vendor_name);
        });
        setVendorsMap(vendorMap);

        // Create task ID → task name map
        const taskMap = new Map<string, string>();
        catalogData.forEach(task => {
          taskMap.set(task.id, task.task_name);
        });
        setTasksMap(taskMap);

        // If we're editing an existing task, load it
        if (id && id !== "new") {
          const taskData = await getTask(id);
          if (taskData) {
            setTask(taskData);
            // Transform the task data for the form (including converting URLs)
            // Pass the maps directly to avoid stale closure values
            const transformed = await transformDatabaseToFormData(taskData, vendorMap, taskMap);
            setTransformedFormData(transformed);
          } else {
            navigate("/maintenance");
          }
        }
      } catch (error) {
        logger.error("Error loading maintenance task data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Fetch uploaded field photos in view mode
  useEffect(() => {
    const fetchUploadedPhotos = async () => {
      if (!id || id === 'new' || !isViewMode) return;

      try {
        const { data, error } = await supabase
          .from('maintenance_task_uploads')
          .select('id, image_url, uploaded_at, uploaded_by')
          .eq('maintenance_task_id', id)
          .order('uploaded_at', { ascending: false });

        if (error) {
          logger.error('Error fetching uploaded photos:', error);
        } else {
          setUploadedPhotos(data || []);
        }
      } catch (error) {
        logger.error('Failed to fetch uploaded photos:', error);
      }
    };

    fetchUploadedPhotos();

    // Poll for new uploads every 30 seconds when in view mode
    const interval = isViewMode ? setInterval(fetchUploadedPhotos, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, isViewMode]);

  // Transform database format to form format for editing
  const transformDatabaseToFormData = async (
    dbTask: MaintenanceTask, 
    vendorMap: Map<string, string>, 
    taskMap: Map<string, string>
  ) => {
    try {
      logger.debug('🔄 Transforming database task to form format:', dbTask);

      // Extract time from datetime strings
      const extractTime = (dateTimeString: string | undefined): string => {
        if (!dateTimeString) return '09:00';
        try {
          const date = parseISO(dateTimeString);
          return format(date, 'HH:mm');
        } catch {
          return '09:00';
        }
      };

      // Transform service groups from database format to form format
      const transformedServiceGroups = await Promise.all((dbTask.service_groups || []).map(async (group: any, index: number) => {
        // Transform tasks from UUIDs to names using the passed taskMap
        const taskNames = (group.tasks || []).map((taskId: string) => {
          const taskName = taskMap.get(taskId);
          return taskName || taskId; // Fallback to ID if name not found
        });

        // Get vendor UUID - check both possible field names
        // normalizeServiceGroupForFrontend maps vendor_id → vendor
        const vendorUuid = group.vendor_id || group.vendor || '';
        
        // Convert vendor UUID to vendor name using the passed vendorMap
        const vendorName = vendorMap.get(vendorUuid) || vendorUuid || '';
        
        logger.debug(`🔍 Group ${index} mapping:`, {
          vendor_field_in_group: group.vendor,
          vendor_id_field_in_group: group.vendor_id,
          vendorUuid: vendorUuid,
          vendorName: vendorName,
          serviceType: group.serviceType,
          service_type: group.service_type,
          tasks_count: group.tasks?.length,
          vendorMapSize: vendorMap.size
        });

        // Transform parts_data (snake_case) to parts (camelCase) for the form
        // normalizeServiceGroupForFrontend may have already converted parts_data → partsData
        const partsArray = group.partsData || group.parts_data || [];
        
        // ✅ FIX: Filter out empty/deleted parts (those without partType or partName)
        const validParts = partsArray.filter((part: any) => {
          const hasPartType = (part.partType || part.part_type || '').trim() !== '';
          const hasPartName = (part.partName || part.part_name || '').trim() !== '';
          return hasPartType || hasPartName; // Keep part if it has at least type or name
        });
        
        const transformedParts = await Promise.all(validParts.map(async (part: any) => {
          // Get warranty document URL and ensure it's accessible (signed URL if needed)
          const warrantyUrl = part.warrantyDocumentUrl || part.warranty_document_url || part.warrantyUrl || part.warranty_url || null;
          const accessibleWarrantyUrl = warrantyUrl ? (await getAccessibleUrls([warrantyUrl]))[0] || warrantyUrl : null;
          
          return {
            partType: part.partType || part.part_type || '',
            partName: part.partName || part.part_name || '',
            brand: part.brand || '',
            serialNumber: part.serialNumber || part.serial_number || '',
            quantity: part.quantity || 1,
            warrantyPeriod: part.warrantyPeriod || part.warranty_period || '',
            tyrePositions: part.tyrePositions || part.tyre_positions || [],
            warrantyDocumentUrl: accessibleWarrantyUrl, // Use accessible signed URL
          };
        }));

        return {
          id: group.id || `group-${index}`,
          serviceType: group.serviceType || group.service_type || '', // Check both normalized and raw field names
          vendor: vendorName, // Use vendor name for display
          vendor_id: vendorUuid, // Keep UUID for submission
          tasks: taskNames, // ✅ FIX: Convert task IDs to names for display
          cost: group.service_cost || group.cost || 0,
          notes: group.notes || '',
          bill_url: group.bill_url || [],
          part_warranty_url: group.part_warranty_url || [], // ✅ NEW: Include warranty URLs array
          parts: transformedParts,
          parts_data: group.parts_data || group.partsData, // Keep original for reference (check both field names)
          partsData: transformedParts, // Also set partsData for consistency
          use_line_items: group.use_line_items || false, // Line items flag
          line_items: group.line_items || [], // Line items data
          cost_entry_mode: group.use_line_items ? 'detailed' : 'quick', // Set cost entry mode based on line items
        };
      }));

      // Convert supporting document URLs to accessible signed URLs
      const accessibleDocUrls = await getAccessibleUrls(dbTask.attachments || []);
      
      // Build transformed task data
      const transformed = {
        ...dbTask,
        // Service groups with proper transformation
        service_groups: transformedServiceGroups,
        // Extract time components
        start_time: extractTime(dbTask.start_date),
        end_time: extractTime(dbTask.end_date),
        // Keep date part only for date inputs
        start_date: dbTask.start_date ? dbTask.start_date.split('T')[0] : undefined,
        end_date: dbTask.end_date ? dbTask.end_date.split('T')[0] : undefined,
        // URLs for image previews (form will need to handle these specially)
        odometer_image: dbTask.odometer_image, // ✅ FIX: Use odometer_image instead of odometer_image_url
        supporting_documents_urls: accessibleDocUrls, // ✅ Use accessible signed URLs
        attachments: accessibleDocUrls, // ✅ FIX: Also set attachments for backward compatibility
      };

      logger.debug('✅ Transformed form data:', transformed);
      return transformed;
    } catch (error) {
      logger.error('❌ Error transforming database to form data:', error);
      return dbTask; // Return original if transformation fails
    }
  };

  // CRASH-PROOF: Compress images before upload to prevent main thread blocking
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Only compress if it's an image and larger than 1MB
      if (!file.type.startsWith('image/') || file.size <= 1024 * 1024) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 1920px width)
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                logger.debug(`📸 Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        };
        
        img.onerror = () => resolve(file);
      };
      
      reader.onerror = () => resolve(file);
    });
  };

  // CRASH-PROOF: Handle file uploads with compression and async processing
  // Using the new maintenanceFileUpload utility which handles organization_id correctly
  const handleFileUploads = async (
    serviceGroups: Array<any>,
    taskId: string
  ): Promise<Array<any>> => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    try {
      logger.debug(`📁 Starting file upload for ${serviceGroups.length} service groups using processAllServiceGroupFiles`);

      // Create callback to update operation status
      const fileUploadCallback: FileUploadCallback = (event) => {
        if (event.type === 'start') {
          updateOperationStatus(event.operation, 'in-progress');
        } else if (event.type === 'complete') {
          updateOperationStatus(event.operation, 'success', event.progress);
        } else if (event.type === 'error') {
          updateOperationStatus(event.operation, 'error', undefined, event.error);
        }
      };

      // Use the utility function that handles organization_id paths correctly
      // Add timeout wrapper (60 seconds for all file uploads)
      const uploadPromise = processAllServiceGroupFiles(
        serviceGroups,
        taskId,
        undefined, // onProgress
        fileUploadCallback
      );

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('File upload timeout after 60 seconds. Please try again or reduce file sizes.')), 60000)
      );

      const processedGroups = await Promise.race([uploadPromise, timeoutPromise]);

      logger.debug('✅ All files uploaded successfully with organization-based paths');
      return processedGroups;
    } catch (error) {
      logger.error("Error uploading files:", error);
      throw error;
    }
  };

  // Helper function to update operation status
  const updateOperationStatus = (
    opId: string,
    status: OperationStatus,
    progress?: number,
    error?: string
  ) => {
    setSaveOperations((prev) =>
      prev.map((op) => {
        if (op.id === opId) {
          return { ...op, status, progress, error };
        }
        // Check sub-operations
        if (op.subOperations) {
          return {
            ...op,
            subOperations: op.subOperations.map((subOp) =>
              subOp.id === opId ? { ...subOp, status, progress, error } : subOp
            ),
          };
        }
        return op;
      })
    );
  };

  // Helper function to initialize save operations
  const initializeSaveOperations = (serviceGroups: any[]) => {
    const operations: SaveOperation[] = [
      {
        id: 'task_creation',
        label: 'Create/Update Task',
        status: 'pending',
      },
    ];

    // Add service group operations
    serviceGroups.forEach((group, index) => {
      const subOps: SaveOperation[] = [];

      // Bills upload
      if (group.bills && group.bills.length > 0) {
        subOps.push({
          id: `group${index}_bills`,
          label: `Upload ${group.bills.length} Bill(s)`,
          status: 'pending',
        });
      }

      // Warranty files at service group level (NEW)
      if (group.warrantyFiles && group.warrantyFiles.length > 0) {
        subOps.push({
          id: `group${index}_warranties`,
          label: `Upload ${group.warrantyFiles.length} Warranty Document(s)`,
          status: 'pending',
        });
      }

      // Parts warranties (DEPRECATED - kept for backward compatibility)
      if (group.partsData && group.partsData.length > 0) {
        group.partsData.forEach((part: any, partIndex: number) => {
          if (part.warrantyDocument) {
            subOps.push({
              id: `group${index}_part${partIndex}_warranty`,
              label: `Upload ${part.partName} Warranty`,
              status: 'pending',
            });
          }
        });
      }

      if (subOps.length > 0) {
        operations.push({
          id: `service_group_${index}`,
          label: `${group.vendor || 'Service Group'} - ${group.tasks?.join(', ') || 'Tasks'}`,
          status: 'pending',
          subOperations: subOps,
        });
      }
    });

    operations.push({
      id: 'database_save',
      label: 'Save to Database',
      status: 'pending',
    });

    return operations;
  };

  // NOTE: Using convertServiceGroupsToDatabase from ServiceGroupsSection.tsx
  // This function properly converts task names to UUIDs from maintenance_tasks_catalog


  const handleSubmit = async (formData: any) => {
    // CRASH-PROOF: Prevent multiple simultaneous submissions
    if (isSubmitting) {
      logger.debug('🚫 Already submitting, ignoring click to prevent crash...');
      return;
    }

    setIsSubmitting(true);
    logger.debug('🎯 Starting maintenance task submission...');

    try {
      // CRASH-PROOF: Allow UI to update before processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Make sure required fields are present
      if (!formData.vehicle_id) {
        toast.error("Vehicle selection is required");
        setIsSubmitting(false);
        return;
      }

      if (!formData.start_date || formData.start_date === "") {
        toast.error("Start date is required");
        setIsSubmitting(false);
        return;
      }

      // Ensure odometer_reading is provided
      if (!formData.odometer_reading) {
        toast.error("Odometer reading is required");
        setIsSubmitting(false);
        return;
      }

      // Extract service groups for separate handling
      const { service_groups, ...taskData} = formData;

      // Initialize save operations and show diagnostics modal
      const operations = initializeSaveOperations(service_groups || []);
      setSaveOperations(operations);
      setShowDiagnosticsModal(true);

      // If garage_id is not provided, use vendor from the first service group
      if (
        !taskData.garage_id &&
        service_groups &&
        service_groups.length > 0 &&
        service_groups[0].vendor
      ) {
        taskData.garage_id = service_groups[0].vendor;
      }

      if (id && id !== "new") {
        // Update existing task
        const confirmUpdate = window.confirm(
          "Are you sure you want to update this maintenance task?"
        );
        if (!confirmUpdate) {
          setShowDiagnosticsModal(false);
          return;
        }

        // CRASH-PROOF: Use requestAnimationFrame to defer heavy file upload processing
        await new Promise(resolve => {
          requestAnimationFrame(async () => {
            try {
              updateOperationStatus('task_creation', 'in-progress');

              // Handle service group file uploads
              let updatedServiceGroups: Array<any> = [];
              if (service_groups && service_groups.length > 0) {
                logger.debug('📁 Starting file uploads for service groups...');
                service_groups.forEach((_, index) => {
                  updateOperationStatus(`service_group_${index}`, 'in-progress');
                });

                updatedServiceGroups = await handleFileUploads(service_groups, id);
                // Map to database format - converts task names to UUIDs
                updatedServiceGroups = await convertServiceGroupsToDatabase(updatedServiceGroups);
                logger.debug('✅ File uploads completed and service groups converted to database format');

                service_groups.forEach((_, index) => {
                  updateOperationStatus(`service_group_${index}`, 'success');
                });
              }

              updateOperationStatus('task_creation', 'success');

              // Remove fields that don't exist in database schema
              // Database only has start_date and end_date columns (date+time combined)
              // estimated_cost also doesn't exist in the schema
              const {
                start_time,
                end_time,
                estimated_cost,
                ...cleanTaskData
              } = taskData;

              // Debug: Check what we have
              console.log('📋 Task data before updateTask:', {
                hasAttachments: !!taskData.attachments,
                attachmentsLength: taskData.attachments?.length,
                attachmentsType: typeof taskData.attachments,
              });

              const updatePayload: any = {
                ...cleanTaskData,
                service_groups: updatedServiceGroups,
                // attachments already in cleanTaskData from form submission
              };

              updateOperationStatus('database_save', 'in-progress');

              // Now try our utility function
              const updatedTask = await updateTask(id, updatePayload);
              if (updatedTask) {
                setTask(updatedTask);
                await queryClient.invalidateQueries({ queryKey: ["maintenanceTasks"] });
                updateOperationStatus('database_save', 'success');

                setTimeout(() => {
                  setShowDiagnosticsModal(false);
                  toast.success('Task updated successfully!');
                  navigate("/maintenance");
                }, 1500);
              } else {
                throw new Error("Failed to update task");
              }
            } catch (error) {
              logger.error("Error updating task:", error);
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              updateOperationStatus('database_save', 'error', undefined, errorMessage);
              toast.error('Failed to save: ' + errorMessage);
            } finally {
              resolve(undefined);
            }
          });
        });
      } else {
        // CRASH-PROOF: Use requestAnimationFrame to defer heavy processing for new task creation
        await new Promise(resolve => {
          requestAnimationFrame(async () => {
            let createdTaskId: string | null = null;

            try {
              logger.debug('🆕 Creating new maintenance task...');

              // Update operation status: task creation in progress
              updateOperationStatus('task_creation', 'in-progress');

              // DON'T send service_groups in initial createTask - they need maintenance_task_id first!
              const newTask = await createTask({
                ...taskData,
                // ✅ Removed service_groups from here - will add after task is created
              } as Omit<
                  MaintenanceTask,
                  "id" | "created_at" | "updated_at"
                >
              );

              if (!newTask) {
                throw new Error("Task creation failed - no data returned");
              }

              createdTaskId = newTask.id;
              logger.debug(`✅ Task created with ID: ${createdTaskId}`);

              // Update operation status: task creation complete
              updateOperationStatus('task_creation', 'success');

              // Handle service group file uploads if there are files to upload
              if (service_groups && service_groups.length > 0 && newTask.id) {
                // Check if there are actually files to upload (including warranty files and parts warranty documents)
                const hasFiles = service_groups.some(group =>
                  (group.bills && group.bills.length > 0) ||
                  (group.warrantyFiles && group.warrantyFiles.length > 0) ||
                  (group.parts && Array.isArray(group.parts) && group.parts.some((part: any) => part.warrantyDocument))
                );

                // Always upload files if service groups exist (they may have parts with warranty docs)
                if (hasFiles || service_groups.length > 0) {
                  logger.debug('📁 Starting file uploads for new task...');

                  // Upload files using ORIGINAL service groups (which have File objects)
                  const updatedServiceGroups = await handleFileUploads(
                    service_groups,
                    newTask.id
                  );

                  // Convert to database format (task names -> UUIDs, vendor name -> vendor_id)
                  const mappedServiceGroups = await convertServiceGroupsToDatabase(updatedServiceGroups);
                  logger.debug(`📊 Mapped service groups count: ${mappedServiceGroups.length}`);
                  logger.debug('📊 Mapped service groups:', mappedServiceGroups);

                  // Update the task with the service groups including file URLs
                  if (mappedServiceGroups.length > 0) {
                    logger.debug(`🔄 Calling updateTask with ${mappedServiceGroups.length} service groups...`);
                    // Update operation status: database save in progress
                    updateOperationStatus('database_save', 'in-progress');

                    await updateTask(newTask.id, {
                      service_groups: mappedServiceGroups,
                    });
                    logger.debug('✅ updateTask completed successfully');

                    // Update operation status: database save complete
                    updateOperationStatus('database_save', 'success');
                  }
                  logger.debug('✅ File uploads completed for new task');
                }
              }

              // Final success message - only if everything succeeded
              toast.success("Maintenance task created successfully!");
              await queryClient.invalidateQueries({ queryKey: ["maintenanceTasks"] });
              // Wait a moment to show final status before navigating
              await new Promise(resolve => setTimeout(resolve, 500));
              navigate("/maintenance");
            } catch (error) {
              logger.error("Error creating task:", error);

              // Update all pending operations to error status
              updateOperationStatus('task_creation', 'error', undefined, error instanceof Error ? error.message : 'Unknown error');
              updateOperationStatus('database_save', 'error', undefined, 'Task creation failed');

              // ATOMIC ROLLBACK: Delete the task if anything failed after creation
              if (createdTaskId) {
                logger.warn(`⚠️ Rolling back task ${createdTaskId} due to error`);
                try {
                  await deleteTask(createdTaskId);
                  logger.debug('✅ Rollback successful - task deleted');
                } catch (rollbackError) {
                  logger.error('❌ Rollback failed:', rollbackError);
                }
              }

              // Show error in toast
              toast.error(
                `Failed to create task: ${
                  error instanceof Error ? error.message : "Unknown error"
                }. No data was saved.`
              );
            } finally {
              resolve(undefined);
            }
          });
        });
      }
    } catch (error) {
      logger.error("Error submitting maintenance task:", error);
      toast.error(
        `Failed to ${
          id && id !== "new" ? "update" : "create"
        } maintenance task: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUploadLink = async () => {
    if (!id || id === 'new') return;

    const uploadLink = `${window.location.origin}/upload/${id}`;

    try {
      await navigator.clipboard.writeText(uploadLink);
      setLinkCopied(true);
      toast.success('Upload link copied! Share it via WhatsApp or SMS');

      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setLinkCopied(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this maintenance task? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      deleteTask(id);
      toast.success("Maintenance task deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["maintenanceTasks"] });
      navigate("/maintenance");
    } catch (error) {
      logger.error("Error deleting task:", error);
      toast.error("Failed to delete maintenance task");
    }
  };

  return (
    <Layout>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">
            {id === "new" ? "Loading form..." : "Loading maintenance task..."}
          </p>
        </div>
      ) : (
        <>
          {/* ========== FULL WIDTH HEADER ========== */}
          <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
            <div className="flex items-center group">
              <Wrench className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
              <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
                Maintenance Task
              </h1>
            </div>
            <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">
              Create and manage vehicle maintenance records
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/maintenance")}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Back to Maintenance
              </Button>
              {!isViewMode && id !== "new" && (
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  icon={<Trash2 className="h-4 w-4" />}
                >
                  Delete Task
                </Button>
              )}
            </div>
          </div>
          {/* ========== END FULL WIDTH HEADER ========== */}

          {/* ========== FORM - FULL WIDTH ========== */}
          {isViewMode ? (
            task ? (
              <div className="space-y-6">
                {/* Basic Task Details */}
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
                  {/* Header with Edit Button */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                          onClick={copyUploadLink}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            linkCopied
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          <Camera className="h-3.5 w-3.5" />
                          {linkCopied ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Link Copied!
                            </>
                          ) : (
                            <>
                              <Share2 className="h-3.5 w-3.5" />
                              Photo Upload Link
                            </>
                          )}
                        </button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(`/maintenance/${id}`, {
                              state: { task, mode: "edit" },
                            })
                          }
                          icon={<Edit className="h-4 w-4" />}
                        >
                          Edit Task
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle, Odometer & Task Type Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Vehicle */}
                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-300">
                      <label className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-1">
                        <Truck className="h-4 w-4 text-teal-600" />
                        Vehicle
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-teal-700 px-3 py-1.5 rounded-lg font-semibold border-2 border-teal-300 shadow-sm text-base">
                          {vehicles.find((v) => v.id === task.vehicle_id)?.registration_number || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Odometer Reading */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-orange-200">
                      <label className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-1">
                        <span role="img" aria-label="odometer" className="text-base">🧭</span>
                        Odometer Reading
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-orange-700 px-3 py-1.5 rounded-lg font-semibold border-2 border-orange-300 shadow-sm text-base">
                          {task.odometer_reading ? `${task.odometer_reading.toLocaleString()} km` : 'Not specified'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Task Type */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                      <label className="text-sm font-medium text-gray-600 mb-2 block">Task Type</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-block bg-white text-purple-700 px-3 py-1.5 rounded-lg font-semibold capitalize border-2 border-purple-300 shadow-sm text-base">
                          {task.task_type?.replace(/_/g, ' ') || 'Not specified'}
                        </span>
                        {/* Status Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                          task.status === 'resolved' ? 'bg-green-100 text-green-700 border border-green-200' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          task.status === 'open' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          task.status === 'rework' ? 'bg-red-100 text-red-700 border border-red-200' :
                          'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.status === 'resolved' ? 'bg-green-500' :
                            task.status === 'in_progress' ? 'bg-blue-500' :
                            task.status === 'open' ? 'bg-yellow-500' :
                            task.status === 'rework' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></span>
                          {task.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {/* Priority Badge */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.priority === 'high' || task.priority === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' :
                          task.priority === 'medium' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          {task.priority?.toUpperCase()} PRIORITY
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl p-4 border-2 border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
                      <div className="flex items-center gap-2 mb-1 text-blue-700">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-semibold">Start</span>
                      </div>
                      {task.start_date ? (
                        <div className="flex items-center gap-2 text-gray-900 font-semibold">
                          <Clock className="h-4 w-4 text-blue-700" />
                          <span>{format(parseISO(task.start_date), 'MMM dd, yyyy • hh:mm a')}</span>
                        </div>
                      ) : (
                        <p className="text-gray-400">Not specified</p>
                      )}
                    </div>

                    <div className="rounded-xl p-4 border-2 border-green-200 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                      <div className="flex items-center gap-2 mb-1 text-green-700">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-semibold">End</span>
                      </div>
                      {task.end_date ? (
                        <div className="flex items-center gap-2 text-gray-900 font-semibold">
                          <Clock className="h-4 w-4 text-green-700" />
                          <span>{format(parseISO(task.end_date), 'MMM dd, yyyy • hh:mm a')}</span>
                        </div>
                      ) : (
                        <p className="text-gray-400">Not specified</p>
                      )}
                    </div>

                    <div className="rounded-xl p-4 border-2 border-orange-200 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
                      <div className="flex items-center gap-2 mb-1 text-orange-700">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">Downtime</span>
                      </div>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-700" />
                        {task.downtime_days ? `${task.downtime_days}d ` : ''}
                        {task.downtime_hours ? `${task.downtime_hours}h` : ''}
                        {!task.downtime_days && !task.downtime_hours ? 'Not specified' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Total Cost - Prominent Display */}
                  {task.total_cost !== null && task.total_cost !== undefined && (
                    <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-300 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-3 rounded-xl border-2 border-emerald-400 shadow-sm">
                            <IndianRupee className="h-6 w-6 text-emerald-600" />
                          </div>
                          <span className="text-lg font-semibold text-gray-800">Total Cost</span>
                        </div>
                        <span className="text-4xl font-bold text-emerald-700">
                          ₹{task.total_cost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Warranty Information Section - Aggregated from All Parts */}
                {(() => {
                  // Collect all parts with warranty information from all service groups
                  const allWarrantyParts: any[] = [];
                  task.service_groups?.forEach((group: any) => {
                    const parts = group.partsData || group.parts_data || group.parts || [];
                    parts.forEach((part: any) => {
                      if (part.warrantyPeriod || part.warranty_period) {
                        allWarrantyParts.push({
                          ...part,
                          vendorName: vendorsMap.get(group.vendor || group.vendor_id) || 'Unknown Vendor',
                        });
                      }
                    });
                  });

                  // Fallback to task-level warranty if no parts have warranty
                  const warrantyInfo = getWarrantyStatus(task.warranty_expiry);
                  const hasTaskWarranty = task.warranty_expiry && task.warranty_status !== 'not_applicable';
                  const hasPartsWarranty = allWarrantyParts.length > 0;

                  if (hasPartsWarranty || hasTaskWarranty || task.warranty_claimed) {
                    return (
                      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center">
                          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-2 rounded-lg mr-3">
                            <Shield className="h-5 w-5 text-purple-700" />
                          </div>
                          Warranty Information
                          {allWarrantyParts.length > 0 && (
                            <span className="ml-auto text-sm font-normal text-gray-500">
                              {allWarrantyParts.length} {allWarrantyParts.length === 1 ? 'part' : 'parts'} under warranty
                            </span>
                          )}
                        </h2>

                        {/* Parts Warranty Table */}
                        {hasPartsWarranty && (
                          <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Parts Warranty Details:
                            </h3>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                                  <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Part</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vendor</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Warranty Period</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Serial Number</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {allWarrantyParts.map((part: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {idx + 1}
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">{part.partType || part.part_type || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{part.partName || part.part_name || ''}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{part.brand || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{part.vendorName}</td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                          <Shield className="h-3 w-3 mr-1" />
                                          {part.warrantyPeriod || part.warranty_period}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{part.serialNumber || part.serial_number || 'N/A'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Task-Level Warranty (if exists) */}
                        {hasTaskWarranty && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall Task Warranty:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Warranty Expiry Date */}
                              {task.warranty_expiry && (
                                <div className={`rounded-xl p-4 border-2 shadow-sm ${warrantyInfo.statusColor}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4" />
                                    <label className="text-sm font-semibold">Warranty Expiry</label>
                                  </div>
                                  <p className="font-bold text-gray-900 text-lg">
                                    {formatWarrantyExpiryDate(task.warranty_expiry)}
                                  </p>
                                  {warrantyInfo.daysRemaining !== null && warrantyInfo.daysRemaining >= 0 && (
                                    <p className="text-sm mt-1 opacity-80">
                                      {warrantyInfo.daysRemaining} days remaining
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Warranty Status */}
                              <div className="rounded-xl p-4 border-2 border-gray-200 shadow-sm bg-white">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="h-4 w-4 text-gray-600" />
                                  <label className="text-sm font-semibold text-gray-600">Warranty Status</label>
                                </div>
                                <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${warrantyInfo.statusBadge}`}>
                                  {warrantyInfo.statusText}
                                </span>
                              </div>

                              {/* Warranty Claimed */}
                              <div className="rounded-xl p-4 border-2 border-gray-200 shadow-sm bg-white">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-gray-600" />
                                  <label className="text-sm font-semibold text-gray-600">Warranty Claimed</label>
                                </div>
                                <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold ${
                                  task.warranty_claimed
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}>
                                  {task.warranty_claimed ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Service Groups - ALWAYS SHOW */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center">
                    <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-2 rounded-lg mr-3">
                      <Wrench className="h-5 w-5 text-orange-700" />
                    </div>
                    Shops/Mechanics & Services
                  </h2>
                  {task.service_groups && task.service_groups.length > 0 ? (
                    <div className="space-y-4">
                      {task.service_groups.map((group: any, index: number) => (
                        <div key={index} className="border-2 border-gray-300 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-slate-50 shadow-sm hover:shadow-md transition-shadow">
                          {/* Vendor Name - ALWAYS SHOW */}
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Vendor/Shop:</p>
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                <span className="bg-green-200 text-green-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">
                                  {index + 1}
                                </span>
                                {vendorsMap.get(group.vendor || group.vendor_id) || group.vendor || group.vendor_id || '❌ NO VENDOR SAVED'}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Service Cost:</p>
                              <span className="text-lg font-semibold text-gray-900">
                                ₹{(group.service_cost || group.cost || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Service Type - ALWAYS SHOW */}
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Service Type:</p>
                            {(group.serviceType || group.service_type) ? (
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                (group.serviceType || group.service_type) === 'purchase' ? 'bg-indigo-100 text-indigo-700' :
                                (group.serviceType || group.service_type) === 'labor' ? 'bg-purple-100 text-purple-700' :
                                'bg-teal-100 text-teal-700'
                              }`}>
                                {(group.serviceType || group.service_type) === 'purchase' ? 'Parts Purchase' :
                                 (group.serviceType || group.service_type) === 'labor' ? 'Service/Repair' :
                                 'Parts + Installation'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">Not specified</span>
                            )}
                          </div>

                          {/* Tasks - ALWAYS SHOW */}
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Tasks:</p>
                            {group.tasks && group.tasks.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {group.tasks.map((taskId: string, taskIdx: number) => (
                                  <span key={taskIdx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                    {tasksMap.get(taskId) || taskId}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">❌ NO TASKS SAVED</span>
                            )}
                          </div>

                          {/* Line Items Breakdown - Show when detailed cost entry was used */}
                          {group.use_line_items && group.line_items && group.line_items.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 mb-2 font-semibold">Cost Breakdown (Line Items):</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                                      <th className="text-left py-2 px-3 font-medium text-gray-700">#</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-700">Item Name</th>
                                      <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                                      <th className="text-right py-2 px-3 font-medium text-gray-700">Qty</th>
                                      <th className="text-right py-2 px-3 font-medium text-gray-700">Unit Price</th>
                                      <th className="text-right py-2 px-3 font-medium text-gray-700">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.line_items.map((item: any, idx: number) => (
                                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-2 px-3 text-gray-600">{idx + 1}</td>
                                        <td className="py-2 px-3 font-medium text-gray-900">{item.item_name}</td>
                                        <td className="py-2 px-3 text-gray-600 text-xs">{item.description || '—'}</td>
                                        <td className="py-2 px-3 text-right text-gray-900">{item.quantity}</td>
                                        <td className="py-2 px-3 text-right text-gray-900">₹{item.unit_price?.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                                          ₹{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-green-50 border-t-2 border-green-200">
                                      <td colSpan={5} className="text-right py-2 px-3 font-semibold text-gray-700">Total:</td>
                                      <td className="text-right py-2 px-3 font-bold text-green-700">
                                        ₹{group.service_cost?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Bills Photos */}
                          {group.bill_url && group.bill_url.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 mb-2">Bills ({group.bill_url.length}):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {group.bill_url.map((url: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
                                  >
                                    <img
                                      src={url}
                                      alt={`Bill ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E📄%3C/text%3E%3C/svg%3E';
                                      }}
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Warranty Documents - Service Group Level */}
                          {group.part_warranty_url && Array.isArray(group.part_warranty_url) && group.part_warranty_url.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 mb-2 font-semibold">Warranty Documents ({group.part_warranty_url.length}):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {group.part_warranty_url.map((url: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block relative rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-500 transition-colors"
                                  >
                                    {isPdfUrl(url) ? (
                                      // PDF Display
                                      <div className="flex items-center gap-2 p-3 bg-green-50">
                                        <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-900 truncate">
                                            {getFilenameFromUrl(url)}
                                          </p>
                                          <p className="text-xs text-gray-500">PDF Document</p>
                                        </div>
                                      </div>
                                    ) : (
                                      // Image Display
                                      <div className="aspect-square">
                                        <img
                                          src={url}
                                          alt={`Warranty Document ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E📄%3C/text%3E%3C/svg%3E';
                                          }}
                                        />
                                      </div>
                                    )}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Part Details */}
                          {(group.partsData || group.parts_data || group.parts) && (group.partsData || group.parts_data || group.parts).length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 mb-2 font-semibold">Parts Details ({(group.partsData || group.parts_data || group.parts).length}):</p>
                              <div className="space-y-3">
                                {(group.partsData || group.parts_data || group.parts).map((part: any, partIdx: number) => (
                                  <div key={partIdx} className="bg-white border-2 border-indigo-200 rounded-lg p-4 shadow-sm">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                          {partIdx + 1}
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900">
                                          {part.partType || part.part_type || 'Part'}
                                        </h4>
                                      </div>
                                      {(part.warrantyPeriod || part.warranty_period) && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                          <Shield className="h-3 w-3 mr-1" />
                                          {part.warrantyPeriod || part.warranty_period}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <span className="text-gray-500 text-xs">Part Name:</span>
                                        <p className="font-medium text-gray-900 mt-0.5">{part.partName || part.part_name || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 text-xs">Brand:</span>
                                        <p className="font-medium text-gray-900 mt-0.5">{part.brand || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 text-xs">Serial Number:</span>
                                        <p className="font-medium text-gray-900 mt-0.5">{part.serialNumber || part.serial_number || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 text-xs">Quantity:</span>
                                        <p className="font-medium text-gray-900 mt-0.5">{part.quantity || 1}</p>
                                      </div>
                                      {(part.tyrePositions || part.tyre_positions) && (part.tyrePositions || part.tyre_positions).length > 0 && (
                                        <div className="col-span-2">
                                          <span className="text-gray-500 text-xs">Tyre Positions:</span>
                                          <p className="font-medium text-gray-900 mt-0.5">{(part.tyrePositions || part.tyre_positions).join(', ')}</p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Warranty Document */}
                                    {(part.warrantyDocumentUrl || part.warranty_document_url) && (
                                      <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-xs text-gray-500 mb-2 font-semibold flex items-center gap-1">
                                          <FileText className="h-3 w-3" />
                                          Warranty Document:
                                        </p>
                                        <a
                                          href={part.warrantyDocumentUrl || part.warranty_document_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block relative rounded-lg overflow-hidden border-2 border-gray-300 hover:border-indigo-500 transition-colors group cursor-pointer"
                                        >
                                          {isPdfUrl(part.warrantyDocumentUrl || part.warranty_document_url) ? (
                                            // PDF Display
                                            <div className="flex items-center gap-3 p-3 bg-red-50">
                                              <FileText className="h-10 w-10 text-red-600 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                  {getFilenameFromUrl(part.warrantyDocumentUrl || part.warranty_document_url)}
                                                </p>
                                                <p className="text-xs text-gray-500">PDF Document</p>
                                              </div>
                                              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                                            </div>
                                          ) : (
                                            // Image Display
                                            <div className="relative">
                                              <img
                                                src={part.warrantyDocumentUrl || part.warranty_document_url}
                                                alt={`Warranty Document for ${part.partName || part.part_name || 'Part'}`}
                                                className="w-full h-48 object-cover"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.onerror = null;
                                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%236b7280" font-size="48"%3E📄%3C/text%3E%3C/svg%3E';
                                                }}
                                              />
                                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                                                <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </div>
                                          )}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-red-50 border-2 border-red-200 rounded-lg">
                      <p className="text-red-700 font-medium">⚠️ NO SERVICE GROUPS SAVED</p>
                      <p className="text-sm text-red-600 mt-1">This means the service group data failed to save to the database</p>
                    </div>
                  )}
                </div>

                {/* Odometer Photo */}
                {task.odometer_image && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Camera className="h-5 w-5 mr-2 text-blue-600" />
                      Odometer Photo
                    </h2>
                    <div className="max-w-md">
                      <a
                        href={task.odometer_image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors"
                      >
                        <img
                          src={task.odometer_image}
                          alt="Odometer Reading"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E📊%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </a>
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Odometer Reading: {task.odometer_reading ? `${task.odometer_reading} km` : 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Supporting Documents */}
                {transformedFormData?.supporting_documents_urls && transformedFormData.supporting_documents_urls.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-purple-600" />
                      Supporting Documents ({transformedFormData.supporting_documents_urls.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {transformedFormData.supporting_documents_urls.map((url: string, idx: number) => (
                        <div key={idx} className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-purple-500 transition-colors">
                          {/* Document Preview */}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative group"
                          >
                            {isPdfUrl(url) ? (
                              // PDF Display
                              <div className="flex items-center gap-3 p-4 bg-purple-50">
                                <FileText className="h-12 w-12 text-purple-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {getFilenameFromUrl(url)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">PDF Document</p>
                                </div>
                              </div>
                            ) : (
                              // Image Display
                              <>
                                <div className="aspect-square">
                                  <img
                                    src={url}
                                    alt={getFilenameFromUrl(url)}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E📎%3C/text%3E%3C/svg%3E';
                                    }}
                                  />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                  {getFilenameFromUrl(url)}
                                </div>
                              </>
                            )}
                          </a>

                          {/* Action Buttons - View, Download, WhatsApp */}
                          <div className="grid grid-cols-3 gap-1 p-2 bg-gray-50 border-t border-gray-200">
                            {/* View Button */}
                            <button
                              onClick={() => window.open(url, '_blank')}
                              className="flex flex-col items-center justify-center gap-1 p-2 rounded hover:bg-blue-100 transition-colors group"
                              title="View Document"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                              <span className="text-xs text-blue-600 font-medium">View</span>
                            </button>

                            {/* Download Button */}
                            <a
                              href={url}
                              download={getFilenameFromUrl(url)}
                              className="flex flex-col items-center justify-center gap-1 p-2 rounded hover:bg-green-100 transition-colors"
                              title="Download Document"
                            >
                              <Download className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">Download</span>
                            </a>

                            {/* WhatsApp Button */}
                            <button
                              onClick={async () => {
                                try {
                                  const filename = getFilenameFromUrl(url);
                                  const vehicleReg = task.vehicle_id || 'Maintenance Task';
                                  const message = `📄 Vehicle: ${vehicleReg}\n\nDocument: ${filename}\n\n${url}`;
                                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                                  window.open(whatsappUrl, '_blank');
                                  toast.success('Opening WhatsApp...');
                                } catch (error) {
                                  toast.error('Failed to share via WhatsApp');
                                }
                              }}
                              className="flex flex-col items-center justify-center gap-1 p-2 rounded hover:bg-emerald-100 transition-colors"
                              title="Share via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs text-emerald-600 font-medium">WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Field Photos - Uploaded via shareable link */}
                {uploadedPhotos.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-teal-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Camera className="h-5 w-5 mr-2 text-teal-600" />
                        Field Photos ({uploadedPhotos.length})
                      </h2>
                      <span className="text-xs text-gray-500 bg-teal-50 px-3 py-1 rounded-full">
                        Uploaded via link
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {uploadedPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <a
                            href={photo.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative aspect-square rounded-lg overflow-hidden border-2 border-teal-200 hover:border-teal-500 transition-colors"
                          >
                            <img
                              src={photo.image_url}
                              alt="Field photo"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E📷%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs py-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="truncate">
                                {photo.uploaded_by || 'Anonymous'}
                              </p>
                              <p className="text-[10px] text-gray-300">
                                {format(parseISO(photo.uploaded_at), 'MMM dd, h:mm a')}
                              </p>
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Auto-refreshing every 30 seconds
                    </p>
                  </div>
                )}

                {/* Complaint & Resolution */}
                {(task.complaint_description || task.resolution_summary) && (
                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center">
                      <div className="bg-gradient-to-br from-rose-100 to-pink-100 p-2 rounded-lg mr-3">
                        <AlertTriangle className="h-5 w-5 text-rose-700" />
                      </div>
                      Complaint & Resolution
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {task.complaint_description && (
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border-l-4 border-red-400 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wide">Complaint</h3>
                          </div>
                          <p className="text-gray-800 leading-relaxed">{task.complaint_description}</p>
                        </div>
                      )}
                      {task.resolution_summary && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-l-4 border-green-400 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Resolution</h3>
                          </div>
                          <p className="text-gray-800 leading-relaxed">{task.resolution_summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                Task details not available.
              </div>
            )
          ) : (
            <>
              {/* Edit Form */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <MaintenanceTaskForm
                  vehicles={vehicles}
                  initialData={transformedFormData}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Save Diagnostics Modal */}
      <SaveDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => {
          setShowDiagnosticsModal(false);
          setIsSubmitting(false);
        }}
        operations={saveOperations}
        title="Save Progress"
      />
    </Layout>
  );
};


export default MaintenanceTaskPage;









