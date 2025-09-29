'use client'

import React from 'react'
import { Calendar, Filter, X } from 'lucide-react'
import { LogFilters as LogFiltersType } from '../../types/logs'

interface LogFiltersProps {
  filters: LogFiltersType
  onFiltersChange: (filters: LogFiltersType) => void
  onClearFilters: () => void
  showDateRange?: boolean
  showVehicleFilter?: boolean
  showUserFilter?: boolean
  showActionFilter?: boolean
  vehicles?: Array<{ id: string; registration_number: string }>
  users?: Array<{ id: string; name: string; email: string }>
  actions?: Array<{ value: string; label: string }>
}

export function LogFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  showDateRange = true,
  showVehicleFilter = false,
  showUserFilter = false,
  showActionFilter = true,
  vehicles = [],
  users = [],
  actions = []
}: LogFiltersProps) {
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const date = value ? new Date(value) : undefined
    onFiltersChange({
      ...filters,
      [field]: date
    })
  }

  const hasActiveFilters = 
    filters.startDate || 
    filters.endDate || 
    (filters.vehicleId && filters.vehicleId !== 'all') ||
    (filters.userId && filters.userId !== 'all') ||
    (filters.action && filters.action !== 'all') ||
    filters.searchQuery

  return (
    <div className="bg-gray-50 border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        {showDateRange && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Vehicle Filter */}
        {showVehicleFilter && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vehicle
            </label>
            <select
              value={filters.vehicleId || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, vehicleId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_number}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Filter */}
        {showUserFilter && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              User
            </label>
            <select
              value={filters.userId || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Filter */}
        {showActionFilter && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={filters.action || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Actions</option>
              {actions.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Search
        </label>
        <input
          type="text"
          placeholder="Search logs..."
          value={filters.searchQuery || ''}
          onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
    </div>
  )
}
