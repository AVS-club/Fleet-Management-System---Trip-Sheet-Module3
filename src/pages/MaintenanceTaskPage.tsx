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
import { ChevronLeft, Trash2, Edit, Wrench } from "lucide-react";
import { toast } from "react-toastify";
import { uploadFilesAndGetPublicUrls } from "@/utils/supabaseStorage";
import { processAllServiceGroupFiles, FileUploadCallback } from "@/utils/maintenanceFileUpload";
import "../styles/maintenanceFormUpdates.css";
import { createLogger } from '../utils/logger';
import SaveDiagnosticsModal, { SaveOperation, OperationStatus } from '../components/maintenance/SaveDiagnosticsModal';
import { convertServiceGroupsToDatabase } from '../components/maintenance/ServiceGroupsSection';

const logger = createLogger('MaintenanceTaskPage');
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
  estimated_cost?: number;
  cost?: number;
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
    batteryData?: {
      serialNumber: string;
      brand: string;
    };
    tyreData?: {
      positions: string[];
      brand: string;
      serialNumbers: string;
    };
    partsData?: Array<{
      partType: string;
      partName: string;
      brand: string;
      serialNumber?: string;
      quantity: number;
      warrantyPeriod?: string;
      warrantyDocument?: File;
    }>;
    
    // Warranty uploads
    batteryWarrantyFiles?: File[];
    tyreWarrantyFiles?: File[];
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
  const locationState = (location.state as { task?: MaintenanceTask; mode?: string } | undefined) || {};
  const [task, setTask] = useState<MaintenanceTask | null>(locationState.task || null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveOperations, setSaveOperations] = useState<SaveOperation[]>([]);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode');
  const isViewMode = (modeParam || (locationState.mode ?? undefined)) === 'view';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Load vehicles regardless of whether we're creating or editing
        const vehiclesData = await getVehicles();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

        // If we're editing an existing task, load it
        if (id && id !== "new") {
          const taskData = await getTask(id);
          if (taskData) {
            setTask(taskData);
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

      // Battery warranty
      if (group.batteryWarrantyFiles && group.batteryWarrantyFiles.length > 0) {
        subOps.push({
          id: `group${index}_battery_warranty`,
          label: `Upload Battery Warranty`,
          status: 'pending',
        });
      }

      // Tyre warranty
      if (group.tyreWarrantyFiles && group.tyreWarrantyFiles.length > 0) {
        subOps.push({
          id: `group${index}_tyre_warranty`,
          label: `Upload Tyre Warranty`,
          status: 'pending',
        });
      }

      // Parts warranties
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
          return;
        }

        // CRASH-PROOF: Use requestAnimationFrame to defer heavy file upload processing
        await new Promise(resolve => {
          requestAnimationFrame(async () => {
            let progressToast: any = null;

            try {
              // Start with a loading toast
              progressToast = toast.loading('Updating maintenance task...');

              // Handle service group file uploads
              let updatedServiceGroups: Array<any> = [];
              if (service_groups && service_groups.length > 0) {
                logger.debug('📁 Starting file uploads for service groups...');

                // Update toast to show upload progress
                toast.loading('Uploading files...', { id: progressToast });

                updatedServiceGroups = await handleFileUploads(service_groups, id);
                // Map to database format - converts task names to UUIDs
                updatedServiceGroups = await convertServiceGroupsToDatabase(updatedServiceGroups);
                logger.debug('✅ File uploads completed and service groups converted to database format');
              }

              const updatePayload: any = {
                ...taskData,
                service_groups: updatedServiceGroups,
              };

              try {
                // Update toast to show saving progress
                toast.loading('Saving task details...', { id: progressToast });

                // Now try our utility function
                const updatedTask = await updateTask(id, updatePayload);
                if (updatedTask) {
                  setTask(updatedTask);
                  toast.success("Maintenance task updated successfully!", { id: progressToast });
                  navigate("/maintenance");
                } else {
                  toast.error("Failed to update task", { id: progressToast });
                }
              } catch (error) {
                logger.error("Error updating task:", error);
                toast.error(
                  `Error updating task: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                  { id: progressToast }
                );
              }
            } catch (error) {
              logger.error("Error in file upload processing:", error);
              toast.error("Error processing file uploads", { id: progressToast });
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

              // Convert service groups to database format BEFORE creating task
              // This converts task names to UUIDs and vendor names to vendor_ids
              let convertedServiceGroups: any[] = [];
              if (service_groups && service_groups.length > 0) {
                logger.debug('🔄 Converting service groups to database format...');
                convertedServiceGroups = await convertServiceGroupsToDatabase(service_groups);
                logger.debug('✅ Service groups converted:', convertedServiceGroups);
              }

              const newTask = await createTask({
                ...taskData,
                service_groups: convertedServiceGroups  // Use converted groups with UUIDs
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
                // Check if there are actually files to upload
                const hasFiles = service_groups.some(group =>
                  (group.bills && group.bills.length > 0) ||
                  (group.batteryWarrantyFiles && group.batteryWarrantyFiles.length > 0) ||
                  (group.tyreWarrantyFiles && group.tyreWarrantyFiles.length > 0)
                );

                if (hasFiles) {
                  logger.debug('📁 Starting file uploads for new task...');

                  // Upload files using ORIGINAL service groups (which have File objects)
                  const updatedServiceGroups = await handleFileUploads(
                    service_groups,
                    newTask.id
                  );

                  // Convert to database format (task names -> UUIDs, vendor name -> vendor_id)
                  const mappedServiceGroups = await convertServiceGroupsToDatabase(updatedServiceGroups);

                  // Update the task with the service groups including file URLs
                  if (mappedServiceGroups.length > 0) {
                    // Update operation status: database save in progress
                    updateOperationStatus('database_save', 'in-progress');

                    await updateTask(newTask.id, {
                      service_groups: mappedServiceGroups,
                    });

                    // Update operation status: database save complete
                    updateOperationStatus('database_save', 'success');
                  }
                  logger.debug('✅ File uploads completed for new task');
                }
              }

              // Final success message - only if everything succeeded
              toast.success("Maintenance task created successfully!");

              // Wait a moment to show final status before navigating
              await new Promise(resolve => setTimeout(resolve, 1000));
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

  const handleDelete = () => {
    if (!id) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this maintenance task? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      deleteTask(id);
      toast.success("Maintenance task deleted successfully");
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
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicle</h3>
                      <p className="text-gray-900">
                        {vehicles.find((v) => v.id === task.vehicle_id)?.registration_number || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        task.status === 'completed' ? 'bg-success-100 text-success-700' :
                        task.status === 'in_progress' ? 'bg-warning-100 text-warning-700' :
                        task.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                        'bg-danger-100 text-danger-700'
                      }`}>
                        {task.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Priority</h3>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        task.priority === 'high' ? 'bg-danger-100 text-danger-700' :
                        task.priority === 'medium' ? 'bg-warning-100 text-warning-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Task Type</h3>
                      <p className="text-gray-900 capitalize">{task.task_type?.replace(/_/g, ' ') || 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
                      <p className="text-gray-900">{task.start_date ? new Date(task.start_date).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">End Date</h3>
                      <p className="text-gray-900">{task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Downtime</h3>
                      <p className="text-gray-900">
                        {task.downtime_days ? `${task.downtime_days} days` : ''}
                        {task.downtime_hours ? ` ${task.downtime_hours} hours` : ''}
                        {!task.downtime_days && !task.downtime_hours ? 'Not specified' : ''}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Odometer Reading</h3>
                      <p className="text-gray-900">{task.odometer_reading ? `${task.odometer_reading} km` : 'Not specified'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                      <p className="text-gray-900">{task.description || 'No description provided'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Estimated Cost</h3>
                      <p className="text-gray-900 text-lg font-semibold">₹{task.estimated_cost?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Actual Cost</h3>
                      <p className="text-gray-900 text-lg font-semibold">₹{task.cost?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>

                {/* Service Groups - ALWAYS SHOW */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-green-600" />
                    Shops/Mechanics & Services
                  </h2>
                  {task.service_groups && task.service_groups.length > 0 ? (
                    <div className="space-y-4">
                      {task.service_groups.map((group: any, index: number) => (
                        <div key={index} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                          {/* Vendor Name - ALWAYS SHOW */}
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Vendor/Shop:</p>
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                <span className="bg-green-200 text-green-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2">
                                  {index + 1}
                                </span>
                                {group.vendor_id || '❌ NO VENDOR SAVED'}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Cost:</p>
                              <span className="text-lg font-semibold text-gray-900">
                                ₹{(group.cost || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Service Type - ALWAYS SHOW */}
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Service Type:</p>
                            {group.service_type ? (
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                group.service_type === 'purchase' ? 'bg-indigo-100 text-indigo-700' :
                                group.service_type === 'labor' ? 'bg-purple-100 text-purple-700' :
                                'bg-teal-100 text-teal-700'
                              }`}>
                                {group.service_type === 'purchase' ? 'Parts Purchase' :
                                 group.service_type === 'labor' ? 'Service/Repair' :
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
                                {group.tasks.map((task: string, taskIdx: number) => (
                                  <span key={taskIdx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                    {task}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">❌ NO TASKS SAVED</span>
                            )}
                          </div>

                          {/* Notes - ALWAYS SHOW */}
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Notes:</p>
                            <p className="text-sm text-gray-600">
                              {group.notes || <span className="text-gray-400">No notes</span>}
                            </p>
                          </div>
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

                {/* Complaint & Resolution */}
                {(task.complaint_description || task.resolution_description) && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Complaint & Resolution</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {task.complaint_description && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Complaint</h3>
                          <p className="text-gray-900">{task.complaint_description}</p>
                        </div>
                      )}
                      {task.resolution_description && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500 mb-2">Resolution</h3>
                          <p className="text-gray-900">{task.resolution_description}</p>
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <MaintenanceTaskForm
                vehicles={vehicles}
                initialData={task || undefined}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </div>
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









