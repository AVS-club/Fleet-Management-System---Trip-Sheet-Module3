import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MaintenanceTaskForm from '../components/maintenance/MaintenanceTaskForm';
import { Vehicle, MaintenanceServiceGroup } from '../types'; 
import { MaintenanceTask } from '../types/maintenance';
import { getTask, createTask, updateTask, deleteTask, uploadServiceBill } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import { supabase } from '../utils/supabaseClient';
import Button from '../components/ui/Button';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Define a more specific type for the data coming from MaintenanceTaskForm
interface MaintenanceFormData {
  // Basic fields
  vehicle_id?: string;
  task_type?: 'general_scheduled_service' | 'wear_and_tear_replacement_repairs' | 'accidental' | 'others';
  title?: string[] | string; 
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'rework';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  garage_id?: string;
  estimated_cost?: number;
  actual_cost?: number;
  
  // Service groups
  service_groups?: Array<{
    id?: string;
    maintenance_task_id?: string;
    vendor_id: string;
    tasks: string[];
    cost: number;
    bill_url?: string;
    bill_file?: File;
  }>;
  
  // Other fields
  complaint_description?: string;
  resolution_summary?: string;
  warranty_expiry?: string;
  warranty_status?: 'valid' | 'expired' | 'not_applicable';
  warranty_claimed?: boolean;
  
  start_date?: string;
  end_date?: string;
  service_hours?: '4' | '6' | '8' | '12';
  downtime_days?: number;
  odometer_reading?: number;

  next_service_due?: {
    date?: string;
    odometer?: number;
    reminder_set?: boolean;
  };

  attachments?: File[] | string[];
  notes?: string;
  category?: string;
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
        if (id && id !== 'new') {
          const taskData = await getTask(id);
          if (taskData) {
            setTask(taskData);
          } else {
            navigate('/maintenance');
          }
        }
      } catch (error) {
        console.error('Error loading maintenance task data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, navigate]);

  // Handle file uploads for service group bills
  const handleFileUploads = async (
    serviceGroups: Array<Partial<MaintenanceServiceGroup>>, 
    taskId: string
  ): Promise<Array<Partial<MaintenanceServiceGroup>>> => {
    if (!serviceGroups || serviceGroups.length === 0) return [];

    const updatedGroups = [...serviceGroups];
    
    for (let i = 0; i < updatedGroups.length; i++) {
      const group = updatedGroups[i];
      if (group.bill_file) {
        try {
          // Generate a unique file name
          const fileExt = group.bill_file.name.split('.').pop();
          const fileName = `${taskId}-group${i}-${Date.now()}.${fileExt}`;
          const filePath = `maintenance-bills/${fileName}`;
          
          // Upload the file
          const { error: uploadError } = await supabase.storage
            .from('maintenance')
            .upload(filePath, group.bill_file, {
              upsert: true,
              contentType: group.bill_file.type
            });
            
          if (uploadError) {
            throw uploadError;
          }
          
          // Get the public URL
          const { data } = supabase.storage
            .from('maintenance')
            .getPublicUrl(filePath);
          
          // Update the group with the URL
          updatedGroups[i].bill_url = data.publicUrl;
          
          // Remove the file object as we don't need it in the database
          delete updatedGroups[i].bill_file;
        } catch (error) {
          console.error('Error uploading bill:', error);
          toast.error(`Failed to upload bill for service group ${i+1}`);
        }
      }
    }
    
    return updatedGroups;
  };

  const handleSubmit = async (formData: MaintenanceFormData) => {
    setIsSubmitting(true);
    try {
      // Extract service groups for separate handling
      const { service_groups, ...taskData } = formData;
      
      if (id && id !== 'new') {
        // Update existing task
        const confirmUpdate = window.confirm('Are you sure you want to update this maintenance task?');
        if (!confirmUpdate) {
          setIsSubmitting(false);
          return;
        }

        // Handle service group file uploads
        let updatedServiceGroups: Array<Partial<MaintenanceServiceGroup>> = [];
        if (service_groups && service_groups.length > 0) {
          updatedServiceGroups = await handleFileUploads(service_groups, id);
        }

        const updatePayload: Partial<MaintenanceTask> = {
          ...taskData,
          service_groups: updatedServiceGroups
        };

        const updatedTask = await updateTask(id, updatePayload);
        if (updatedTask) {
          setTask(updatedTask);
          toast.success('Maintenance task updated successfully');
          navigate('/maintenance');
        } else {
          toast.error('Failed to update task');
        }
      } else {
        // Create new task
        const newTask = await createTask(taskData as Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>);
        
        if (newTask) {
          // Handle service group file uploads
          if (service_groups && service_groups.length > 0 && newTask.id) {
            const updatedServiceGroups = await handleFileUploads(service_groups, newTask.id);
            
            // Update the task with the service groups
            if (updatedServiceGroups.length > 0) {
              await updateTask(newTask.id, {
                service_groups: updatedServiceGroups
              });
            }
          }
          
          toast.success('Maintenance task created successfully');
          navigate('/maintenance');
        } else {
          toast.error('Failed to create task');
        }
      }
    } catch (error) {
      console.error('Error submitting maintenance task:', error);
      toast.error(`Failed to ${id && id !== 'new' ? 'update' : 'create'} maintenance task`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this maintenance task? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      deleteTask(id);
      toast.success('Maintenance task deleted successfully');
      navigate('/maintenance');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete maintenance task');
    }
  };

  return (
    <Layout
      title={id === 'new' ? 'New Maintenance Task' : 'Edit Maintenance Task'}
      subtitle={task ? `Task #${task.id}` : 'Create a new maintenance task'}
      actions={
        id !== 'new' ? (
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
            {id === 'new' ? 'Loading form...' : 'Loading maintenance task...'}
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/maintenance')}
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