import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MaintenanceTaskForm from '../components/maintenance/MaintenanceTaskForm';
import { Vehicle } from '../types'; // Vehicle can stay from ../types if it's in index.ts
import { MaintenanceTask, MaintenanceBill } from '../types/maintenance'; // Correct import for MaintenanceTask and MaintenanceBill
// Import createTask
import { getTask, createTask, updateTask, deleteTask } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import Button from '../components/ui/Button';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

// Define a more specific type for the data coming from MaintenanceTaskForm
interface MaintenanceFormData {
  // Fields from react-hook-form, typically camelCase
  vehicleId?: string;
  taskType?: 'general_scheduled' | 'emergency_breakdown' | 'driver_damage' | 'warranty_claim';
  title?: string[] | string; // Main title for service group 1
  description?: string; // Overall task description
  status?: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'rework';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  vendorId?: string; // Form field for vendor ID
  garageId?: string; // Form field for garage ID
  estimatedCost?: number;
  actualCost?: number;
  
  billGroup1?: number; // Cost for service group 1
  billGroup2?: number; // Cost for service group 2
  titleGroup2?: string[] | string; // Title for service group 2

  complaintDescription?: string;
  resolutionSummary?: string;
  
  warrantyExpiry?: string; // These might be part of partDetails in the final MaintenanceTask
  warrantyStatus?: 'valid' | 'expired' | 'not_applicable';
  warrantyClaimed?: boolean;
  
  partReplaced?: boolean;
  partDetails?: { // This structure should match what the form provides
    name?: string;
    serialNumber?: string;
    brand?: string;
    warrantyExpiryDate?: string;
  };
  partsRequired?: MaintenanceTask['parts_required']; // Use the type from MaintenanceTask

  startDate?: string;
  endDate?: string;
  serviceHours?: '4' | '6' | '8' | '12';
  downtimeDays?: number;
  odometerReading?: number;
  odometerImage?: string; // Assuming form might provide this

  nextServiceDue?: { // Structure from form
    date?: string;
    odometer?: number;
    reminderSet?: boolean; // Form might use reminderSet
  };
  // nextPredictedService is usually calculated, not directly from form
  // overdueStatus is also calculated

  attachments?: string[]; // Or File[] depending on FileUpload component
  notes?: string;

  // Include any other fields that MaintenanceTaskForm might submit
  // This interface should accurately reflect the output of the form
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

