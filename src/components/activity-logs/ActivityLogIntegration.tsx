'use client'

import React from 'react'
import { VehicleActivityLog } from './VehicleActivityLog'
import { UserActivityLog } from './UserActivityLog'
import { logVehicleActivity, logUserActivity, getClientInfo } from '../../utils/activityLogger'
import { VehicleAction, UserAction } from '../../types/logs'

/**
 * Integration component showing how to use the activity log system
 * with existing fleet management components
 */
export function ActivityLogIntegration() {
  // Example: Log vehicle deletion when a vehicle is deleted
  const handleVehicleDelete = async (vehicleId: string, vehicleRegistration: string, deletedBy: string) => {
    try {
      const clientInfo = getClientInfo()
      
      await logVehicleActivity(
        vehicleId,
        VehicleAction.DELETED,
        deletedBy,
        {
          notes: `Vehicle ${vehicleRegistration} deleted`,
          ...clientInfo,
          metadata: {
            vehicle_registration: vehicleRegistration,
            deletion_reason: 'User requested',
            timestamp: new Date().toISOString()
          }
        }
      )
      
      console.log('Vehicle deletion logged successfully')
    } catch (error) {
      console.error('Failed to log vehicle deletion:', error)
    }
  }

  // Example: Log user login activity
  const handleUserLogin = async (userId: string, loginMethod: string = 'email') => {
    try {
      const clientInfo = getClientInfo()
      
      await logUserActivity(
        userId,
        UserAction.LOGIN,
        'auth',
        'login',
        {
          ...clientInfo,
          metadata: {
            login_method: loginMethod,
            session_start: new Date().toISOString()
          }
        }
      )
      
      console.log('User login logged successfully')
    } catch (error) {
      console.error('Failed to log user login:', error)
    }
  }

  // Example: Log data export activity
  const handleDataExport = async (userId: string, exportType: string, recordCount: number) => {
    try {
      const clientInfo = getClientInfo()
      
      await logUserActivity(
        userId,
        UserAction.EXPORT,
        'data',
        exportType,
        {
          ...clientInfo,
          metadata: {
            export_type: exportType,
            record_count: recordCount,
            export_format: 'csv',
            timestamp: new Date().toISOString()
          }
        }
      )
      
      console.log('Data export logged successfully')
    } catch (error) {
      console.error('Failed to log data export:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Integration Examples</h3>
        <p className="text-sm text-blue-800 mb-4">
          This component demonstrates how to integrate the activity log system with your existing components.
        </p>
        
        <div className="space-y-2">
          <button
            onClick={() => handleVehicleDelete('vehicle-123', 'MH12AB1234', 'John Doe')}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Log Vehicle Deletion
          </button>
          
          <button
            onClick={() => handleUserLogin('user-123', 'email')}
            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 ml-2"
          >
            Log User Login
          </button>
          
          <button
            onClick={() => handleDataExport('user-123', 'vehicle_data', 150)}
            className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 ml-2"
          >
            Log Data Export
          </button>
        </div>
      </div>

      {/* Activity Log Components */}
      <VehicleActivityLog limit={10} />
      <UserActivityLog limit={10} />
    </div>
  )
}

/**
 * Higher-order component to automatically log activities
 */
export function withActivityLogging<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  logConfig: {
    onMount?: (props: T) => void
    onUnmount?: (props: T) => void
    onAction?: (action: string, props: T) => void
  }
) {
  return function ActivityLoggedComponent(props: T) {
    React.useEffect(() => {
      if (logConfig.onMount) {
        logConfig.onMount(props)
      }
      
      return () => {
        if (logConfig.onUnmount) {
          logConfig.onUnmount(props)
        }
      }
    }, [])

    return <WrappedComponent {...props} />
  }
}

/**
 * Hook for automatic activity logging
 */
export function useActivityLogging(userId: string) {
  const logActivity = React.useCallback(async (
    action: UserAction | string,
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await logUserActivity(userId, action, resource, resourceId, {
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }, [userId])

  return { logActivity }
}
