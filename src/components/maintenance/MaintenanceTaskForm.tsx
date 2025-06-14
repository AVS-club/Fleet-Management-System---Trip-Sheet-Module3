import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { MaintenanceTask, Vehicle, MAINTENANCE_ITEMS, MaintenanceServiceGroup } from '../../types';
import { DEMO_VENDORS, PART_BRANDS, DEMO_GARAGES } from '../../types/maintenance';
import { addDays, addHours, format, parse } from 'date-fns';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import MaintenanceSelector from './MaintenanceSelector';
import VendorSelector from './VendorSelector';
import MaintenanceAuditLog from './MaintenanceAuditLog';
import SpeechToTextButton from '../ui/SpeechToTextButton';
import { PenTool as Tool, Calendar, Truck, Clock, CheckCircle, AlertTriangle, IndianRupee, FileText, Bell, Plus, Trash2, Paperclip, Mic } from 'lucide-react';
import { predictNextService } from '../../utils/maintenancePredictor';
import { getAuditLogs } from '../../utils/maintenanceStorage';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-toastify';

interface MaintenanceTaskFormProps {
  onSubmit: (data: Partial<MaintenanceTask>) => void;
  vehicles: Vehicle[];
  initialData?: Partial<MaintenanceTask>;
  isSubmitting?: boolean;
}

