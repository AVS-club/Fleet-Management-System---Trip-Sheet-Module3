import React, { useState, useCallback } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { Vehicle } from '@/types';
import { MaintenanceTask } from '@/types/maintenance';
import FileUploadWithProgress from '../ui/FileUploadWithProgress';
import { toast } from 'react-toastify';
import { 
  Calendar,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Wrench,
  FileText,
  Upload
} from 'lucide-react';
import '../../styles/FileUploadWithProgress.css';

interface EnhancedMaintenanceFormProps {
  onSubmit: (data: Partial<MaintenanceTask>) => void;
  vehicles: Vehicle[];
  initialData?: Partial<MaintenanceTask>;
  isSubmitting: boolean;
}

const EnhancedMaintenanceForm: React.FC<EnhancedMaintenanceFormProps> = ({
  onSubmit,
  vehicles,
  initialData,
  isSubmitting: externalIsSubmitting
}) => {
  // Form states
  const [odometerPhoto, setOdometerPhoto] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  
  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const methods = useForm<Partial<MaintenanceTask>>({
    defaultValues: {
      task_type: "general_scheduled_service",
      priority: "medium",
      status: "open",
      estimated_cost: 0,
      parts_required: [],
      start_date: new Date().toISOString().split("T")[0],
      title: [],
      warranty_claimed: false,
      downtime_days: 0,
      downtime_hours: 0,
      service_groups: [
        {
          vendor_id: "",
          tasks: [],
          cost: 0,
          battery_tracking: false,
          tyre_tracking: false,
        },
      ],
      ...initialData,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = methods;

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const odometerReading = watch("odometer_reading");
  const downtimeDays = watch("downtime_days");
  const downtimeHours = watch("downtime_hours");
  const status = watch("status");
  const complaintDescription = watch("complaint_description");
  const resolutionSummary = watch("resolution_summary");

  // Handle form submission with upload progress
  const handleFormSubmit = useCallback(async (data: Partial<MaintenanceTask>) => {
    if (isSubmitting || externalIsSubmitting) return;
    
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    setOverallProgress(0);
    
    try {
      // Validation
      if (!data.start_date) {
        throw new Error('Start date is required');
      }
      if (!data.end_date) {
        throw new Error('End date is required');
      }
      if (!data.odometer_reading) {
        throw new Error('Odometer reading is required');
      }
      
      // Prepare form data with files
      const formData = {
        ...data,
        odometer_image: odometerPhoto,
        attachments: documents,
      };
      
      setOverallProgress(10);
      
      // Simulate upload progress (replace with actual upload logic)
      const uploadProgress = setInterval(() => {
        setOverallProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadProgress);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Submit the form
      await onSubmit(formData);
      
      setOverallProgress(100);
      setSubmitSuccess(true);
      
      console.log('✅ Task created successfully');
      
      // Show success for 2 seconds then reset
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsSubmitting(false);
        setOverallProgress(0);
        // Reset form or navigate
      }, 2000);
      
    } catch (error) {
      console.error('❌ Submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create task');
      setIsSubmitting(false);
      setOverallProgress(0);
    }
  }, [isSubmitting, externalIsSubmitting, startDate, endDate, odometerReading, 
      odometerPhoto, documents, onSubmit]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="enhanced-maintenance-form">
        <div className="form-header">
          <h2 className="form-title">
            <Wrench className="h-6 w-6" />
            Service Details
          </h2>
        </div>
        
        {/* Date fields */}
        <div className="form-section">
          <h3 className="section-title">
            <Calendar className="h-5 w-5" />
            Service Period
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input 
                type="date" 
                {...register("start_date", { required: "Start date is required" })}
                className={errors.start_date ? 'error' : ''}
              />
              {errors.start_date && (
                <span className="error-text">{errors.start_date.message}</span>
              )}
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input 
                type="date" 
                {...register("end_date", { required: "End date is required" })}
                className={errors.end_date ? 'error' : ''}
              />
              {errors.end_date && (
                <span className="error-text">{errors.end_date.message}</span>
              )}
            </div>
          </div>
        </div>

        {/* Downtime tracking */}
        <div className="form-section">
          <h3 className="section-title">
            <Clock className="h-5 w-5" />
            Downtime Tracking
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Days</label>
              <input 
                type="number" 
                {...register("downtime_days", { min: 0 })}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Hours</label>
              <input 
                type="number" 
                {...register("downtime_hours", { min: 0, max: 23 })}
                min="0"
                max="23"
              />
            </div>
          </div>
        </div>

        {/* Complaint & Resolution */}
        <div className="form-section">
          <h3 className="section-title">
            <AlertTriangle className="h-5 w-5" />
            Issue Details
          </h3>
          <div className="form-group">
            <label>Complaint Description</label>
            <textarea 
              {...register("complaint_description")}
              rows={4}
              placeholder="Detailed description of the complaint or issue..."
            />
          </div>

          <div className="form-group">
            <label>Resolution Summary</label>
            <textarea 
              {...register("resolution_summary")}
              rows={4}
              placeholder="Summary of the resolution or fix applied..."
            />
          </div>
        </div>

        {/* Odometer */}
        <div className="form-section">
          <h3 className="section-title">
            <Truck className="h-5 w-5" />
            Vehicle Information
          </h3>
          <div className="form-group">
            <label>Odometer Reading *</label>
            <input 
              type="number" 
              {...register("odometer_reading", { required: "Odometer reading is required" })}
              placeholder="Enter odometer reading"
              className={errors.odometer_reading ? 'error' : ''}
            />
            {errors.odometer_reading && (
              <span className="error-text">{errors.odometer_reading.message}</span>
            )}
          </div>
        </div>

        {/* File Uploads with Individual Progress */}
        <div className="form-section">
          <h3 className="section-title">
            <Upload className="h-5 w-5" />
            Document Upload
          </h3>
          
          <FileUploadWithProgress
            id="odometerPhoto"
            label="Odometer Photo"
            accept="image/jpeg,image/jpg,image/png"
            multiple={false}
            compress={true}
            maxSize={5 * 1024 * 1024}
            onFilesChange={setOdometerPhoto}
            helperText="Upload a clear photo of the odometer reading"
          />

          <FileUploadWithProgress
            id="documents"
            label="Supporting Documents"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple={true}
            compress={false}
            maxSize={10 * 1024 * 1024}
            onFilesChange={setDocuments}
            helperText="Upload warranty cards, bills, or other relevant documents"
          />
        </div>

        {/* Status */}
        <div className="form-section">
          <h3 className="section-title">
            <CheckCircle className="h-5 w-5" />
            Task Status
          </h3>
          <div className="form-group">
            <label>Status *</label>
            <select {...register("status", { required: "Status is required" })}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="alert alert-error">
            <AlertTriangle className="h-5 w-5" />
            {submitError}
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="alert alert-success">
            <CheckCircle className="h-5 w-5" />
            Task created successfully!
          </div>
        )}

        {/* Overall Progress Bar (during submission) */}
        {isSubmitting && (
          <div className="overall-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="progress-text">
              Uploading... {overallProgress}%
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={isSubmitting || externalIsSubmitting || submitSuccess}
          className={`create-task-btn ${submitSuccess ? 'success' : ''}`}
        >
          {submitSuccess ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Task Created!
            </>
          ) : isSubmitting ? (
            <>
              <div className="spinner" />
              Creating Task... {overallProgress}%
            </>
          ) : (
            <>
              <Wrench className="h-5 w-5" />
              Create Task
            </>
          )}
        </button>
      </form>
    </FormProvider>
  );
};

export default EnhancedMaintenanceForm;
