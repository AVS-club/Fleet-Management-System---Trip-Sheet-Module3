import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MaintenanceTask, Vehicle } from '@/types';
import { format, parseISO } from 'date-fns';
import VehicleTagBadges from '../vehicles/VehicleTagBadges';
import { getVendors } from '@/utils/vendorStorage';
import { Eye, Edit, Calendar, Truck, IndianRupee, Clock, Wrench, ChevronUp, ChevronDown, Search, X, Filter, ChevronRight, LayoutGrid, List } from 'lucide-react';
import Button from '../ui/Button';
import MaintenanceCard from './MaintenanceCard';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useCleanup, useIsMounted } from '@/hooks/useCleanup';

interface MaintenanceTaskListProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  onViewTask?: (task: MaintenanceTask) => void;
  onEditTask?: (task: MaintenanceTask) => void;
}

type SortField = 'vehicle' | 'task_type' | 'status' | 'priority' | 'start_date' | 'end_date' | 'downtime' | 'odometer' | 'cost' | 'created_at';
type SortOrder = 'asc' | 'desc';

const INITIAL_VISIBLE_TASKS = 30;
const LOAD_INCREMENT = 30;
const STICKY_COLUMN_OFFSETS = {
  index: '0px',
  vehicle: '3.125rem', // 50px for index column
  actions: '0px' // Actions column sticky on right
};

