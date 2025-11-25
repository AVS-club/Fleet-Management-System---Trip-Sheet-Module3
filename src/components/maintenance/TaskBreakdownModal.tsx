import React, { useMemo } from 'react';
import { X, TrendingUp, Calendar, Wrench, AlertCircle, IndianRupee, Truck, Users, Download, FileText } from 'lucide-react';
import { MaintenanceTask, Vehicle } from '@/types';
import { format, parseISO } from 'date-fns';

interface TaskBreakdownModalProps {
  tasks: MaintenanceTask[];
  vehicles: Vehicle[];
  vendorsMap: Map<string, string>;
  onClose: () => void;
  onFilterByCategory: (category: string, value: string) => void;
}

const TaskBreakdownModal: React.FC<TaskBreakdownModalProps> = ({
  tasks,
  vehicles,
  vendorsMap,
  onClose,
  onFilterByCategory
}) => {
  // Calculate breakdowns
  const breakdown = useMemo(() => {
    // Group by status
    const byStatus = tasks.reduce((acc, task) => {
      const status = task.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by vehicle
    const byVehicle = tasks.reduce((acc, task) => {
      const vehicleId = task.vehicle_id;
      if (!acc[vehicleId]) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        acc[vehicleId] = {
          registration: vehicle?.registration_number || 'Unknown',
          count: 0,
          totalCost: 0
        };
      }
      acc[vehicleId].count += 1;
      acc[vehicleId].totalCost += task.total_cost || 0;
      return acc;
    }, {} as Record<string, { registration: string; count: number; totalCost: number }>);

    // Group by priority
    const byPriority = tasks.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by task type
    const byType = tasks.reduce((acc, task) => {
      const type = task.task_type || 'others';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get vendor statistics
    const vendorStats = tasks.reduce((acc, task) => {
      if (task.service_groups) {
        task.service_groups.forEach((group: any) => {
          const vendorId = group.vendor || group.vendor_id;
          if (vendorId) {
            const vendorName = vendorsMap.get(vendorId) || 'Unknown';
            if (!acc[vendorName]) {
              acc[vendorName] = { count: 0, totalCost: 0 };
            }
            acc[vendorName].count += 1;
            acc[vendorName].totalCost += group.service_cost || 0;
          }
        });
      }
      return acc;
    }, {} as Record<string, { count: number; totalCost: number }>);

    // Sort vendors by task count
    const topVendors = Object.entries(vendorStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    // Calculate totals
    const totalCost = tasks.reduce((sum, task) => sum + (task.total_cost || 0), 0);
    const totalParts = tasks.reduce((sum, task) => {
      if (task.service_groups) {
        return sum + task.service_groups.reduce((groupSum, group: any) => {
          const parts = group.parts_data || group.partsData || group.parts || [];
          return groupSum + (Array.isArray(parts) ? parts.length : 0);
        }, 0);
      }
      return sum;
    }, 0);

    // Recent tasks (last 10)
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 10);

    // Upcoming tasks (next 10 by end_date)
    const upcomingTasks = [...tasks]
      .filter(task => {
        const endDate = new Date(task.end_date);
        return endDate > new Date() && task.status !== 'resolved';
      })
      .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
      .slice(0, 10);

    return {
      byStatus,
      byVehicle,
      byPriority,
      byType,
      topVendors,
      totalCost,
      totalParts,
      recentTasks,
      upcomingTasks
    };
  }, [tasks, vehicles, vendorsMap]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'escalated': return 'bg-red-100 text-red-700';
      case 'rework': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'general_scheduled_service': return 'Scheduled Service';
      case 'wear_and_tear_replacement_repairs': return 'Wear & Tear';
      case 'accidental': return 'Accidental';
      case 'others': return 'Others';
      default: return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Vehicle', 'Status', 'Priority', 'Task Type', 'Start Date', 'End Date', 'Total Cost', 'Vendor', 'Odometer'];
    
    const rows = tasks.map(task => {
      const vehicle = vehicles.find(v => v.id === task.vehicle_id);
      const vendor = task.service_groups && task.service_groups.length > 0
        ? vendorsMap.get((task.service_groups[0] as any).vendor || (task.service_groups[0] as any).vendor_id) || 'Unknown'
        : 'N/A';
      
      return [
        vehicle?.registration_number || 'Unknown',
        task.status,
        task.priority,
        getTaskTypeLabel(task.task_type || ''),
        formatDate(task.start_date),
        formatDate(task.end_date),
        task.total_cost || 0,
        vendor,
        task.odometer_reading || 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `maintenance_breakdown_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON (simplified version of PDF export)
  const handleExportJSON = () => {
    const exportData = {
      generated: new Date().toISOString(),
      summary: {
        totalTasks: tasks.length,
        totalCost: breakdown.totalCost,
        totalParts: breakdown.totalParts,
        totalVehicles: Object.keys(breakdown.byVehicle).length
      },
      byStatus: breakdown.byStatus,
      byPriority: breakdown.byPriority,
      byType: breakdown.byType,
      topVendors: Object.fromEntries(breakdown.topVendors),
      tasks: tasks.map(task => {
        const vehicle = vehicles.find(v => v.id === task.vehicle_id);
        return {
          id: task.id,
          vehicle: vehicle?.registration_number || 'Unknown',
          status: task.status,
          priority: task.priority,
          taskType: task.task_type,
          startDate: task.start_date,
          endDate: task.end_date,
          totalCost: task.total_cost,
          odometer: task.odometer_reading
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `maintenance_breakdown_${format(new Date(), 'yyyy-MM-dd')}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="truncate">Task Breakdown</span>
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              Analysis of {tasks.length} tasks
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-blue-500 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Tasks</p>
                  <p className="text-xl sm:text-3xl font-bold text-blue-900 mt-1">{tasks.length}</p>
                </div>
                <Wrench className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-green-600 font-medium">Total Cost</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-900 mt-1 truncate">{formatCurrency(breakdown.totalCost)}</p>
                </div>
                <IndianRupee className="h-8 w-8 sm:h-10 sm:w-10 text-green-400 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-purple-600 font-medium">Total Parts</p>
                  <p className="text-xl sm:text-3xl font-bold text-purple-900 mt-1">{breakdown.totalParts}</p>
                </div>
                <Wrench className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400 flex-shrink-0" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 sm:p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-orange-600 font-medium">Vehicles</p>
                  <p className="text-xl sm:text-3xl font-bold text-orange-900 mt-1">{Object.keys(breakdown.byVehicle).length}</p>
                </div>
                <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-orange-400 flex-shrink-0" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                By Status
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(breakdown.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => onFilterByCategory('status', status)}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(status)} truncate`}>
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-gray-700 ml-2">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                By Priority
              </h3>
              <div className="space-y-3">
                {Object.entries(breakdown.byPriority)
                  .sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return (order[a[0] as keyof typeof order] || 3) - (order[b[0] as keyof typeof order] || 3);
                  })
                  .map(([priority, count]) => (
                    <div
                      key={priority}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => onFilterByCategory('priority', priority)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(priority)}`}>
                          {priority.toUpperCase()}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[150px]">
                          <div
                            className={`h-2 rounded-full ${priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${(count / tasks.length) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-lg font-bold text-gray-700">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Task Type Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                By Task Type
              </h3>
              <div className="space-y-3">
                {Object.entries(breakdown.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const percentage = ((count / tasks.length) * 100).toFixed(1);
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => onFilterByCategory('taskType', type)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{getTaskTypeLabel(type)}</span>
                            <span className="text-sm text-gray-500">{percentage}%</span>
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-purple-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-700 ml-4">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Top Vendors */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                Top 5 Vendors
              </h3>
              <div className="space-y-3">
                {breakdown.topVendors.length > 0 ? (
                  breakdown.topVendors.map(([vendor, stats], index) => (
                    <div
                      key={vendor}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-700">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{vendor}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(stats.totalCost)}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-gray-700 ml-2">{stats.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No vendor data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Vehicles by Task Count */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5 mt-4 sm:mt-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              Top Vehicles by Task Count
            </h3>
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '400px' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rank</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vehicle</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-700 uppercase">Tasks</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold text-gray-700 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Object.entries(breakdown.byVehicle)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10)
                    .map(([vehicleId, data], index) => (
                      <tr
                        key={vehicleId}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onFilterByCategory('vehicle', vehicleId)}
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{index + 1}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">{data.registration}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right font-semibold">{data.count}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right whitespace-nowrap">{formatCurrency(data.totalCost)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent & Upcoming Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mt-4 sm:mt-6">
            {/* Recent Tasks */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Recent Tasks (Last 10)
              </h3>
              <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                {breakdown.recentTasks.map((task) => {
                  const vehicle = vehicles.find(v => v.id === task.vehicle_id);
                  return (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{vehicle?.registration_number || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">{formatDate(task.created_at || '')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className="text-xs text-gray-600">{formatCurrency(task.total_cost || 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Tasks */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-5">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                Upcoming Tasks (Next 10)
              </h3>
              <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                {breakdown.upcomingTasks.length > 0 ? (
                  breakdown.upcomingTasks.map((task) => {
                    const vehicle = vehicles.find(v => v.id === task.vehicle_id);
                    return (
                      <div key={task.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{vehicle?.registration_number || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">Due: {formatDate(task.end_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-8">No upcoming tasks</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <p className="text-xs sm:text-sm text-gray-600">
                Click any category to filter
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
                  title="Export as CSV"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-medium"
                  title="Export as JSON"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBreakdownModal;

