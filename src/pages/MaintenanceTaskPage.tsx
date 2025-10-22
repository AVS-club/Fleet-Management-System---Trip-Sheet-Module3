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
import "../styles/maintenanceFormUpdates.css";
import { createLogger } from '../utils/logger';

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
  actual_cost?: number;
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
  const handleFileUploads = async (
    serviceGroups: Array<any>,
    taskId: string
  ): Promise<Array<any>> => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    const updatedGroups = [...serviceGroups];
    logger.debug(`📁 Starting file upload for ${serviceGroups.length} service groups`);

    for (let i = 0; i < updatedGroups.length; i++) {
      const group = updatedGroups[i];

      try {
        // Handle bill uploads
        if (group.bills && group.bills.length) {
          const compressedFiles = await Promise.all(
            group.bills.map((file: File) => compressImage(file))
          );
          
          const billUrls = await uploadFilesAndGetPublicUrls(
            "maintenance-bills",
            `${taskId}/group${i}/bills`,
            compressedFiles
          );

          updatedGroups[i].bill_url = billUrls;
          delete updatedGroups[i].bills;
        }

        // Handle battery warranty uploads
        if (group.batteryWarrantyFiles && group.batteryWarrantyFiles.length) {
          const compressedBatteryFiles = await Promise.all(
            group.batteryWarrantyFiles.map((file: File) => compressImage(file))
          );
          
          const batteryWarrantyUrls = await uploadFilesAndGetPublicUrls(
            "battery-warranties",
            `${taskId}/group${i}/battery-warranty`,
            compressedBatteryFiles
          );

          updatedGroups[i].battery_warranty_url = batteryWarrantyUrls;
          delete updatedGroups[i].batteryWarrantyFiles;
        }

        // Handle tyre warranty uploads
        if (group.tyreWarrantyFiles && group.tyreWarrantyFiles.length) {
          const compressedTyreFiles = await Promise.all(
            group.tyreWarrantyFiles.map((file: File) => compressImage(file))
          );
          
          const tyreWarrantyUrls = await uploadFilesAndGetPublicUrls(
            "tyre-warranties",
            `${taskId}/group${i}/tyre-warranty`,
            compressedTyreFiles
          );

          updatedGroups[i].tyre_warranty_url = tyreWarrantyUrls;
          delete updatedGroups[i].tyreWarrantyFiles;
        }

        // Handle parts warranty uploads
        if (group.partsData && group.partsData.length) {
          for (let j = 0; j < group.partsData.length; j++) {
            const part = group.partsData[j];
            if (part.warrantyDocument) {
              const compressedWarrantyFile = await compressImage(part.warrantyDocument);
              const warrantyUrls = await uploadFilesAndGetPublicUrls(
                "part-warranties",
                `${taskId}/group${i}/part${j}/warranty`,
                [compressedWarrantyFile]
              );
              
              updatedGroups[i].partsData[j].warrantyDocumentUrl = warrantyUrls[0];
              delete updatedGroups[i].partsData[j].warrantyDocument;
            }
          }
        }
      } catch (error) {
        logger.error("Error uploading files for service group:", error);
        toast.error(`Failed to upload files for service group ${i + 1}`);
      }
    }

    return updatedGroups;
  };

  // Map new service group structure to database format
  const mapServiceGroupsToDatabase = (serviceGroups: Array<any>) => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    return serviceGroups.map((group) => {
      const dbGroup = {
        maintenance_task_id: id !== "new" ? id : undefined,
        service_type: group.serviceType,
        vendor_id: group.vendor, // Store as text, not UUID
        tasks: group.tasks || [],
        cost: group.cost || 0,
        bill_url: group.bill_url || [],
        notes: group.notes || null,
        
        // Parts data as JSONB
        battery_data: group.batteryData ? {
          serialNumber: group.batteryData.serialNumber,
          brand: group.batteryData.brand
        } : undefined,
        
        tyre_data: group.tyreData ? {
          positions: group.tyreData.positions,
          brand: group.tyreData.brand,
          serialNumbers: group.tyreData.serialNumbers
        } : undefined,
        
        parts_data: group.partsData ? group.partsData.map((part: any) => ({
          partType: part.partType,
          partName: part.partName,
          brand: part.brand,
          serialNumber: part.serialNumber || null,
          quantity: part.quantity,
          warrantyPeriod: part.warrantyPeriod || null,
          warrantyDocumentUrl: part.warrantyDocumentUrl || null
        })) : [],
        
        // Warranty URLs
        battery_warranty_url: group.battery_warranty_url || undefined,
        tyre_warranty_url: group.tyre_warranty_url || undefined
      };

      return dbGroup;
    });
  };


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
        return;
      }

      if (!formData.start_date || formData.start_date === "") {
        toast.error("Start date is required");
        return;
      }

      // Ensure odometer_reading is provided
      if (!formData.odometer_reading) {
        toast.error("Odometer reading is required");
        return;
      }

      // Extract service groups for separate handling
      const { service_groups, ...taskData } = formData;

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
            try {
              // Handle service group file uploads
              let updatedServiceGroups: Array<any> = [];
              if (service_groups && service_groups.length > 0) {
                logger.debug('📁 Starting file uploads for service groups...');
                updatedServiceGroups = await handleFileUploads(service_groups, id);
                // Map to database format
                updatedServiceGroups = mapServiceGroupsToDatabase(updatedServiceGroups);
                logger.debug('✅ File uploads completed');
              }

              const updatePayload: any = {
                ...taskData,
                service_groups: updatedServiceGroups,
              };

              try {
                // Now try our utility function
                const updatedTask = await updateTask(id, updatePayload);
                if (updatedTask) {
                  setTask(updatedTask);
                  toast.success("Maintenance task updated successfully");
                  navigate("/maintenance");
                } else {
                  toast.error("Failed to update task");
                }
              } catch (error) {
                logger.error("Error updating task:", error);
                toast.error(
                  `Error updating task: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`
                );
              }
            } catch (error) {
              logger.error("Error in file upload processing:", error);
              toast.error("Error processing file uploads");
            } finally {
              resolve(undefined);
            }
          });
        });
      } else {
        // CRASH-PROOF: Use requestAnimationFrame to defer heavy processing for new task creation
        await new Promise(resolve => {
          requestAnimationFrame(async () => {
            try {
              logger.debug('🆕 Creating new maintenance task...');
              const newTask = await createTask(
                taskData as Omit<
                  MaintenanceTask,
                  "id" | "created_at" | "updated_at"
                >
              );

              if (newTask) {
                // Handle service group file uploads
                if (service_groups && service_groups.length > 0 && newTask.id) {
                  logger.debug('📁 Starting file uploads for new task...');
                  toast.info('Uploading files...', { autoClose: 2000 });
                  const updatedServiceGroups = await handleFileUploads(
                    service_groups,
                    newTask.id
                  );

                  // Map to database format
                  const mappedServiceGroups = mapServiceGroupsToDatabase(updatedServiceGroups);

                  // Update the task with the service groups
                  if (mappedServiceGroups.length > 0) {
                    await updateTask(newTask.id, {
                      service_groups: mappedServiceGroups,
                    });
                  }
                  logger.debug('✅ File uploads completed for new task');
                  toast.success('Files uploaded successfully!', { autoClose: 2000 });
                }

                toast.success("Maintenance task created successfully");
                navigate("/maintenance");
              } else {
                toast.error("Task creation failed - no data returned");
              }
            } catch (error) {
              logger.error("Error creating task:", error);
              toast.error(
                `Error creating task: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate(`/maintenance/`, {
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
                    <p className="text-gray-900 capitalize">{task.status}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Priority</h3>
                    <p className="text-gray-900 capitalize">{task.priority}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Task Type</h3>
                    <p className="text-gray-900 capitalize">{task.task_type?.replace(/_/g, ' ')}</p>
                  </div>
                  {task.description && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                      <p className="text-gray-900">{task.description}</p>
                    </div>
                  )}
                  {task.estimated_cost && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Estimated Cost</h3>
                      <p className="text-gray-900">₹{task.estimated_cost.toLocaleString()}</p>
                    </div>
                  )}
                  {task.actual_cost && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Actual Cost</h3>
                      <p className="text-gray-900">₹{task.actual_cost.toLocaleString()}</p>
                    </div>
                  )}
                </div>
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
    </Layout>
  );
};


export default MaintenanceTaskPage;









