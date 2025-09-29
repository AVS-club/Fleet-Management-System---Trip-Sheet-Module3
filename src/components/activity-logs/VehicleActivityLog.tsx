'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Search, Download, Loader2, Truck, UserCircle, Clock } from 'lucide-react'
import { useVehicleLogs } from '../../hooks/useLogs'
import { useDebounce } from '../../hooks/useDebounce'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { VehicleActivityLog, VehicleAction } from '../../types/logs'
import { getVehicles } from '../../utils/storage'

interface VehicleActivityLogProps {
  limit?: number
  vehicleId?: string
  refreshTrigger?: number
}

export function VehicleActivityLog({ 
  limit = 20,
  vehicleId,
  refreshTrigger = 0
}: VehicleActivityLogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    vehicleId: vehicleId || 'all',
    action: 'all',
    searchQuery: '',
    page: 1,
    limit
  })
  const [vehicles, setVehicles] = useState<{ id: string; registration_number: string }[]>([])
  
  const debouncedSearch = useDebounce(filters.searchQuery, 500)
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching
  } = useVehicleLogs(
    { ...filters, searchQuery: debouncedSearch },
    isOpen // Only fetch when panel is open
  )
  
  const lastElementRef = useInfiniteScroll({
    loading: isFetchingNextPage,
    hasMore: hasNextPage || false,
    onLoadMore: fetchNextPage
  })
  
  // Fetch vehicles for filter dropdown
  useEffect(() => {
    if (isOpen && !vehicleId) {
      const fetchVehicles = async () => {
        try {
          const vehiclesData = await getVehicles()
          setVehicles(
            vehiclesData.map(vehicle => ({
              id: vehicle.id,
              registration_number: vehicle.registration_number
            }))
          )
        } catch (error) {
          console.error('Error fetching vehicles:', error)
        }
      }
      fetchVehicles()
    }
  }, [isOpen, vehicleId])
  
  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('Logs refreshed')
    } catch (error) {
      toast.error('Failed to refresh logs')
    }
  }
  
  const handleExport = async () => {
    try {
      // Create CSV content
      const allLogs = data?.pages.flatMap(page => page.logs) || []
      const csvContent = [
        ['Vehicle', 'Action', 'User', 'Timestamp', 'Notes'].join(','),
        ...allLogs.map(log => [
          log.vehicles?.registration_number || 'Unknown',
          log.action_type,
          log.action_by,
          log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          log.notes || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n')
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vehicle-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Logs exported successfully')
    } catch (error) {
      toast.error('Failed to export logs')
    }
  }
  
  const allLogs = data?.pages.flatMap(page => page.logs) || []
  const totalLogs = data?.pages[0]?.pagination.total || 0
  
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'deleted':
      case 'permanently_deleted':
        return 'bg-red-100 text-red-800'
      case 'archived':
        return 'bg-yellow-100 text-yellow-800'
      case 'assigned_driver':
      case 'DRIVER_ASSIGNED':
        return 'bg-green-100 text-green-800'
      case 'unassigned_driver':
      case 'DRIVER_UNASSIGNED':
        return 'bg-blue-100 text-blue-800'
      case 'exported':
        return 'bg-indigo-100 text-indigo-800'
      case 'updated':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return format(date, 'MMM dd, yyyy HH:mm')
    } catch (error) {
      return 'Invalid Date'
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <h2 className="text-lg font-semibold">Vehicle Activity Logs</h2>
          <span className="text-sm text-gray-500">
            Track all changes to vehicles including deletions, archiving, and driver assignments
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && totalLogs > 0 && (
            <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
              {totalLogs} logs
            </span>
          )}
        </div>
      </div>
      
      {/* Content - Only rendered when open */}
      {isOpen && (
        <div className="border-t border-gray-200">
          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-4">
              {!vehicleId && (
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filters.vehicleId}
                  onChange={(e) => setFilters({ ...filters, vehicleId: e.target.value })}
                >
                  <option value="all">All Vehicles</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number}
                    </option>
                  ))}
                </select>
              )}
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="all">All Actions</option>
                <option value="deleted">Deleted</option>
                <option value="archived">Archived</option>
                <option value="assigned_driver">Driver Assigned</option>
                <option value="unassigned_driver">Driver Unassigned</option>
                <option value="updated">Updated</option>
                <option value="exported">Exported</option>
                <option value="permanently_deleted">Permanently Deleted</option>
              </select>
              
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by user or notes..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  />
                </div>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={isRefetching}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isRefetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : allLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No activity logs found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {!vehicleId && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      ref={index === allLogs.length - 1 ? lastElementRef : null}
                      className="hover:bg-gray-50"
                    >
                      {!vehicleId && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {log.vehicles?.registration_number || 'Unknown'}
                              </div>
                              {log.vehicles && (
                                <div className="text-xs text-gray-500">
                                  {log.vehicles.make} {log.vehicles.model}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(log.action_type)}`}>
                          {formatActionType(log.action_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCircle className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{log.action_by}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
