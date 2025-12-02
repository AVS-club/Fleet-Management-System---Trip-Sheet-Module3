import React, { useState } from 'react';
import { MaintenanceTask, Vehicle } from '@/types';
import { format, parseISO } from 'date-fns';
import { 
  Eye, Edit, Calendar, Truck, IndianRupee, Clock, Wrench, AlertTriangle, 
  CheckCircle, FileText, FileImage, File, X, ZoomIn, CircleDot, Package,
  Shield, Bell, StickyNote, Image as ImageIcon, FileCheck
} from 'lucide-react';
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
  const totalCost = task.total_cost || task.service_groups?.reduce((sum, group) => sum + (group.service_cost || 0), 0) || 0;
  const downtimeHours = (task.downtime_days || 0) * 24 + (task.downtime_hours || 0);

  // Get odometer image for preview
  const odometerImage = task.odometer_image;

  // Get supporting documents
  const supportingDocs = task.attachments || [];

  // Get parts count
  const partsCount = task.parts_required?.length || 0;

  // Get all bills from service groups
  const allBills = task.service_groups?.flatMap(group => group.bills || []).filter(b => b) || [];

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

         {/* Title - if exists */}
         {task.title && task.title.length > 0 && (
           <div className="bg-purple-50 border-l-4 border-purple-400 p-2.5 rounded-r-lg">
             <div className="flex items-start gap-2">
               <FileCheck className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
               <div className="flex-1">
                 <p className="text-xs font-medium text-purple-900 mb-1">Tasks:</p>
                 <div className="flex flex-wrap gap-1">
                   {task.title.map((t, i) => (
                     <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                       {t}
                     </span>
                   ))}
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Complaint Description */}
         {task.complaint_description && (
           <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
             <p className="text-sm text-gray-700">
               <span className="font-medium text-amber-900">Issue: </span>
               {task.complaint_description}
             </p>
           </div>
         )}

         {/* Resolution Summary */}
         {task.resolution_summary && (
           <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
             <p className="text-sm text-gray-700">
               <span className="font-medium text-green-900">Resolution: </span>
               {task.resolution_summary}
             </p>
           </div>
         )}

         {/* Notes - if exists */}
         {task.notes && (
           <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded-r-lg">
             <div className="flex items-start gap-2">
               <StickyNote className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
               <p className="text-sm text-gray-700 flex-1">{task.notes}</p>
             </div>
           </div>
         )}

         {/* Odometer Reading & Image */}
         {(task.odometer_reading || odometerImage) && (
           <div className="space-y-2">
             {task.odometer_reading && (
               <div className="flex items-center gap-2 text-sm">
                 <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-medium">
                   📍 Odometer: {task.odometer_reading.toLocaleString()} km
                 </div>
               </div>
             )}
             {odometerImage && (
               <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                 <img
                   src={odometerImage}
                   alt="Odometer"
                   className="w-full h-full object-cover cursor-pointer"
                   onClick={() => setSelectedFile(odometerImage)}
                 />
                 <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                   <ImageIcon className="h-3 w-3" />
                   Odometer Photo
                 </div>
                 <button
                   onClick={() => setSelectedFile(odometerImage)}
                   className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full transition-colors"
                 >
                   <ZoomIn className="h-3.5 w-3.5 text-gray-700" />
                 </button>
               </div>
             )}
           </div>
         )}

         {/* Parts Required */}
         {partsCount > 0 && (
           <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
             <div className="flex items-start gap-2">
               <Package className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
               <div className="flex-1">
                 <p className="text-xs font-medium text-indigo-900 mb-1">
                   Parts Required ({partsCount}):
                 </p>
                 <div className="space-y-1">
                   {task.parts_required?.slice(0, 5).map((part: string, i: number) => (
                     <div key={i} className="text-xs text-indigo-800 flex items-center gap-1">
                       <span className="text-indigo-400">•</span>
                       {part}
                     </div>
                   ))}
                   {partsCount > 5 && (
                     <div className="text-xs text-indigo-600 font-medium">
                       +{partsCount - 5} more parts
                     </div>
                   )}
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Service Groups with full details */}
         {task.service_groups && task.service_groups.length > 0 && (
           <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
             <p className="text-xs font-semibold text-slate-700 mb-2">
               Service Details ({task.service_groups.length} vendor{task.service_groups.length > 1 ? 's' : ''}):
             </p>
             <div className="space-y-2">
               {task.service_groups.map((group: any, i: number) => (
                 <div key={i} className="bg-white border border-slate-200 rounded p-2 text-xs">
                   <div className="font-medium text-slate-900 mb-1">
                     Vendor {i + 1}: {group.vendor_name || vendorName || 'Unknown'}
                   </div>
                   {group.tasks && group.tasks.length > 0 && (
                     <div className="text-slate-600 space-y-0.5 mb-1">
                       {group.tasks.slice(0, 3).map((t: any, ti: number) => (
                         <div key={ti} className="flex items-start gap-1">
                           <span className="text-slate-400">-</span>
                           <span>{t.description || t}</span>
                         </div>
                       ))}
                       {group.tasks.length > 3 && (
                         <div className="text-slate-500 italic">+{group.tasks.length - 3} more tasks</div>
                       )}
                     </div>
                   )}
                   {group.service_cost > 0 && (
                     <div className="text-green-700 font-semibold">
                       Cost: {formatCurrency(group.service_cost)}
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* Warranty Information */}
         {(task.warranty_claimed || task.warranty_expiry) && (
           <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
             <Shield className="h-4 w-4 text-emerald-600" />
             <div className="text-xs text-emerald-800">
               {task.warranty_claimed && <span className="font-medium">Warranty Claimed</span>}
               {task.warranty_claimed && task.warranty_expiry && <span className="text-emerald-600"> • </span>}
               {task.warranty_expiry && <span>Expires: {formatDate(task.warranty_expiry)}</span>}
             </div>
           </div>
         )}

         {/* Next Service Reminder */}
         {(task.next_service_km || task.next_service_date) && (
           <div className="bg-cyan-50 border border-cyan-200 p-2.5 rounded-lg flex items-center gap-2">
             <Bell className="h-4 w-4 text-cyan-600" />
             <div className="text-xs text-cyan-800">
               <span className="font-medium">Next Service: </span>
               {task.next_service_km && <span>@ {task.next_service_km.toLocaleString()} km</span>}
               {task.next_service_km && task.next_service_date && <span> or </span>}
               {task.next_service_date && <span>{formatDate(task.next_service_date)}</span>}
             </div>
           </div>
         )}

         {/* Info Grid */}
         <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
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

         {/* Bills Section */}
         {allBills.length > 0 && (
           <div className="pt-3 border-t border-gray-200">
             <div className="flex items-center gap-2 mb-2">
               <FileText className="h-4 w-4 text-purple-600" />
               <div className="text-xs font-medium text-gray-700">Bills ({allBills.length})</div>
             </div>
             <div className="flex flex-wrap gap-2">
               {allBills.slice(0, 4).map((billUrl: string, index: number) => {
                 const fileType = getFileType(billUrl);
                 const fileName = billUrl.split('/').pop() || `Bill ${index + 1}`;
                 return (
                   <button
                     key={index}
                     onClick={() => setSelectedFile(billUrl)}
                     className="group relative flex flex-col items-center justify-center w-16 h-16 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-lg transition-all cursor-pointer"
                     title={fileName}
                   >
                     {getFileIcon(fileType)}
                     <div className="absolute bottom-1 left-1 right-1 text-center">
                       <span className="text-[9px] bg-purple-600 text-white px-1 rounded">Bill</span>
                     </div>
                     <ZoomIn className="absolute top-1 right-1 h-3 w-3 text-purple-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                 );
               })}
               {allBills.length > 4 && (
                 <div className="flex items-center justify-center w-16 h-16 bg-purple-100 border-2 border-purple-300 rounded-lg text-xs font-medium text-purple-700">
                   +{allBills.length - 4}
                 </div>
               )}
             </div>
           </div>
         )}

         {/* Supporting Documents */}
         {supportingDocs.length > 0 && (
           <div className="pt-3 border-t border-gray-200">
             <div className="flex items-center gap-2 mb-2">
               <File className="h-4 w-4 text-blue-600" />
               <div className="text-xs font-medium text-gray-700">Documents ({supportingDocs.length})</div>
             </div>
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
                       className="group relative flex flex-col items-center justify-center w-16 h-16 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all cursor-pointer"
                       title={fileName}
                     >
                       {getFileIcon(fileType)}
                       <ZoomIn className="absolute top-1 right-1 h-3 w-3 text-blue-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                   );
                 })}
               {supportingDocs.filter(url => url && typeof url === 'string' && url.trim() !== '').length > 4 && (
                 <div className="flex items-center justify-center w-16 h-16 bg-blue-100 border-2 border-blue-300 rounded-lg text-xs font-medium text-blue-700">
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
