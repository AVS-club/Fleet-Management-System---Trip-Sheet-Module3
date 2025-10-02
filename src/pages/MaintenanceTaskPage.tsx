import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import MaintenanceTaskForm from "../components/maintenance/MaintenanceTaskForm";
import { Vehicle } from "@/types";
import { MaintenanceTask, MaintenanceServiceGroup } from "@/types/maintenance";
import {
  getTask,
  createTask,
  updateTask,
  deleteTask,
  uploadServiceBill,
} from "../utils/maintenanceStorage";
import { getVehicles } from "../utils/storage";
import { supabase } from "../utils/supabaseClient";
import Button from "../components/ui/Button";
import { ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { uploadFilesAndGetPublicUrls } from "@/utils/supabaseStorage";
// Define a more specific type for the data coming from MaintenanceTaskForm
interface MaintenanceFormData {
  // Basic fields
  vehicle_id?: string;
  task_type?:
    | "general_scheduled_service"
    | "wear_and_tear_replacement_repairs"
    | "accidental"
    | "others";
  title?: string[] | string;
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
    vendor_id: string;
    tasks: string[];
    cost: number;
    bill_url?: string[];
    bill_file?: File[];
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
  const [task, setTask] = useState<MaintenanceTask | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
        console.error("Error loading maintenance task data:", error);
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
                console.log(`📸 Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
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
    serviceGroups: Array<Partial<MaintenanceServiceGroup>>,
    taskId: string
  ): Promise<Array<MaintenanceServiceGroup>> => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    const updatedGroups = [...serviceGroups];
    console.log(`📁 Starting file upload for ${serviceGroups.length} service groups`);

    for (let i = 0; i < updatedGroups.length; i++) {
      const group = updatedGroups[i];

      try {
        if (group.bill_file && group.bill_file.length) {
          // CRASH-PROOF: Compress images before upload
          const compressedFiles = await Promise.all(
            group.bill_file.map(file => compressImage(file))
          );
          
          let groupBillPublicUrls = [];
          groupBillPublicUrls = await uploadFilesAndGetPublicUrls(
            "maintenance",
            `${taskId}/group${i}/bill`,
            compressedFiles
          );

          // Update the group with the URL
          updatedGroups[i].bill_url = groupBillPublicUrls;

          // Remove the file object as we don't need it in the database
          delete updatedGroups[i].bill_file;
        }

        if (group.battery_warranty_file && group.battery_warranty_file.length) {
          // CRASH-PROOF: Compress images before upload
          const compressedBatteryFiles = await Promise.all(
            group.battery_warranty_file.map(file => compressImage(file))
          );
          
          let groupBatteryPublicUrls = [];
          groupBatteryPublicUrls = await uploadFilesAndGetPublicUrls(
            "maintenance",
            `${taskId}/group${i}/battery`,
            compressedBatteryFiles
          );

          // Update the group with the URL
          updatedGroups[i].battery_waranty_url = groupBatteryPublicUrls;

          // Remove the file object as we don't need it in the database
          delete updatedGroups[i].battery_warranty_file;
        }

        if (group.tyre_warranty_file && group.tyre_warranty_file.length) {
          // CRASH-PROOF: Compress images before upload
          const compressedTyreFiles = await Promise.all(
            group.tyre_warranty_file.map(file => compressImage(file))
          );
          
          let groupTyrePublicUrls = [];
          groupTyrePublicUrls = await uploadFilesAndGetPublicUrls(
            "maintenance",
            `${taskId}/group${i}/tyre`,
            compressedTyreFiles
          );

          // Update the group with the URL
          updatedGroups[i].tyre_waranty_url = groupTyrePublicUrls;

          // Remove the file object as we don't need it in the database
          delete updatedGroups[i].tyre_warranty_file;
        }
      } catch (error) {
        console.error("Error uploading bill:", error);
        toast.error(`Failed to upload bill for service group ${i + 1}`);
      }
    }

    return updatedGroups;
  };

  // Clean service groups data for database insertion
  const cleanServiceGroupsForDatabase = (
    serviceGroups: Array<MaintenanceServiceGroup>
  ): Array<Partial<MaintenanceServiceGroup>> => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    return serviceGroups.map((group) => {
      // Create a clean copy without the bill_file property
      const cleanGroup = { ...group };
      delete cleanGroup.bill_file;
      return cleanGroup;
    });
  };

  const handleSubmit = async (formData: MaintenanceFormData) => {
    // CRASH-PROOF: Prevent multiple simultaneous submissions
    if (isSubmitting) {
      console.log('🚫 Already submitting, ignoring click to prevent crash...');
      return;
    }
    
    setIsSubmitting(true);
    console.log('🎯 Starting maintenance task submission...');
    
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

      // If garage_id is not provided, use vendor_id from the first service group
      if (
        !taskData.garage_id &&
        service_groups &&
        service_groups.length > 0 &&
        service_groups[0].vendor_id
      ) {
        taskData.garage_id = service_groups[0].vendor_id;
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
              let updatedServiceGroups: Array<Partial<MaintenanceServiceGroup>> = [];
              if (service_groups && service_groups.length > 0) {
                console.log('📁 Starting file uploads for service groups...');
                updatedServiceGroups = await handleFileUploads(service_groups, id);
                // Clean the service groups data for database insertion
                updatedServiceGroups =
                  cleanServiceGroupsForDatabase(updatedServiceGroups);
                console.log('✅ File uploads completed');
              }

              const updatePayload: Partial<MaintenanceTask> = {
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
                console.error("Error updating task:", error);
                toast.error(
                  `Error updating task: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`
                );
              }
            } catch (error) {
              console.error("Error in file upload processing:", error);
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
              console.log('🆕 Creating new maintenance task...');
              const newTask = await createTask(
                taskData as Omit<
                  MaintenanceTask,
                  "id" | "created_at" | "updated_at"
                >
              );

              if (newTask) {
                // Handle service group file uploads
                if (service_groups && service_groups.length > 0 && newTask.id) {
                  console.log('📁 Starting file uploads for new task...');
                  toast.info('Uploading files...', { autoClose: 2000 });
                  const updatedServiceGroups = await handleFileUploads(
                    service_groups,
                    newTask.id
                  );

                  // Clean the service groups data for database insertion
                  // updatedServiceGroups =
                  //   cleanServiceGroupsForDatabase(updatedServiceGroups);

                  // Update the task with the service groups
                  if (updatedServiceGroups.length > 0) {
                    await updateTask(newTask.id, {
                      service_groups: updatedServiceGroups,
                    });
                  }
                  console.log('✅ File uploads completed for new task');
                  toast.success('Files uploaded successfully!', { autoClose: 2000 });
                }

                toast.success("Maintenance task created successfully");
                navigate("/maintenance");
              } else {
                toast.error("Task creation failed - no data returned");
              }
            } catch (error) {
              console.error("Error creating task:", error);
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
      console.error("Error submitting maintenance task:", error);
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
      console.error("Error deleting task:", error);
      toast.error("Failed to delete maintenance task");
    }
  };

  return (
    <Layout
      title={id === "new" ? "New Maintenance Task" : "Edit Maintenance Task"}
      subtitle={task ? `Task #${task.id}` : "Create a new maintenance task"}
      actions={
        id !== "new" ? (
          <Button
            variant="danger"
            onClick={handleDelete}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Delete Task
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">
            {id === "new" ? "Loading form..." : "Loading maintenance task..."}
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              inputSize="sm"
              onClick={() => navigate("/maintenance")}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Back to Maintenance
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <MaintenanceTaskForm
              vehicles={vehicles}
              initialData={task || undefined}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MaintenanceTaskPage;
