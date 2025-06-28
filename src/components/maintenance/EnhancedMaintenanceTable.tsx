import React, { useState } from 'react';
import { MaintenanceTask, Vehicle } from '../../types';
import { ChevronDown, ChevronUp, Search, Filter, Download, RefreshCw, Eye } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import CollapsibleSection from '../ui/CollapsibleSection';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface EnhancedMaintenanceTableProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
}

const EnhancedMaintenanceTable: React.FC<EnhancedMaintenanceTableProps> = ({
  tasks,
  vehicles
}) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    vehicleId: 'all',
    taskType: 'all'
  });
  
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);

  // Get vehicle registration by id
  const getVehicleRegistration = (vehicleId: string): string => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.registration_number : 'Unknown';
  };
  
  // Get formatted task type
  const formatTaskType = (type: string): string => {
    return type
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Format status for display
  const formatStatus = (status: string): string => {
    return status.replace('_', ' ').toUpperCase();
  };
  
  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-success-100 text-success-800';
      case 'escalated': return 'bg-error-100 text-error-800';
      case 'rework': return 'bg-warning-100 text-warning-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority badge color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-warning-100 text-warning-800';
      case 'critical': return 'bg-error-100 text-error-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };
  
  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    // Apply filters
    const filtered = tasks.filter(task => {
      // Search filter
      if (filters.search) {
        const vehicle = vehicles.find(v => v.id === task.vehicle_id);
        const searchTerms = [
          vehicle?.registration_number,
          formatTaskType(task.task_type),
          task.status,
          task.priority,
          task.garage_id,
          task.description
        ].map(term => term?.toLowerCase());
        
        const searchValue = filters.search.toLowerCase();
        
        if (!searchTerms.some(term => term?.includes(searchValue))) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }
      
      // Vehicle filter
      if (filters.vehicleId !== 'all' && task.vehicle_id !== filters.vehicleId) {
        return false;
      }
      
      // Task type filter
      if (filters.taskType !== 'all' && task.task_type !== filters.taskType) {
        return false;
      }
      
      return true;
    });
    
    // Apply sorting
    if (sortConfig) {
      return [...filtered].sort((a, b) => {
        let aValue, bValue;
        
        // Get values based on sort key
        switch (sortConfig.key) {
          case 'vehicle':
            aValue = getVehicleRegistration(a.vehicle_id);
            bValue = getVehicleRegistration(b.vehicle_id);
            break;
          case 'type':
            aValue = formatTaskType(a.task_type);
            bValue = formatTaskType(b.task_type);
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'priority':
            aValue = a.priority;
            bValue = b.priority;
            break;
          case 'start_date':
            aValue = new Date(a.start_date).getTime();
            bValue = new Date(b.start_date).getTime();
            break;
          case 'downtime':
            aValue = a.downtime_days || 0;
            bValue = b.downtime_days || 0;
            break;
          case 'cost':
            aValue = a.actual_cost || a.estimated_cost || 0;
            bValue = b.actual_cost || b.estimated_cost || 0;
            break;
          default:
            aValue = a[sortConfig.key as keyof MaintenanceTask];
            bValue = b[sortConfig.key as keyof MaintenanceTask];
        }
        
        // Compare values
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        // For numbers and dates
        return sortConfig.direction === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
    }
    
    // Default sort by start date (newest first)
    return [...filtered].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [tasks, vehicles, filters, sortConfig]);

  // Calculate total cost
  const totalCost = filteredAndSortedTasks.reduce((sum, task) => {
    const cost = task.actual_cost || task.estimated_cost || 0;
    return sum + Number(cost);
  }, 0);
  
  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Maintenance Tasks Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    
    const tableData = filteredAndSortedTasks.map(task => [
      getVehicleRegistration(task.vehicle_id),
      formatTaskType(task.task_type),
      formatStatus(task.status),
      task.priority.toUpperCase(),
      format(new Date(task.start_date), 'dd/MM/yyyy'),
      `${task.downtime_days || 0}d`,
      `₹${(task.actual_cost || task.estimated_cost || 0).toLocaleString()}`
    ]);
    
    autoTable(doc, {
      head: [['Vehicle', 'Type', 'Status', 'Priority', 'Date', 'Downtime', 'Cost']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [76, 175, 80] }
    });
    
    doc.save('maintenance-tasks-report.pdf');
  };
  
  const exportExcel = () => {
    const fileData = filteredAndSortedTasks.map(task => ({
      'Vehicle': getVehicleRegistration(task.vehicle_id),
      'Type': formatTaskType(task.task_type),
      'Status': formatStatus(task.status),
      'Priority': task.priority.toUpperCase(),
      'Start Date': format(new Date(task.start_date), 'dd/MM/yyyy'),
      'End Date': task.end_date ? format(new Date(task.end_date), 'dd/MM/yyyy') : '',
      'Downtime (days)': task.downtime_days || 0,
      'Odometer': task.odometer_reading,
      'Cost': task.actual_cost || task.estimated_cost || 0,
      'Description': task.description || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(fileData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Tasks');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'maintenance-tasks-report.xlsx');
  };

  return (
    <CollapsibleSection 
      title="Maintenance Tasks" 
      iconColor="text-indigo-600"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-4 justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search tasks..."
                  icon={<Search className="h-4 w-4" />}
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter className="h-4 w-4" />}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                icon={<Download className="h-4 w-4" />}
              >
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                icon={<Download className="h-4 w-4" />}
              >
                Export Excel
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Select
                label="Status"
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'open', label: 'Open' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'escalated', label: 'Escalated' },
                  { value: 'rework', label: 'Rework' }
                ]}
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              />

              <Select
                label="Priority"
                options={[
                  { value: 'all', label: 'All Priority' },
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' }
                ]}
                value={filters.priority}
                onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
              />

              <Select
                label="Vehicle"
                options={[
                  { value: 'all', label: 'All Vehicles' },
                  ...vehicles.map(v => ({
                    value: v.id,
                    label: v.registration_number
                  }))
                ]}
                value={filters.vehicleId}
                onChange={e => setFilters(f => ({ ...f, vehicleId: e.target.value }))}
              />

              <Select
                label="Task Type"
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'general_scheduled_service', label: 'General Service' },
                  { value: 'wear_and_tear_replacement_repairs', label: 'Repair/Replacement' },
                  { value: 'accidental', label: 'Accidental' },
                  { value: 'others', label: 'Others' }
                ]}
                value={filters.taskType}
                onChange={e => setFilters(f => ({ ...f, taskType: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-base font-medium text-gray-900">
              Tasks 
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredAndSortedTasks.length})
              </span>
            </h3>
            <div className="text-sm text-gray-500">
              Total Cost: <span className="font-semibold">₹{totalCost.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="overflow-x-auto relative">
            {/* Scrolling indicators */}
            <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
            <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
            
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('vehicle')}
                  >
                    <div className="flex items-center">
                      Vehicle
                      {sortConfig?.key === 'vehicle' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {sortConfig?.key === 'type' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortConfig?.key === 'status' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center">
                      Priority
                      {sortConfig?.key === 'priority' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('start_date')}
                  >
                    <div className="flex items-center">
                      Start Date
                      {sortConfig?.key === 'start_date' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('downtime')}
                  >
                    <div className="flex items-center">
                      Downtime
                      {sortConfig?.key === 'downtime' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('cost')}
                  >
                    <div className="flex items-center">
                      Cost
                      {sortConfig?.key === 'cost' && (
                        sortConfig.direction === 'asc' ? 
                          <ChevronUp className="ml-1 h-4 w-4" /> : 
                          <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getVehicleRegistration(task.vehicle_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTaskType(task.task_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {formatStatus(task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(task.start_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.downtime_days || 0}d
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{(task.actual_cost || task.estimated_cost || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/maintenance/${task.id}`)}
                        icon={<Eye className="h-4 w-4" />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {filteredAndSortedTasks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No maintenance tasks match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};

export default EnhancedMaintenanceTable;