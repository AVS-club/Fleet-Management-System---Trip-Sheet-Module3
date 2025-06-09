import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { MaintenanceTask, Vehicle, MAINTENANCE_ITEMS } from '../../types';
import { DEMO_VENDORS, PART_BRANDS } from '../../types/maintenance';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import FileUpload from '../ui/FileUpload';
import Button from '../ui/Button';
import MaintenanceSelector from './MaintenanceSelector';
import VendorSelector from './VendorSelector';
import GarageSelector from './GarageSelector';
import MaintenanceAuditLog from './MaintenanceAuditLog';
import { PenTool as Tool, Calendar, Truck, Clock, CheckCircle, AlertTriangle, IndianRupee, FileText, Bell } from 'lucide-react';
import { predictNextService } from '../../utils/maintenancePredictor';
import { getAuditLogs } from '../../utils/maintenanceStorage';

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
  const [showGroupUp, setShowGroupUp] = useState(false);
  const [showPartDetails, setShowPartDetails] = useState(false);
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
      taskType: 'general_scheduled',
      priority: 'medium',
      status: 'open',
      estimatedCost: 0,
      partsRequired: [],
      startDate: new Date().toISOString().split('T')[0],
      title: [],
      warrantyClaimed: false,
      partReplaced: false,
      billGroup1: 0,
      billGroup2: 0,
      ...initialData
    }
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const vehicleId = watch('vehicleId');
  const odometerReading = watch('odometerReading');
  const taskType = watch('taskType');
  const partReplaced = watch('partReplaced');
  const billGroup1 = watch('billGroup1') || 0;
  const billGroup2 = watch('billGroup2') || 0;
  const title = watch('title');

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setValue('downtimeDays', diffDays);
    }
  }, [startDate, endDate, setValue]);

  useEffect(() => {
    if (vehicleId && odometerReading) {
      const prediction = predictNextService(vehicleId, odometerReading);
      if (prediction) {
        setValue('nextPredictedService', prediction);
      }
    }
  }, [vehicleId, odometerReading, setValue]);

  useEffect(() => {
    const total = billGroup1 + (showGroupUp ? billGroup2 : 0);
    setValue('totalBillAmount', total);
  }, [billGroup1, billGroup2, showGroupUp, setValue]);

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Vehicle & Basic Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Truck className="h-5 w-5 mr-2 text-primary-500" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            control={control}
            name="vehicleId"
            rules={{ required: 'Vehicle is required' }}
            render={({ field }) => (
              <Select
                label="Vehicle"
                icon={<Truck className="h-4 w-4" />}
                options={vehicles.map(vehicle => ({
                  value: vehicle.id,
                  label: `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}`
                }))}
                error={errors.vehicleId?.message}
                required
                {...field}
              />
            )}
          />

          <Controller
            control={control}
            name="taskType"
            rules={{ required: 'Task type is required' }}
            render={({ field }) => (
              <Select
                label="Maintenance Type"
                icon={<Tool className="h-4 w-4" />}
                options={[
                  { value: 'general_scheduled', label: 'General Scheduled' },
                  { value: 'emergency_breakdown', label: 'Emergency Breakdown' },
                  { value: 'driver_damage', label: 'Driver Damage' },
                  { value: 'warranty_claim', label: 'Warranty Claim' }
                ]}
                error={errors.taskType?.message}
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

      {/* Service Provider Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Service Provider Details</h3>

        <Controller
          control={control}
          name="vendorId"
          rules={{ required: 'Service vendor is required' }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <VendorSelector
              selectedVendor={value}
              onChange={onChange}
              error={error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="garageId"
          rules={{ required: 'Service location is required' }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <GarageSelector
              selectedGarage={value}
              onChange={onChange}
              error={error?.message}
            />
          )}
        />
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Maintenance Tasks</h3>
          <Checkbox
            label="Add Multiple Service Groups"
            checked={showGroupUp}
            onChange={(e) => setShowGroupUp(e.target.checked)}
          />
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-4">Service Group 1</h4>
            <Controller
              control={control}
              name="title"
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

            <div className="mt-4">
              <Controller
                control={control}
                name="partReplaced"
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    label="Parts Replaced?"
                    checked={value}
                    onChange={(e) => {
                      onChange(e.target.checked);
                      setShowPartDetails(e.target.checked);
                    }}
                  />
                )}
              />
            </div>

            {showPartDetails && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-gray-200">
                <Input
                  label="Part Name"
                  {...register('partDetails.name', {
                    required: partReplaced ? 'Part name is required' : false
                  })}
                  error={errors.partDetails?.name?.message}
                />

                <Input
                  label="Serial Number"
                  {...register('partDetails.serialNumber', {
                    required: partReplaced ? 'Serial number is required' : false
                  })}
                  error={errors.partDetails?.serialNumber?.message}
                />

                <Controller
                  control={control}
                  name="partDetails.brand"
                  rules={{ required: partReplaced ? 'Brand is required' : false }}
                  render={({ field }) => (
                    <Select
                      label="Brand"
                      options={PART_BRANDS.map(brand => ({
                        value: brand,
                        label: brand
                      }))}
                      error={errors.partDetails?.brand?.message}
                      {...field}
                    />
                  )}
                />

                <Input
                  label="Warranty Expiry Date"
                  type="date"
                  {...register('partDetails.warrantyExpiryDate')}
                />
              </div>
            )}

            <div className="mt-4">
              <Input
                label="Cost (₹)"
                type="number"
                icon={<IndianRupee className="h-4 w-4" />}
                {...register('billGroup1', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Cost must be positive' }
                })}
                error={errors.billGroup1?.message}
              />
            </div>
          </div>

          {showGroupUp && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-700 mb-4">Service Group 2</h4>
              <Controller
                control={control}
                name="titleGroup2"
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                  <MaintenanceSelector
                    selectedItems={value || []}
                    onChange={onChange}
                    showGroupView={true}
                    error={error?.message}
                  />
                )}
              />

              <div className="mt-4">
                <Input
                  label="Cost (₹)"
                  type="number"
                  icon={<IndianRupee className="h-4 w-4" />}
                  {...register('billGroup2', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Cost must be positive' }
                  })}
                  error={errors.billGroup2?.message}
                />
              </div>
            </div>
          )}

          <div className="p-4 bg-success-50 rounded-lg border border-success-200">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-success-700">Total Cost</h4>
              <p className="text-lg font-semibold text-success-700">
                ₹{(billGroup1 + (showGroupUp ? billGroup2 : 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Complaint & Resolution */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Complaint & Resolution</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complaint Description
            </label>
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Detailed description of the complaint or issue..."
              {...register('complaintDescription')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution Summary
            </label>
            <textarea
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Summary of the resolution or fix applied..."
              {...register('resolutionSummary')}
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
            error={errors.startDate?.message}
            required
            {...register('startDate', { required: 'Start date is required' })}
          />

          <Input
            label="End Date"
            type="date"
            icon={<Calendar className="h-4 w-4" />}
            error={errors.endDate?.message}
            {...register('endDate')}
          />

          {startDate && endDate && startDate === endDate ? (
            <Controller
              control={control}
              name="serviceHours"
              render={({ field }) => (
                <Select
                  label="Service Hours"
                  icon={<Clock className="h-4 w-4" />}
                  options={[
                    { value: '4', label: '4 Hours' },
                    { value: '6', label: '6 Hours' },
                    { value: '8', label: '8 Hours' },
                    { value: '12', label: '12 Hours' }
                  ]}
                  {...field}
                />
              )}
            />
          ) : (
            <Input
              label="Downtime (Days)"
              type="number"
              icon={<Clock className="h-4 w-4" />}
              error={errors.downtimeDays?.message}
              readOnly
              {...register('downtimeDays')}
            />
          )}
        </div>

        <Input
          label="Odometer Reading"
          type="number"
          icon={<Tool className="h-4 w-4" />}
          error={errors.odometerReading?.message}
          required
          {...register('odometerReading', {
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
              {...register('nextServiceDue.date')}
            />

            <Input
              label="Next Service Odometer"
              type="number"
              icon={<Tool className="h-4 w-4" />}
              {...register('nextServiceDue.odometer', {
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
              helperText="Upload invoice, warranty card, or other relevant documents"
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