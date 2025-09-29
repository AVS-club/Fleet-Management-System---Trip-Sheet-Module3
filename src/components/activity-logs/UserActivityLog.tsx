'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, RefreshCw, Search, Download, Loader2, User, UserCircle, Clock, Shield } from 'lucide-react'
import { useUserLogs } from '../../hooks/useLogs'
import { useDebounce } from '../../hooks/useDebounce'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { format } from 'date-fns'
import { toast } from 'react-toastify'
import { UserActivityLog as UserLog, UserAction } from '../../types/logs'

interface UserActivityLogProps {
  limit?: number
  userId?: string
  refreshTrigger?: number
}

export function UserActivityLog({ 
  limit = 20,
  userId,
  refreshTrigger = 0
}: UserActivityLogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState({
    userId: userId || 'all',
    action: 'all',
    searchQuery: '',
    page: 1,
    limit
  })
  
  const debouncedSearch = useDebounce(filters.searchQuery, 500)
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching
  } = useUserLogs(
    { ...filters, searchQuery: debouncedSearch },
    isOpen // Only fetch when panel is open
  )
  
  const lastElementRef = useInfiniteScroll({
    loading: isFetchingNextPage,
    hasMore: hasNextPage || false,
    onLoadMore: fetchNextPage
  })
  
  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('User logs refreshed')
    } catch (error) {
      toast.error('Failed to refresh user logs')
    }
  }
  
  const handleExport = async () => {
    try {
      // Create CSV content
      const allLogs = data?.pages.flatMap(page => page.logs) || []
      const csvContent = [
        ['User', 'Action', 'Resource', 'Timestamp', 'IP Address', 'Device'].join(','),
        ...allLogs.map(log => [
          log.users?.name || 'Unknown',
          log.action_type,
          log.resource || '',
          log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          log.ip_address || '',
          log.device || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n')
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('User logs exported successfully')
    } catch (error) {
      toast.error('Failed to export user logs')
    }
  }
  
  const allLogs = data?.pages.flatMap(page => page.logs) || []
  const totalLogs = data?.pages[0]?.pagination.total || 0
  
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'LOGIN':
        return 'bg-green-100 text-green-800'
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800'
      case 'CREATE':
        return 'bg-blue-100 text-blue-800'
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      case 'VIEW':
        return 'bg-indigo-100 text-indigo-800'
      case 'EXPORT':
        return 'bg-purple-100 text-purple-800'
      case 'IMPORT':
        return 'bg-pink-100 text-pink-800'
      case 'PERMISSION_CHANGE':
        return 'bg-orange-100 text-orange-800'
      case 'PASSWORD_CHANGE':
        return 'bg-red-100 text-red-800'
      case 'PROFILE_UPDATE':
        return 'bg-cyan-100 text-cyan-800'
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
          <h2 className="text-lg font-semibold">User Activity Logs</h2>
          <span className="text-sm text-gray-500">
            Monitor user actions, logins, and system interactions
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
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="all">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="VIEW">View</option>
                <option value="EXPORT">Export</option>
                <option value="IMPORT">Import</option>
                <option value="PERMISSION_CHANGE">Permission Change</option>
                <option value="PASSWORD_CHANGE">Password Change</option>
                <option value="PROFILE_UPDATE">Profile Update</option>
              </select>
              
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by user or resource..."
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
                No user activity logs found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.action_by || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              User ID: {log.user_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(log.action_type)}`}>
                          {formatActionType(log.action_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {log.resource || '-'}
                        </div>
                        {log.resource_id && (
                          <div className="text-xs text-gray-500">
                            ID: {log.resource_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {log.device || '-'}
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