  const handleSubmit = async (formData: MaintenanceFormData) => {
    setIsSubmitting(true);
    try {
      if (id && id !== 'new') {
        // Update existing task
        const confirmUpdate = window.confirm('Are you sure you want to update this maintenance task?');
        if (!confirmUpdate) {
          setIsSubmitting(false);
          return;
        }

        // Transform formData for update (camelCase from form to snake_case for DB)
        const updatePayload: Partial<MaintenanceTask> = {
          ...(formData.vehicleId && { vehicle_id: formData.vehicleId }),
          ...(formData.taskType && { task_type: formData.taskType }),
          ...(formData.title && { title: Array.isArray(formData.title) ? formData.title : [formData.title] }),
          ...(formData.description && { description: formData.description }),
          ...(formData.status && { status: formData.status }),
          ...(formData.priority && { priority: formData.priority }),
          ...(formData.vendorId && { vendor_id: formData.vendorId }),
          ...(formData.garageId && { garage_id: formData.garageId }),
          ...(formData.estimatedCost !== undefined && { estimated_cost: formData.estimatedCost }),
          ...(formData.actualCost !== undefined && { actual_cost: formData.actualCost }),
          ...(formData.complaintDescription && { complaint_description: formData.complaintDescription }),
          ...(formData.resolutionSummary && { resolution_summary: formData.resolutionSummary }),
          ...(formData.warrantyExpiry && { warranty_expiry: formData.warrantyExpiry }),
          ...(formData.warrantyStatus && { warranty_status: formData.warrantyStatus }),
          ...(typeof formData.warrantyClaimed === 'boolean' && { warranty_claimed: formData.warrantyClaimed }),
          ...(typeof formData.partReplaced === 'boolean' && { part_replaced: formData.partReplaced }),
          ...(formData.partDetails && { 
            part_details: {
              name: formData.partDetails.name || '',
              serial_number: formData.partDetails.serialNumber || '',
              brand: formData.partDetails.brand || '',
              warranty_expiry_date: formData.partDetails.warrantyExpiryDate || ''
            }
          }),
          ...(formData.partsRequired && { parts_required: formData.partsRequired }),
          ...(formData.startDate && { start_date: formData.startDate }),
          ...(formData.endDate && { end_date: formData.endDate }),
          ...(formData.serviceHours && { service_hours: formData.serviceHours }),
          ...(formData.downtimeDays !== undefined && { downtime_days: formData.downtimeDays }),
          ...(formData.odometerReading !== undefined && { odometer_reading: formData.odometerReading }),
          ...(formData.odometerImage && { odometer_image: formData.odometerImage }),
          ...(formData.nextServiceDue && { 
            next_service_due: {
              date: formData.nextServiceDue.date || '',
              odometer: formData.nextServiceDue.odometer || 0,
              reminder_set: typeof formData.nextServiceDue.reminderSet === 'boolean' ? formData.nextServiceDue.reminderSet : false
            }
          }),
          ...(formData.attachments && { attachments: formData.attachments }),
          ...(formData.notes && { notes: formData.notes }),
        };
         // Remove undefined properties from updatePayload
        Object.keys(updatePayload).forEach(key => {
          const K = key as keyof typeof updatePayload;
          if (updatePayload[K] === undefined) {
            delete updatePayload[K];
          }
        });

        const updatedTask = await updateTask(id, updatePayload);
        if (updatedTask) {
          setTask(updatedTask);
          toast.success('Maintenance task updated successfully');
          navigate('/maintenance');
        }
      } else {
        // Create new task
        const billsToCreate: MaintenanceBill[] = [];
        // Corrected: use formData.startDate (camelCase from form)
        const defaultBillDate = formData.startDate || new Date().toISOString().split('T')[0];
        // Corrected: use formData.vendorId (camelCase from form)
        const vendorNamePlaceholder = formData.vendorId ? `Vendor ID: ${formData.vendorId}` : 'N/A';

        if (formData.billGroup1 && typeof formData.billGroup1 === 'number' && formData.billGroup1 > 0) {
          billsToCreate.push({
            id: crypto.randomUUID(),
            description: Array.isArray(formData.title) ? formData.title.join(', ') : (formData.title || 'Service Group 1'),
            amount: formData.billGroup1,
            vendor_name: vendorNamePlaceholder,
            bill_date: defaultBillDate,
          });
        }

        if (formData.billGroup2 && typeof formData.billGroup2 === 'number' && formData.billGroup2 > 0 && formData.titleGroup2) {
          billsToCreate.push({
            id: crypto.randomUUID(),
            description: Array.isArray(formData.titleGroup2) ? formData.titleGroup2.join(', ') : (formData.titleGroup2 || 'Service Group 2'),
            amount: formData.billGroup2,
            vendor_name: vendorNamePlaceholder,
            bill_date: defaultBillDate,
          });
        }
        
        // Removed duplicate declarations that were here

        const newTaskPayload: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'> = {
          vehicle_id: formData.vehicleId || '',
          task_type: formData.taskType || 'general_scheduled',
          title: Array.isArray(formData.title) ? formData.title : (formData.title ? [formData.title] : []),
          description: formData.description || '',
          status: formData.status || 'open',
          priority: formData.priority || 'medium',
          vendor_id: formData.vendorId || '',
          garage_id: formData.garageId || '',
          estimated_cost: formData.estimatedCost || 0,
          actual_cost: formData.actualCost, // optional
          bills: billsToCreate,
          complaint_description: formData.complaintDescription,
          resolution_summary: formData.resolutionSummary,
          warranty_expiry: formData.warrantyExpiry,
          warranty_status: formData.warrantyStatus,
          warranty_claimed: typeof formData.warrantyClaimed === 'boolean' ? formData.warrantyClaimed : false,
          part_replaced: typeof formData.partReplaced === 'boolean' ? formData.partReplaced : false,
          part_details: formData.partDetails ? { 
              name: formData.partDetails.name || '',
              // Corrected: map form's camelCase to type's snake_case for part_details
              serial_number: formData.partDetails.serialNumber || '', 
              brand: formData.partDetails.brand || '',
              warranty_expiry_date: formData.partDetails.warrantyExpiryDate || ''
          } : undefined,
          parts_required: formData.partsRequired || [],
          start_date: formData.startDate || defaultBillDate, // Ensure start_date is correctly used
          end_date: formData.endDate,
          service_hours: formData.serviceHours,
          downtime_days: formData.downtimeDays || 0,
          odometer_reading: formData.odometerReading || 0,
          odometer_image: formData.odometerImage,
          next_service_due: formData.nextServiceDue ? {
              date: formData.nextServiceDue.date || '',
              odometer: formData.nextServiceDue.odometer || 0,
              reminder_set: typeof formData.nextServiceDue.reminderSet === 'boolean' ? formData.nextServiceDue.reminderSet : false,
          } : undefined,
          // next_predicted_service and overdue_status are typically not set from form directly
          attachments: formData.attachments,
          notes: formData.notes,
        };
        
        // Clean up undefined values from payload that are optional in DB
        // This also helps ensure we don't send fields like billGroup1 to Supabase
        const cleanedPayload = { ...newTaskPayload };
        Object.keys(cleanedPayload).forEach(key => {
          const K = key as keyof typeof cleanedPayload;
          if (cleanedPayload[K] === undefined) {
            delete cleanedPayload[K];
          }
        });

        const createdTask = await createTask(cleanedPayload as Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>);
        if (createdTask) {
          toast.success('Maintenance task created successfully');
          navigate('/maintenance');
        } else {
          toast.error('Failed to create maintenance task. Please check console for errors.');
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
