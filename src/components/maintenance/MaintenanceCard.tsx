import React, { useState } from 'react';
import { MaintenanceTask, Vehicle } from '@/types';
import { format, parseISO } from 'date-fns';
import { Eye, Edit, Calendar, Truck, IndianRupee, Clock, Wrench, AlertTriangle, CheckCircle, FileText, FileImage, File, X, ZoomIn, CircleDot } from 'lucide-react';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';

interface MaintenanceCardProps {
  task: MaintenanceTask;
  vehicle: Vehicle | undefined;
  vendorName: string;
  onView?: () => void;
  onEdit?: () => void;
}

const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  task,
  vehicle,
  vendorName,
  onView,
  onEdit
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const getFileType = (url: string): 'image' | 'pdf' | 'other' => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    return 'other';
  };

  const getFileIcon = (fileType: 'image' | 'pdf' | 'other') => {
    switch (fileType) {
      case 'image':
        return <FileImage className="h-8 w-8 text-blue-500" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'escalated': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'rework': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getTaskTypeBadge = (taskType: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      'general_scheduled_service': { label: 'Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-300' },
      'wear_and_tear_replacement_repairs': { label: 'Wear & Tear', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
      'accidental': { label: 'Accidental', color: 'bg-red-100 text-red-700 border-red-300' },
      'others': { label: 'Others', color: 'bg-gray-100 text-gray-700 border-gray-300' }
    };
    return typeMap[taskType] || { label: taskType?.replace(/_/g, ' ') || 'N/A', color: 'bg-gray-100 text-gray-700' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const taskTypeBadge = getTaskTypeBadge(task.task_type || '');
  const totalCost = task.service_groups?.reduce((sum, group) => sum + (group.service_cost || 0), 0) || 0;
  const downtimeHours = (task.downtime_days || 0) * 24 + (task.downtime_hours || 0);

  // Get odometer image for preview
  const odometerImage = task.odometer_image;

  // Get supporting documents
  const supportingDocs = task.attachments || [];

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden">
      {/* Header with Status and Priority */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                {vehicle?.registration_number || 'Unknown Vehicle'}
              </h3>
            </div>
            {vehicle && (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1">
                  <VehicleTagBadges vehicle={vehicle} />
                </div>
                {/* Tire Information */}
                {(vehicle.number_of_tyres || vehicle.tyre_size) && (
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <CircleDot className="h-3.5 w-3.5 text-gray-500" />
                    {vehicle.number_of_tyres && (
                      <span>
                        <span className="font-medium">{vehicle.number_of_tyres}</span> tyres
                      </span>
                    )}
                    {vehicle.number_of_tyres && vehicle.tyre_size && (
                      <span className="text-gray-400">•</span>
                    )}
                    {vehicle.tyre_size && (
                      <span>
                        Size: <span className="font-medium">{vehicle.tyre_size}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status || '')}`}>
              {task.status?.replace('_', ' ')}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority || '')}`}>
              {task.priority}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-3">
        {/* Task Type Badge */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${taskTypeBadge.color}`}>
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            {taskTypeBadge.label}
          </span>
        </div>

        {/* Complaint Description */}
        {task.complaint_description && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
            <p className="text-sm text-gray-700 line-clamp-2">
              <span className="font-medium text-amber-900">Issue: </span>
              {task.complaint_description}
            </p>
          </div>
        )}

        {/* Resolution Summary */}
        {task.resolution_summary && (
          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
            <p className="text-sm text-gray-700 line-clamp-2">
              <span className="font-medium text-green-900">Resolution: </span>
              {task.resolution_summary}
            </p>
          </div>
        )}

        {/* Tire-related Services Indicator */}
        {task.service_groups && task.service_groups.some(group => 
          group.tasks?.some((task: any) => 
            task.description?.toLowerCase().includes('tyre') || 
            task.description?.toLowerCase().includes('tire') ||
            task.description?.toLowerCase().includes('wheel')
          )
        ) && (
          <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800 font-medium">
              Includes tire/wheel services
            </span>
          </div>
        )}

        {/* Odometer Image Preview */}
        {odometerImage && (
          <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={odometerImage}
              alt="Odometer"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
              Odometer Reading
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Start</div>
              <div className="font-medium text-gray-900">{formatDate(task.start_date)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-xs text-gray-500">End</div>
              <div className="font-medium text-gray-900">{formatDate(task.end_date)}</div>
            </div>
          </div>
          {downtimeHours > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-xs text-gray-500">Downtime</div>
                <div className="font-medium text-gray-900">{downtimeHours}h</div>
              </div>
            </div>
          )}
          {totalCost > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <IndianRupee className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-xs text-gray-500">Total Cost</div>
                <div className="font-bold text-green-700">{formatCurrency(totalCost)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Vendor Info */}
        {vendorName && vendorName !== 'Unknown Vendor' && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">Primary Vendor</div>
            <div className="text-sm font-medium text-gray-900">{vendorName}</div>
          </div>
        )}

        {/* Supporting Documents */}
        {supportingDocs.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Supporting Documents</div>
            <div className="flex flex-wrap gap-2">
              {supportingDocs
                .filter(url => url && typeof url === 'string' && url.trim() !== '')
                .slice(0, 4)
                .map((docUrl, index) => {
                  const fileType = getFileType(docUrl);
                  const fileName = docUrl.split('/').pop() || `Doc ${index + 1}`;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedFile(docUrl)}
                      className="group relative flex flex-col items-center justify-center w-16 h-16 bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-lg transition-all cursor-pointer"
                      title={fileName}
                    >
                      {getFileIcon(fileType)}
                      <ZoomIn className="absolute top-1 right-1 h-3 w-3 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              {supportingDocs.filter(url => url && typeof url === 'string' && url.trim() !== '').length > 4 && (
                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-600">
                  +{supportingDocs.filter(url => url && typeof url === 'string' && url.trim() !== '').length - 4}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
        >
          <Edit className="h-4 w-4" />
          Edit
        </button>
      </div>
    </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="absolute top-0 right-0 z-10 p-4">
              <button
                onClick={() => setSelectedFile(null)}
                className="bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              {getFileType(selectedFile) === 'pdf' ? (
                <iframe
                  src={selectedFile}
                  className="w-full h-[90vh]"
                  title="PDF Viewer"
                />
              ) : getFileType(selectedFile) === 'image' ? (
                <img
                  src={selectedFile}
                  alt="Document preview"
                  className="max-w-full max-h-[90vh] object-contain"
                />
              ) : (
                <div className="text-center p-8">
                  <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <a
                    href={selectedFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MaintenanceCard;
