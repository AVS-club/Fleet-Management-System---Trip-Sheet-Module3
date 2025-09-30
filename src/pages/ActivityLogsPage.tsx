'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import { VehicleActivityLog } from '../components/activity-logs/VehicleActivityLog'
import { UserActivityLog } from '../components/activity-logs/UserActivityLog'
import { LogFilters } from '../components/activity-logs/LogFilters'
import { LogExport } from '../components/activity-logs/LogExport'
import { LogFilters as LogFiltersType, LogExportOptions } from '../types/logs'
import { useState, useEffect } from 'react'
import { getVehicles } from '../utils/storage'
import { supabase } from '../utils/supabaseClient'

// Create a separate QueryClient for this page to avoid conflicts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30000,
    },
  },
})

export default function ActivityLogsPage() {
  const [vehicleFilters, setVehicleFilters] = useState<LogFiltersType>({
    page: 1,
    limit: 20,
    vehicleId: 'all',
    action: 'all',
    searchQuery: ''
  })

  const [userFilters, setUserFilters] = useState<LogFiltersType>({
    page: 1,
    limit: 20,
    userId: 'all',
    action: 'all',
    searchQuery: ''
  })

  const [vehicles, setVehicles] = useState<Array<{ id: string; registration_number: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [loading, setLoading] = useState(true)

  // Fetch vehicles and users for filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch vehicles
        const vehiclesData = await getVehicles()
        setVehicles(
          vehiclesData.map(vehicle => ({
            id: vehicle.id,
            registration_number: vehicle.registration_number
          }))
        )

        // For now, we'll skip fetching users since we don't have a profiles table
        // Users will be displayed by their action_by field and user_id
        setUsers([])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleVehicleFiltersChange = (filters: LogFiltersType) => {
    setVehicleFilters(filters)
  }

  const handleUserFiltersChange = (filters: LogFiltersType) => {
    setUserFilters(filters)
  }

  const clearVehicleFilters = () => {
    setVehicleFilters({
      page: 1,
      limit: 20,
      vehicleId: 'all',
      action: 'all',
      searchQuery: ''
    })
  }

  const clearUserFilters = () => {
    setUserFilters({
      page: 1,
      limit: 20,
      userId: 'all',
      action: 'all',
      searchQuery: ''
    })
  }

  const handleExport = async (options: LogExportOptions) => {
    // The export is now handled directly in the LogExport component
    // This function is kept for compatibility but not used
    console.log('Export options:', options)
    return Promise.resolve()
  }

  const vehicleActions = [
    { value: 'all', label: 'All Actions' },
    { value: 'deleted', label: 'Deleted' },
    { value: 'archived', label: 'Archived' },
    { value: 'assigned_driver', label: 'Driver Assigned' },
    { value: 'unassigned_driver', label: 'Driver Unassigned' },
    { value: 'updated', label: 'Updated' },
    { value: 'exported', label: 'Exported' },
    { value: 'permanently_deleted', label: 'Permanently Deleted' }
  ]

  const userActions = [
    { value: 'all', label: 'All Actions' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'VIEW', label: 'View' },
    { value: 'EXPORT', label: 'Export' },
    { value: 'IMPORT', label: 'Import' },
    { value: 'PERMISSION_CHANGE', label: 'Permission Change' },
    { value: 'PASSWORD_CHANGE', label: 'Password Change' },
    { value: 'PROFILE_UPDATE', label: 'Profile Update' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor all system activities and user actions with real-time updates
            </p>
          </div>

          {/* Export Controls */}
          <div className="mb-6 flex justify-end">
            <LogExport onExport={handleExport} />
          </div>
          
          {/* Activity Logs */}
          <div className="space-y-6">
            {/* Vehicle Activity Logs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Vehicle Activity Logs</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Track all changes to vehicles including deletions, archiving, and driver assignments
                </p>
              </div>
              
              <LogFilters
                filters={vehicleFilters}
                onFiltersChange={handleVehicleFiltersChange}
                onClearFilters={clearVehicleFilters}
                showDateRange={true}
                showVehicleFilter={true}
                showActionFilter={true}
                vehicles={vehicles}
                actions={vehicleActions}
              />
              
              <VehicleActivityLog
                limit={vehicleFilters.limit}
                refreshTrigger={0}
              />
            </div>

            {/* User Activity Logs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">User Activity Logs</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Monitor user actions, logins, and system interactions
                </p>
              </div>
              
              <LogFilters
                filters={userFilters}
                onFiltersChange={handleUserFiltersChange}
                onClearFilters={clearUserFilters}
                showDateRange={true}
                showUserFilter={true}
                showActionFilter={true}
                users={users}
                actions={userActions}
              />
              
              <UserActivityLog
                limit={userFilters.limit}
                refreshTrigger={0}
              />
            </div>
          </div>

          {/* Performance Tips */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Performance Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use date filters to limit the data range for better performance</li>
              <li>• Search is debounced to avoid excessive API calls</li>
              <li>• Data is loaded lazily when panels are expanded</li>
              <li>• Infinite scroll loads more data as you scroll down</li>
            </ul>
          </div>
        </div>
      </div>
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </QueryClientProvider>
  )
}
