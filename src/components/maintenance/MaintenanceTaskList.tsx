import React, { useState } from 'react';
import { MaintenanceTask, Vehicle } from '@/types';
import { format } from 'date-fns';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';
import { 
  Eye, 
  Edit, 
  Calendar, 
  Truck, 
  DollarSign, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Wrench,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Button from '../ui/Button';

interface MaintenanceTaskListProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  onViewTask?: (task: MaintenanceTask) => void;
  onEditTask?: (task: MaintenanceTask) => void;
}

const MaintenanceTaskList: React.FC<MaintenanceTaskListProps> = ({
  tasks,
  vehicles,
  onViewTask,
  onEditTask
}) => {
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'escalated': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rework': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredTasks = tasks.filter(task => 
    filterStatus === 'all' || task.status === filterStatus
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Maintenance Tasks
            </h2>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {filteredTasks.length} tasks
            </span>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'open', 'in_progress', 'resolved', 'escalated', 'rework'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-gray-200">
        {filteredTasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No maintenance tasks found</p>
            <p className="text-gray-400 text-sm mt-1">
              {filterStatus === 'all' 
                ? 'Create your first maintenance task to get started'
                : `No tasks with status "${filterStatus}"`
              }
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const vehicle = vehicleMap.get(task.vehicle_id);
            const isExpanded = expandedTask === task.id;
            
            return (
              <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    {/* Vehicle Info */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {vehicle?.registration_number || 'Unknown Vehicle'}
                        </span>
                        {vehicle?.tags && vehicle.tags.length > 0 && (
                          <VehicleTagBadges 
                            tags={vehicle.tags} 
                            readOnly 
                            size="sm"
                            maxDisplay={2}
                          />
                        )}
                      </div>
                    </div>

                    {/* Task Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {(() => {
                          if (Array.isArray(task.title)) {
                            return task.title.join(', ');
                          } else if (typeof task.title === 'object' && task.title !== null) {
                            // Handle i18n object like {en: "text", hi: "text"}
                            return task.title.en || task.title.hi || Object.values(task.title)[0] || 'Maintenance Task';
                          } else if (typeof task.title === 'string') {
                            return task.title;
                          }
                          return 'Maintenance Task';
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {(() => {
                          if (typeof task.description === 'object' && task.description !== null) {
                            // Handle i18n object like {en: "text", hi: "text"}
                            return task.description.en || task.description.hi || Object.values(task.description)[0] || 'No description';
                          }
                          return task.description || 'No description';
                        })()}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>

                    {/* Priority */}
                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>

                    {/* Cost - Use total_cost from task (auto-calculated by database) */}
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatCurrency(
                        task.total_cost ??
                        task.service_groups?.reduce((sum, group) => sum + (Number(group.service_cost || group.cost) || 0), 0) || 0
                      )}</span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(task.start_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {onViewTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewTask(task)}
                        icon={<Eye className="h-4 w-4" />}
                      >
                        View
                      </Button>
                    )}
                    {onEditTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTask(task)}
                        icon={<Edit className="h-4 w-4" />}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pl-8 border-l-2 border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Vehicle Details:</span>
                        <p className="text-gray-600">
                          {vehicle?.make} {vehicle?.model} • {vehicle?.gvw} kg
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Odometer Reading:</span>
                        <p className="text-gray-600">{task.odometer_reading?.toLocaleString()} km</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Downtime:</span>
                        <p className="text-gray-600">
                          {task.downtime_days} days, {task.downtime_hours} hours
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Task Type:</span>
                        <p className="text-gray-600">{task.task_type?.replace('_', ' ')}</p>
                      </div>
                    </div>

                    {/* Service Groups */}
                    {task.service_groups && task.service_groups.length > 0 && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700 text-sm">Services:</span>
                        <div className="mt-2 space-y-1">
                          {task.service_groups.map((group, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              {(() => {
                                if (Array.isArray(group.tasks)) {
                                  return group.tasks.map(task => {
                                    if (typeof task === 'object' && task !== null) {
                                      return task.en || task.hi || Object.values(task)[0] || task;
                                    }
                                    return task;
                                  }).join(', ');
                                }
                                return 'No services listed';
                              })()}
                              {group.cost > 0 && (
                                <span className="ml-2 text-green-600 font-medium">
                                  ({formatCurrency(group.cost)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parts Required */}
                    {task.parts_required && task.parts_required.length > 0 && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700 text-sm">Parts Required:</span>
                        <div className="mt-2 space-y-1">
                          {task.parts_required.map((part, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              {(() => {
                                if (typeof part.name === 'object' && part.name !== null) {
                                  return part.name.en || part.name.hi || Object.values(part.name)[0] || 'Unknown Part';
                                }
                                return part.name || 'Unknown Part';
                              })()} (Qty: {part.quantity})
                              {part.total_cost > 0 && (
                                <span className="ml-2 text-green-600 font-medium">
                                  ({formatCurrency(part.total_cost)})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MaintenanceTaskList;