const MaintenanceTaskList: React.FC<MaintenanceTaskListProps> = ({
  tasks,
  vehicles,
  onViewTask,
  onEditTask
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [vendorsMap, setVendorsMap] = useState<Map<string, string>>(new Map());
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterTaskType, setFilterTaskType] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_TASKS);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Use debounced search hook for better performance
  const {
    searchQuery,
    debouncedValue: activeSearchQuery,
    isSearching,
    handleSearchChange,
    clearSearch: handleClearSearch,
    forceSearch
  } = useDebouncedSearch('', {
    minLength: 1,
    delay: 300
  });

  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const cleanup = useCleanup();
  const isMounted = useIsMounted();

  // Close filters panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showFilters && !target.closest('.filters-panel-container')) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      cleanup.addEventListener(document, 'mousedown', handleClickOutside);
    }
    
    // Cleanup handled automatically by useCleanup hook
  }, [showFilters, cleanup]);

  // Load vendors with proper cleanup
  useEffect(() => {
    let aborted = false;
    
    const loadVendors = async () => {
      try {
        const vendors = await getVendors();
        
        // Check if component is still mounted before updating state
        if (!aborted && isMounted.current) {
          const map = new Map<string, string>();
          vendors.forEach(vendor => {
            map.set(vendor.id, vendor.vendor_name || 'Unknown Vendor');
          });
          setVendorsMap(map);
        }
      } catch (error) {
        if (!aborted && isMounted.current) {
          console.error('Error loading vendors:', error);
        }
      }
    };
    
    loadVendors();
    
    return () => {
      aborted = true;
    };
  }, [isMounted]);

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
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTaskTypeBadge = (taskType: string) => {
    const typeMap: Record<string, string> = {
      'general_scheduled_service': 'Scheduled',
      'wear_and_tear_replacement_repairs': 'Wear & Tear',
      'accidental': 'Accidental',
      'others': 'Others'
    };
    return typeMap[taskType] || taskType?.replace(/_/g, ' ') || 'N/A';
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

  const getComplaintDescription = (task: MaintenanceTask): string => {
    if (task.complaint_description) {
      return task.complaint_description;
    }
    return '';
  };

  const getResolutionSummary = (task: MaintenanceTask): string => {
    if (task.resolution_summary) {
      return task.resolution_summary;
    }
    return '';
  };

  const getDisplayText = (task: MaintenanceTask): string => {
    const complaint = getComplaintDescription(task);
    const resolution = getResolutionSummary(task);
    
    if (complaint && resolution) {
      return `${complaint.substring(0, 50)}... | ${resolution.substring(0, 50)}...`;
    } else if (complaint) {
      return complaint.substring(0, 100);
    } else if (resolution) {
      return resolution.substring(0, 100);
    }
    return '';
  };

  const getVendorName = (task: MaintenanceTask): string => {
    if (task.service_groups && task.service_groups.length > 0) {
      // Get first vendor from service groups
      const firstGroup = task.service_groups[0];
      if (firstGroup.vendor_id) {
        return vendorsMap.get(firstGroup.vendor_id) || firstGroup.vendor_id;
      }
    }
    return '';
  };

  const calculateDowntimeHours = (task: MaintenanceTask): number => {
    const days = task.downtime_days || 0;
    const hours = task.downtime_hours || 0;
    return (days * 24) + hours;
  };

  // Search function with prioritization - improved with better performance
  const searchTasks = useCallback((query: string, taskList: MaintenanceTask[]): MaintenanceTask[] => {
    if (!query || query.length === 0) return taskList;

    const lowerQuery = query.toLowerCase();
    const scoredTasks: Array<{ task: MaintenanceTask; score: number }> = [];

    taskList.forEach(task => {
      let score = 0;
      const vehicle = vehicleMap.get(task.vehicle_id);
      const vehicleReg = vehicle?.registration_number?.toLowerCase() || '';
      const vendorName = getVendorName(task).toLowerCase();
      const complaint = getComplaintDescription(task).toLowerCase();
      const resolution = getResolutionSummary(task).toLowerCase();
      const taskType = getTaskTypeBadge(task.task_type || '').toLowerCase();
      const status = task.status?.toLowerCase() || '';
      const priority = task.priority?.toLowerCase() || '';

      // Prioritize vehicle registration number (highest priority)
      if (vehicleReg.includes(lowerQuery)) {
        score += 100;
      }

      // Vehicle make/model
      if (vehicle?.make?.toLowerCase().includes(lowerQuery) || vehicle?.model?.toLowerCase().includes(lowerQuery)) {
        score += 80;
      }

      // Vendor name
      if (vendorName.includes(lowerQuery)) {
        score += 60;
      }

      // Complaint/Resolution
      if (complaint.includes(lowerQuery) || resolution.includes(lowerQuery)) {
        score += 40;
      }

      // Task type
      if (taskType.includes(lowerQuery)) {
        score += 30;
      }

      // Status/Priority
      if (status.includes(lowerQuery) || priority.includes(lowerQuery)) {
        score += 20;
      }

      // Cost (if query is numeric)
      if (!isNaN(Number(lowerQuery))) {
        const cost = task.total_cost || 0;
        if (cost.toString().includes(lowerQuery)) {
          score += 10;
        }
      }

      // Downtime (if query matches downtime hours)
      const downtimeHours = calculateDowntimeHours(task);
      if (downtimeHours > 0 && downtimeHours.toString().includes(lowerQuery)) {
        score += 10;
      }

      if (score > 0) {
        scoredTasks.push({ task, score });
      }
    });

    // Sort by score (highest first) and return tasks
    return scoredTasks
      .sort((a, b) => b.score - a.score)
      .map(item => item.task);
  }, [vehicleMap, vendorsMap]);

  // Handle Enter key to force immediate search
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.length > 0) {
      forceSearch();
    }
  }, [searchQuery, forceSearch]);

  // Apply all filters
  const applyFilters = (taskList: MaintenanceTask[]): MaintenanceTask[] => {
    let filtered = taskList;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Vehicle filter
    if (filterVehicle !== 'all') {
      filtered = filtered.filter(task => task.vehicle_id === filterVehicle);
    }

    // Task type filter
    if (filterTaskType !== 'all') {
      filtered = filtered.filter(task => task.task_type === filterTaskType);
    }

    // Date range filter
    if (filterDateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(task => {
        const taskDate = parseISO(task.start_date);
        switch (filterDateRange) {
          case 'today':
            return format(taskDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          case 'thisWeek':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return taskDate >= weekStart;
          case 'thisMonth':
            return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
          case 'lastMonth':
            const lastMonth = new Date(now);
            lastMonth.setMonth(now.getMonth() - 1);
            return taskDate.getMonth() === lastMonth.getMonth() && taskDate.getFullYear() === lastMonth.getFullYear();
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  // Apply filters first
  const filteredByFilters = applyFilters(tasks);

  // Then apply search filter
  const filteredTasks = activeSearchQuery 
    ? searchTasks(activeSearchQuery, filteredByFilters)
    : filteredByFilters;

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'vehicle':
          aValue = vehicleMap.get(a.vehicle_id)?.registration_number || '';
          bValue = vehicleMap.get(b.vehicle_id)?.registration_number || '';
          break;
        case 'task_type':
          aValue = a.task_type || '';
          bValue = b.task_type || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'priority':
          const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'end_date':
          aValue = a.end_date ? new Date(a.end_date).getTime() : 0;
          bValue = b.end_date ? new Date(b.end_date).getTime() : 0;
          break;
        case 'downtime':
          aValue = calculateDowntimeHours(a);
          bValue = calculateDowntimeHours(b);
          break;
        case 'odometer':
          aValue = a.odometer_reading || 0;
          bValue = b.odometer_reading || 0;
          break;
        case 'cost':
          aValue = a.total_cost || 0;
          bValue = b.total_cost || 0;
          break;
        case 'created_at':
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTasks, sortField, sortOrder, vehicleMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === sortedTasks.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedTasks.map(t => t.id)));
    }
  };

  const handleSelectRow = (taskId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedRows(newSelected);
  };

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_TASKS);
  }, [tasks, filterStatus, activeSearchQuery, filterPriority, filterVehicle, filterTaskType, filterDateRange]);

  const hasMoreTasks = visibleCount < sortedTasks.length;

  const displayedTasks = useMemo(() => {
    return sortedTasks.slice(0, visibleCount);
  }, [sortedTasks, visibleCount]);

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasMoreTasks) return;
      const threshold = 120;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
        setVisibleCount(prev => Math.min(prev + LOAD_INCREMENT, sortedTasks.length));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreTasks, sortedTasks.length]);

  const handleLoadMoreClick = () => {
    if (!hasMoreTasks) return;
    setVisibleCount(prev => Math.min(prev + LOAD_INCREMENT, sortedTasks.length));
  };

  // Calculate summary statistics
  const totalTasks = sortedTasks.length;
  const totalExpenditure = sortedTasks.reduce((sum, task) => sum + (task.total_cost || 0), 0);
  const averageCost = totalTasks > 0 ? totalExpenditure / totalTasks : 0;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterPriority !== 'all') count++;
    if (filterVehicle !== 'all') count++;
    if (filterTaskType !== 'all') count++;
    if (filterDateRange !== 'all') count++;
    return count;
  }, [filterPriority, filterVehicle, filterTaskType, filterDateRange]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Search Bar and Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle Button */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Enhanced Search Bar */}
          <div className="flex-1 min-w-[200px] max-w-[400px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-500 drop-shadow-[0_2px_4px_rgba(16,185,129,0.35)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by vehicle, vendor, complaint..."
              className="w-full pl-11 pr-10 py-2.5 text-sm border-2 border-emerald-100 rounded-full bg-gradient-to-r from-emerald-50 via-cyan-50 to-sky-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300 focus:bg-white transition-all shadow-[0_10px_30px_rgba(12,74,110,0.12)] hover:shadow-[0_12px_35px_rgba(8,145,178,0.25)] backdrop-blur-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
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

          {/* Spacer to push Filters to the right */}
          <div className="flex-grow"></div>

          {/* Advanced Filters Button */}
          <div className="relative filters-panel-container ml-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronRight className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
            </button>

            {/* Expandable Filters Panel */}
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-blue-200 rounded-lg shadow-xl z-50 p-4 filters-panel-container">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
                    <button
                      onClick={() => {
                        setFilterPriority('all');
                        setFilterVehicle('all');
                        setFilterTaskType('all');
                        setFilterDateRange('all');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Vehicle Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle</label>
                    <select
                      value={filterVehicle}
                      onChange={(e) => setFilterVehicle(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Vehicles</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.registration_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Task Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Task Type</label>
                    <select
                      value={filterTaskType}
                      onChange={(e) => setFilterTaskType(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="general_scheduled_service">General Scheduled Service</option>
                      <option value="wear_and_tear_replacement_repairs">Wear & Tear</option>
                      <option value="accidental">Accidental</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={filterDateRange}
                      onChange={(e) => setFilterDateRange(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="thisWeek">This Week</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'cards' ? (
        <div className="p-6">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedTasks.map((task) => {
                const vehicle = vehicleMap.get(task.vehicle_id);
                const vendorName = getVendorName(task);

                return (
                  <MaintenanceCard
                    key={task.id}
                    task={task}
                    vehicle={vehicle}
                    vendorName={vendorName}
                    onView={() => onViewTask?.(task)}
                    onEdit={() => onEditTask?.(task)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Excel-Style Table */
      <div
        className="overflow-x-auto overflow-y-auto scroll-indicator"
        style={{ maxHeight: '600px' }}
        ref={listContainerRef}
      >
        <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
          <thead className="bg-gray-100 sticky top-0 z-10 border-b-2 border-gray-300">
            <tr>
              {/* Serial Number */}
              <th
                className="sticky left-0 bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider w-14 z-30 border-r border-gray-200"
                style={{ left: STICKY_COLUMN_OFFSETS.index }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>#</span>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedTasks.length && sortedTasks.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </div>
              </th>

              {/* Vehicle Number - Fixed Left */}
              <th
                className="sticky bg-gray-100 px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[140px] z-20 border-r border-gray-200"
                style={{ left: STICKY_COLUMN_OFFSETS.vehicle }}
                onClick={() => handleSort('vehicle')}
              >
                <div className="flex items-center gap-1">
                  Vehicle
                  <SortIcon field="vehicle" />
                </div>
              </th>

              {/* Type/Status/Priority - COMBINED */}
              <th
                className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[160px]"
                onClick={() => handleSort('task_type')}
              >
                <div className="flex items-center gap-1">
                  Type/Status/Priority
                  <SortIcon field="task_type" />
                </div>
              </th>

              {/* Dates (Start/End) - COMPACT */}
              <th
                className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[120px]"
                onClick={() => handleSort('start_date')}
              >
                <div className="flex items-center gap-1">
                  Dates
                  <SortIcon field="start_date" />
                </div>
              </th>

              {/* Total Cost */}
              <th
                className="px-1.5 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[100px]"
                onClick={() => handleSort('cost')}
              >
                <div className="flex items-center justify-end gap-1">
                  Cost (₹)
                  <SortIcon field="cost" />
                </div>
              </th>

              {/* Vendors */}
              <th className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                Vendors
              </th>

              {/* Odometer */}
              <th
                className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[90px]"
                onClick={() => handleSort('odometer')}
              >
                <div className="flex items-center gap-1">
                  Odometer
                  <SortIcon field="odometer" />
                </div>
              </th>

              {/* Downtime */}
              <th
                className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[80px]"
                onClick={() => handleSort('downtime')}
              >
                <div className="flex items-center gap-1">
                  Downtime
                  <SortIcon field="downtime" />
                </div>
              </th>

              {/* Complaint */}
              <th className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">
                Complaint
              </th>

              {/* Created Date */}
              <th
                className="px-1.5 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 min-w-[100px]"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created
                  <SortIcon field="created_at" />
                </div>
              </th>

              {/* Actions - Fixed Right */}
              <th className="sticky right-0 bg-gray-100 px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[60px] w-[60px] z-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center">
                  <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No maintenance tasks found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {filterStatus === 'all' 
                      ? 'Create your first maintenance task to get started'
                      : `No tasks with status "${filterStatus}"`
                    }
                  </p>
                </td>
              </tr>
            ) : (
              displayedTasks.map((task, idx) => {
                const vehicle = vehicleMap.get(task.vehicle_id);
                const displayText = getDisplayText(task);
                const downtimeHours = calculateDowntimeHours(task);
                const vendorName = getVendorName(task);
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                const isClickable = Boolean(onViewTask);
                const handleRowClick = () => {
                  if (onViewTask) onViewTask(task);
                };
                
                return (
                  <tr 
                    key={task.id} 
                    className={`${isClickable ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'} transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={isClickable ? handleRowClick : undefined}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                  >
                    {/* Serial Number */}
                    <td
                      className="sticky px-2 py-2 border-r border-gray-200"
                      style={{ left: STICKY_COLUMN_OFFSETS.index, backgroundColor: rowBg, zIndex: 10 }}
                    >
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleSelectRow(task.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="font-medium text-gray-500 min-w-[1.25rem] text-center">
                          {idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Vehicle Number - Fixed Left */}
                    <td
                      className="sticky px-2 py-2 z-10 border-r border-gray-200"
                      style={{ left: STICKY_COLUMN_OFFSETS.vehicle, backgroundColor: rowBg }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTask?.(task);
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {vehicle?.registration_number || 'Unknown'}
                          </button>
                        </div>
                        {vehicle?.tags && vehicle.tags.length > 0 && (
                          <div className="ml-6">
                            <VehicleTagBadges 
                              tags={vehicle.tags} 
                              readOnly 
                              size="sm"
                              maxDisplay={1}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Type/Status/Priority - COMBINED */}
                    <td className="px-1.5 py-2">
                      <div className="flex flex-col gap-1">
                        {/* Task Type */}
                        <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded truncate">
                          {getTaskTypeBadge(task.task_type || '')}
                        </span>
                        {/* Status + Priority on same line */}
                        <div className="flex gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Dates (Start/End) - COMPACT */}
                    <td className="px-1.5 py-2 text-gray-700">
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">S:</span>
                          <span className="font-medium">{formatDate(task.start_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">E:</span>
                          <span className="font-medium">{formatDate(task.end_date)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Total Cost */}
                    <td className="px-1.5 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(task.total_cost || 0)}
                    </td>

                    {/* Vendors */}
                    <td className="px-1.5 py-2 text-xs text-gray-700">
                      <div className="space-y-1 max-w-[200px]">
                        {task.service_groups && task.service_groups.length > 0 ? (
                          <>
                            {task.service_groups.slice(0, 2).map((group: any, i: number) => {
                              const vName = vendorsMap.get(group.vendor_id) || 'Unknown';
                              const taskCount = Array.isArray(group.tasks) ? group.tasks.length : 0;
                              return (
                                <div key={i} className="flex items-center gap-1 truncate">
                                  <span className="font-medium truncate">{i+1}. {vName}</span>
                                  <span className="text-gray-500">({taskCount})</span>
                                </div>
                              );
                            })}
                            {task.service_groups.length > 2 && (
                              <div className="text-blue-600 text-xs">
                                +{task.service_groups.length - 2} more
                              </div>
                            )}
                          </>
                        ) : vendorName ? (
                          <span className="truncate block" title={vendorName}>
                            {vendorName}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    {/* Odometer */}
                    <td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
                      {task.odometer_reading ? `${task.odometer_reading.toLocaleString()}` : '—'}
                    </td>

                    {/* Downtime */}
                    <td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
                      {downtimeHours > 0 ? `${downtimeHours}h` : '—'}
                    </td>

                    {/* Complaint */}
                    <td className="px-1.5 py-2 text-xs text-gray-700">
                      {task.complaint_description ? (
                        <div
                          className="truncate cursor-help hover:text-gray-900 max-w-[150px]"
                          title={task.complaint_description}
                        >
                          📝 {task.complaint_description}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-1.5 py-2 whitespace-nowrap text-xs text-gray-700">
                      {task.created_at ? formatDate(task.created_at) : '—'}
                    </td>

                    {/* Actions - Fixed Right */}
                    <td className="sticky right-0 px-1 py-2 whitespace-nowrap text-center z-10 border-l border-gray-200 w-[60px] shadow-[inset_6px_0_8px_-6px_rgba(0,0,0,0.15)]" style={{ backgroundColor: rowBg }}>
                      <div className="flex items-center justify-center gap-1">
                        {onViewTask && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewTask(task);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onEditTask && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          
          {/* Summary Row */}
          {sortedTasks.length > 0 && (
            <tfoot className="bg-blue-50 border-t-2 border-blue-200 sticky bottom-0 z-30 shadow-inner">
              <tr>
                <td colSpan={2} className="px-1.5 py-2 text-xs font-semibold text-blue-900 bg-blue-50">
                  Summary
                </td>
                <td colSpan={8} className="px-1.5 py-2 bg-blue-50"></td>
                <td className="px-1.5 py-2 text-xs font-semibold text-gray-900 text-right bg-blue-50">
                  {formatCurrency(totalExpenditure)}
                </td>
                <td className="px-1.5 py-2 text-xs font-semibold text-gray-700 bg-blue-50">
                  Tasks: {totalTasks} | Avg: {formatCurrency(averageCost)}
                </td>
                <td className="px-1 py-2 bg-blue-50"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      )}

      {/* Summary footer - shown for table view only */}
      {viewMode === 'table' && (
        <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center gap-4 bg-white rounded-b-xl">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{displayedTasks.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{totalTasks}</span> tasks
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <span>Total Cost: <span className="font-semibold text-gray-900">{formatCurrency(totalExpenditure)}</span></span>
            <span>Avg Cost: <span className="font-semibold text-gray-900">{formatCurrency(averageCost)}</span></span>
          </div>
          {hasMoreTasks && (
            <button
              onClick={handleLoadMoreClick}
              className="ml-auto px-4 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              Load {Math.min(LOAD_INCREMENT, totalTasks - visibleCount)} more
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MaintenanceTaskList;
