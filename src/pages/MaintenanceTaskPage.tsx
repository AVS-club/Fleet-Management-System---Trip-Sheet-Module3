import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MaintenanceTaskForm from '../components/maintenance/MaintenanceTaskForm';
import { MaintenanceTask, Vehicle } from '../types';
import { getTask, updateTask, deleteTask } from '../utils/maintenanceStorage';
import { getVehicles } from '../utils/storage';
import Button from '../components/ui/Button';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

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

  const handleSubmit = async (data: Partial<MaintenanceTask>) => {
    if (!id || id === 'new') return;

    const confirmUpdate = window.confirm('Are you sure you want to update this maintenance task?');
    if (!confirmUpdate) return;

    setIsSubmitting(true);
    try {
      const updatedTask = await updateTask(id, data);
      if (updatedTask) {
        setTask(updatedTask);
        toast.success('Maintenance task updated successfully');
        navigate('/maintenance');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update maintenance task');
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