const MaintenanceTaskForm: React.FC<MaintenanceTaskFormProps> = ({
  onSubmit,
  vehicles,
  initialData,
  isSubmitting
}) => {
  const [setReminder, setSetReminder] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    averageReplacementKm?: number;
    averageReplacementDays?: number;
    confidence: number;
  }>({
    confidence: 0
  });

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<Partial<MaintenanceTask>>({
    defaultValues: {
      task_type: 'general_scheduled_service',
      priority: 'medium',
      status: 'open',
      estimated_cost: 0,
      parts_required: [],
      start_date: new Date().toISOString().split('T')[0],
      title: [],
      warranty_claimed: false,
      service_groups: initialData?.service_groups && initialData.service_groups.length > 0 
        ? initialData.service_groups 
        : [{ 
            vendor_id: '', 
            tasks: [], 
            cost: 0
          }],
      ...initialData
    }
  });

  // Use fieldArray for service groups
  const { fields: serviceGroups, append, remove } = useFieldArray({
    control,
    name: 'service_groups'
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');
  const vehicleId = watch('vehicle_id');
  const odometerReading = watch('odometer_reading');
  const taskType = watch('task_type');
  const title = watch('title');
  const serviceGroupsWatch = watch('service_groups');
  const downtimePeriod = watch('downtime_period');
  
  // Get current values of the text areas for speech-to-text functionality
  const complaintDescription = watch('complaint_description') || '';
  const resolutionSummary = watch('resolution_summary') || '';

  // Handle speech-to-text transcripts
  const handleComplaintTranscript = (text: string) => {
    setValue('complaint_description', complaintDescription ? `${complaintDescription} ${text}` : text);
  };

  const handleResolutionTranscript = (text: string) => {
    setValue('resolution_summary', resolutionSummary ? `${resolutionSummary} ${text}` : text);
  };

  // Calculate end date based on start date and downtime period
  useEffect(() => {
    if (startDate && downtimePeriod && downtimePeriod !== 'custom') {
      try {
        // Parse the start date
        const parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          console.error('Invalid start date');
          return;
        }

        let newEndDate: Date;

        // Calculate end date based on downtime period
        if (downtimePeriod.includes('hr')) {
          // Extract hours from the period (e.g., "4hr" → 4)
          const hours = parseInt(downtimePeriod.replace('hr', ''), 10);
          newEndDate = addHours(parsedStartDate, hours);
        } else if (downtimePeriod === '1day') {
          newEndDate = addDays(parsedStartDate, 1);
        } else if (downtimePeriod === '2days') {
          newEndDate = addDays(parsedStartDate, 2);
        } else if (downtimePeriod === '3days') {
          newEndDate = addDays(parsedStartDate, 3);
        } else if (downtimePeriod === '1week') {
          newEndDate = addDays(parsedStartDate, 7);
        } else {
          // For any other case, don't modify the end date
          return;
        }

        // Format the end date as YYYY-MM-DD
        const formattedEndDate = format(newEndDate, 'yyyy-MM-dd');
        setValue('end_date', formattedEndDate);

        // Calculate downtime days
        const downtimeDays = downtimePeriod.includes('day') || downtimePeriod === '1week'
          ? Math.round((newEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        setValue('downtime_days', downtimeDays);
      } catch (error) {
        console.error('Error calculating end date:', error);
      }
    } else if (downtimePeriod === 'custom') {
      // If custom is selected, clear the end date to let the user set it manually
      setValue('end_date', '');
      setValue('downtime_days', 0);
    }
  }, [startDate, downtimePeriod, setValue]);

  // Auto-fill odometer reading based on vehicle and start date
  useEffect(() => {
    const fetchLastOdometer = async () => {
      if (!vehicleId || !startDate) return;
      
      try {
        // Query the trips table to find the latest trip for this vehicle before the start date
        const { data, error } = await supabase
          .from('trips')
          .select('end_km')
          .eq('vehicle_id', vehicleId)
          .lt('trip_end_date', startDate)
          .order('trip_end_date', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Error fetching last odometer reading:', error);
          return;
        }
        
        if (data && data.length > 0 && data[0].end_km) {
          // Set the odometer reading to the end_km of the last trip
          setValue('odometer_reading', data[0].end_km);
          console.log(`Auto-filled odometer reading with ${data[0].end_km} from previous trip`);
        } else {
          // If no trips found, try to use the current_odometer from the vehicle
          const vehicle = vehicles.find(v => v.id === vehicleId);
          if (vehicle && vehicle.current_odometer) {
            setValue('odometer_reading', vehicle.current_odometer);
            console.log(`Auto-filled odometer reading with ${vehicle.current_odometer} from vehicle data`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch last odometer reading:', err);
      }
    };
    
    fetchLastOdometer();
  }, [vehicleId, startDate, setValue, vehicles]);

  // Calculate total cost from service groups
  useEffect(() => {
    if (serviceGroupsWatch && serviceGroupsWatch.length > 0) {
      const totalCost = serviceGroupsWatch.reduce((sum, group) => {
        return sum + (parseFloat(group.cost as any) || 0);
      }, 0);
      setValue('actual_cost', totalCost);
    }
  }, [serviceGroupsWatch, setValue]);

  useEffect(() => {
    if (vehicleId && odometerReading) {
      const prediction = predictNextService(vehicleId, odometerReading);
      if (prediction) {
        setValue('next_predicted_service', prediction);
      }
    }
  }, [vehicleId, odometerReading, setValue]);

  useEffect(() => {
    if (vehicleId && odometerReading && title?.length > 0) {
      // Calculate AI suggestions based on historical data
      const suggestions = predictNextService(vehicleId, odometerReading);
      if (suggestions) {
        setAiSuggestions(suggestions);
      }
    }
  }, [vehicleId, odometerReading, title]);

  // Get audit logs for this task
  const auditLogs = initialData?.id ? getAuditLogs().filter(log => log.taskId === initialData.id) : [];

  const handleFormSubmit = (data: any) => {
    try {
      console.log("Form submission data:", data);
      
      // Basic validation
      if (!data.vehicle_id) {
        toast.error("Please select a vehicle");
        return;
      }
      
      if (!data.start_date) {
        toast.error("Please set a start date");
        return;
      }
      
      if ((!Array.isArray(data.title) || data.title.length === 0) && 
          (!Array.isArray(data.service_groups) || !data.service_groups.length || 
           !data.service_groups[0].tasks || !data.service_groups[0].tasks.length)) {
        toast.error("Please select at least one maintenance task");
        return;
      }
      
      if (!data.service_groups?.[0]?.vendor_id) {
        toast.error("Please select a vendor for the service");
        return;
      }
      
      onSubmit(data);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Form submission failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Vehicle & Basic Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            control={control}
            name="vehicle_id"
            rules={{ required: 'Vehicle is required' }}
            render={({ field }) => (
              <Select
                label="Vehicle"
                icon={<Truck className="h-4 w-4" />}
                options={vehicles.map(vehicle => ({
                  value: vehicle.id,
                  label: `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}`
                }))}
                error={errors.vehicle_id?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="task_type"
            rules={{ required: 'Task type is required' }}
            render={({ field }) => (
              <Select
                label="Maintenance Type"
                icon={<Tool className="h-4 w-4" />}
                options={[
                  { value: 'general_scheduled_service', label: 'General Scheduled Service' },
                  { value: 'wear_and_tear_replacement_repairs', label: 'Wear and Tear / Replacement Repairs' },
                  { value: 'accidental', label: 'Accidental' },
                  { value: 'others', label: 'Others' }
                ]}
                error={errors.task_type?.message}
                required
                {...field}
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="priority"
          rules={{ required: 'Priority is required' }}
          render={({ field }) => (
            <Select
              label="Priority"
              icon={<AlertTriangle className="h-4 w-4" />}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' }
              ]}
              error={errors.priority?.message}
              required
              {...field}
            />
          )}
        />
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Tool className="h-5 w-5 mr-2 text-primary-500" />
          Service Groups
        </h3>
        <p className="text-sm text-gray-500">Add one or more service groups to this maintenance task</p>

        <div className="space-y-4">
          {serviceGroups.map((field, index) => (
            <div key={field.id} className="border rounded-lg relative overflow-hidden">
              <div className="bg-gray-50 p-3 pr-10 border-b flex items-center justify-between">
                <h4 className="font-medium text-gray-800">Service Group {index + 1}</h4>
                {serviceGroups.length > 1 && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-error-500 transition-colors"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Vendor selector */}
                  <Controller
                    control={control}
                    name={`service_groups.${index}.vendor_id` as const}
                    rules={{ required: 'Vendor is required' }}
                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                      <VendorSelector
                        selectedVendor={value}
                        onChange={onChange}
                        error={error?.message}
                      />
                    )}
                  />

                  {/* Maintenance tasks */}
                  <Controller
                    control={control}
                    name={`service_groups.${index}.tasks` as const}
                    rules={{ required: 'At least one task must be selected' }}
                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                      <MaintenanceSelector
                        selectedItems={value || []}
                        onChange={onChange}
                        showGroupView={true}
                        error={error?.message}
                      />
                    )}
                  />

                  {/* Cost input */}
                  <Input
                    label="Cost (₹)"
                    type="number"
                    icon={<IndianRupee className="h-4 w-4" />}
                    error={errors.service_groups?.[index]?.cost?.message}
                    required
                    {...register(`service_groups.${index}.cost` as const, {
                      required: 'Cost is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'Cost must be positive' }
                    })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 items-end">
                  {/* Bill upload */}
                  <Controller
                    control={control}
                    name={`service_groups.${index}.bill_file` as const}
                    render={({ field: { value, onChange } }) => (
                      <FileUpload
                        buttonMode={true}
                        label="Upload Bill"
                        accept=".jpg,.jpeg,.png,.pdf"
                        value={value as File | null}
                        onChange={onChange}
                        icon={<Paperclip className="h-4 w-4" />}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({
              vendor_id: '',
              tasks: [],
              cost: 0
            })}
            icon={<Plus className="h-4 w-4" />}
          >
            + Add Service Group
          </Button>

          {serviceGroupsWatch && serviceGroupsWatch.length > 0 && (
            <div className="p-4 bg-success-50 rounded-lg border border-success-200">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-success-700">Total Cost</h4>
                <p className="text-lg font-semibold text-success-700">
                  ₹{serviceGroupsWatch.reduce((sum, group) => sum + (parseFloat(group.cost as any) || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complaint & Resolution */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Tool className="h-5 w-5 mr-2 text-primary-500" />
          Complaint & Resolution
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Complaint Description
              </label>
              <div className="flex">
                <SpeechToTextButton 
                  onTranscript={handleComplaintTranscript} 
                  language="hi-IN" 
                  title="Dictate in Hindi"
                />
                <SpeechToTextButton 
                  onTranscript={handleComplaintTranscript} 
                  language="mr-IN" 
                  title="Dictate in Marathi"
                  buttonClassName="ml-2"
                />
                <SpeechToTextButton 
                  onTranscript={handleComplaintTranscript} 
                  language="en-IN" 
                  title="Dictate in English"
                  buttonClassName="ml-2"
                />
              </div>
            </div>
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Detailed description of the complaint or issue..."
              {...register('complaint_description')}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Resolution Summary
              </label>
              <div className="flex">
                <SpeechToTextButton 
                  onTranscript={handleResolutionTranscript} 
                  language="hi-IN" 
                  title="Dictate in Hindi"
                />
                <SpeechToTextButton 
                  onTranscript={handleResolutionTranscript} 
                  language="mr-IN" 
                  title="Dictate in Marathi"
                  buttonClassName="ml-2"
                />
                <SpeechToTextButton 
                  onTranscript={handleResolutionTranscript} 
                  language="en-IN" 
                  title="Dictate in English"
                  buttonClassName="ml-2"
                />
              </div>
            </div>
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Summary of the resolution or fix applied..."
              {...register('resolution_summary')}
            />
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Service Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Start Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.start_date?.message}
            required
            {...register('start_date', { required: 'Start date is required' })}
          />

          <Input
            label="End Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.end_date?.message}
            {...register('end_date')}
          />

          <Controller
            control={control}
            name="downtime_period"
            render={({ field }) => (
              <Select
                label="Downtime Period"
                icon={<Clock className="h-4 w-4" />}
                options={[
                  { value: '2hr', label: '2 Hours' },
                  { value: '4hr', label: '4 Hours' },
                  { value: '6hr', label: '6 Hours' },
                  { value: '12hr', label: '12 Hours' },
                  { value: '1day', label: '1 Day' },
                  { value: '2days', label: '2 Days' },
                  { value: '3days', label: '3 Days' },
                  { value: '1week', label: '1 Week' },
                  { value: 'custom', label: 'Custom' }
                ]}
                {...field}
              />
            )}
          />
        </div>

        <Input
          label="Odometer Reading"
          type="number"
          icon={<Tool className="h-4 w-4" />}
          error={errors.odometer_reading?.message}
          required
          {...register('odometer_reading', {
            required: 'Odometer reading is required',
            valueAsNumber: true,
            min: { value: 0, message: 'Odometer reading must be positive' }
          })}
        />

        <Controller
          control={control}
          name="status"
          rules={{ required: 'Status is required' }}
          render={({ field }) => (
            <Select
              label="Status"
              icon={<AlertTriangle className="h-4 w-4" />}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'escalated', label: 'Escalated' },
                { value: 'rework', label: 'Rework Required' }
              ]}
              error={errors.status?.message}
              required
              {...field}
            />
          )}
        />
      </div>

      {/* Next Service Reminder */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary-500" />
            Next Service Reminder
          </h3>
          <Checkbox
            label="Set Reminder"
            checked={setReminder}
            onChange={(e) => setSetReminder(e.target.checked)}
          />
        </div>

        {setReminder && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Next Service Date"
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              {...register('next_service_due.date')}
            />

            <Input
              label="Next Service Odometer"
              type="number"
              icon={<Tool className="h-4 w-4" />}
              {...register('next_service_due.odometer', {
                valueAsNumber: true,
                min: { value: odometerReading || 0, message: 'Must be greater than current reading' }
              })}
            />
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>

        <Controller
          control={control}
          name="attachments"
          render={({ field: { value, onChange } }) => (
            <FileUpload
              label="Upload Documents"
              value={value as File | null}
              onChange={onChange}
              accept=".jpg,.jpeg,.png,.pdf"
              helperText="Upload warranty card, or other relevant documents"
              icon={<FileText className="h-4 w-4" />}
            />
          )}
        />
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.averageReplacementKm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
            <div>
              <h4 className="text-blue-700 font-medium">AI-Suggested Maintenance Intervals</h4>
              <p className="text-blue-600 text-sm mt-1">
                Based on historical data, this maintenance is typically needed:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>Every {Math.round(aiSuggestions.averageReplacementKm).toLocaleString()} km</li>
                {aiSuggestions.averageReplacementDays && (
                  <li>Every {Math.round(aiSuggestions.averageReplacementDays)} days</li>
                )}
              </ul>
              <p className="text-blue-500 text-xs mt-2">
                Confidence: {Math.round(aiSuggestions.confidence)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {initialData?.id && auditLogs.length > 0 && (
        <div className="mt-8">
          <MaintenanceAuditLog taskId={initialData.id} logs={auditLogs} />
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-4 pt-6">
        <Button
          type="submit"
          isLoading={isSubmitting}
          icon={<CheckCircle className="h-4 w-4" />}
        >
          {initialData ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};

export default MaintenanceTaskForm;