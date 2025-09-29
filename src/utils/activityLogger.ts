import { supabase } from './supabaseClient'
import { handleSupabaseError } from './errors'
import { VehicleAction, UserAction } from '../types/logs'

/**
 * Enhanced Activity Logger for Fleet Management System
 * Provides comprehensive logging capabilities with metadata and performance tracking
 */

interface LogMetadata {
  [key: string]: any
}

interface LogOptions {
  metadata?: LogMetadata
  ipAddress?: string
  userAgent?: string
  device?: string
  location?: string
  notes?: string
}

/**
 * Log user activity with comprehensive metadata
 */
export async function logUserActivity(
  userId: string,
  action: UserAction | string,
  resource?: string,
  resourceId?: string,
  options: LogOptions = {}
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_user_activity', {
      p_user_id: userId,
      p_action_type: action,
      p_resource: resource || null,
      p_resource_id: resourceId || null,
      p_metadata: options.metadata || null,
      p_ip_address: options.ipAddress || null,
      p_user_agent: options.userAgent || null,
      p_device: options.device || null,
      p_location: options.location || null
    })

    if (error) {
      handleSupabaseError('log user activity', error)
      return null
    }

    return data
  } catch (error) {
    handleSupabaseError('log user activity', error)
    return null
  }
}

/**
 * Log vehicle activity with comprehensive metadata
 */
export async function logVehicleActivity(
  vehicleId: string,
  action: VehicleAction | string,
  actionBy: string,
  options: LogOptions = {}
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_vehicle_activity', {
      p_vehicle_id: vehicleId,
      p_action_type: action,
      p_action_by: actionBy,
      p_notes: options.notes || null,
      p_metadata: options.metadata || null,
      p_ip_address: options.ipAddress || null,
      p_user_agent: options.userAgent || null,
      p_device: options.device || null,
      p_location: options.location || null
    })

    if (error) {
      handleSupabaseError('log vehicle activity', error)
      return null
    }

    return data
  } catch (error) {
    handleSupabaseError('log vehicle activity', error)
    return null
  }
}

/**
 * Get client information for logging
 */
export function getClientInfo(): Pick<LogOptions, 'ipAddress' | 'userAgent' | 'device'> {
  const userAgent = navigator.userAgent
  const device = getDeviceType(userAgent)
  
  return {
    userAgent,
    device
  }
}

/**
 * Determine device type from user agent
 */
function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'Mobile'
  } else if (/Tablet|iPad/.test(userAgent)) {
    return 'Tablet'
  } else {
    return 'Desktop'
  }
}

/**
 * Log user login activity
 */
export async function logUserLogin(userId: string, metadata?: LogMetadata): Promise<void> {
  const clientInfo = getClientInfo()
  
  await logUserActivity(
    userId,
    UserAction.LOGIN,
    'auth',
    'login',
    {
      ...clientInfo,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log user logout activity
 */
export async function logUserLogout(userId: string, metadata?: LogMetadata): Promise<void> {
  const clientInfo = getClientInfo()
  
  await logUserActivity(
    userId,
    UserAction.LOGOUT,
    'auth',
    'logout',
    {
      ...clientInfo,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log vehicle deletion activity
 */
export async function logVehicleDeletion(
  vehicleId: string,
  vehicleRegistration: string,
  deletedBy: string,
  metadata?: LogMetadata
): Promise<void> {
  await logVehicleActivity(
    vehicleId,
    VehicleAction.DELETED,
    deletedBy,
    {
      notes: `Vehicle ${vehicleRegistration} deleted`,
      metadata: {
        ...metadata,
        vehicle_registration: vehicleRegistration,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log vehicle archiving activity
 */
export async function logVehicleArchiving(
  vehicleId: string,
  vehicleRegistration: string,
  archivedBy: string,
  reason?: string,
  metadata?: LogMetadata
): Promise<void> {
  await logVehicleActivity(
    vehicleId,
    VehicleAction.ARCHIVED,
    archivedBy,
    {
      notes: reason || `Vehicle ${vehicleRegistration} archived`,
      metadata: {
        ...metadata,
        vehicle_registration: vehicleRegistration,
        reason,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log driver assignment activity
 */
export async function logDriverAssignment(
  vehicleId: string,
  vehicleRegistration: string,
  driverName: string,
  assignedBy: string,
  metadata?: LogMetadata
): Promise<void> {
  await logVehicleActivity(
    vehicleId,
    VehicleAction.DRIVER_ASSIGNED,
    assignedBy,
    {
      notes: `Driver ${driverName} assigned to vehicle ${vehicleRegistration}`,
      metadata: {
        ...metadata,
        vehicle_registration: vehicleRegistration,
        driver_name: driverName,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log driver unassignment activity
 */
export async function logDriverUnassignment(
  vehicleId: string,
  vehicleRegistration: string,
  driverName: string,
  unassignedBy: string,
  metadata?: LogMetadata
): Promise<void> {
  await logVehicleActivity(
    vehicleId,
    VehicleAction.DRIVER_UNASSIGNED,
    unassignedBy,
    {
      notes: `Driver ${driverName} unassigned from vehicle ${vehicleRegistration}`,
      metadata: {
        ...metadata,
        vehicle_registration: vehicleRegistration,
        driver_name: driverName,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log data export activity
 */
export async function logDataExport(
  userId: string,
  exportType: string,
  recordCount: number,
  metadata?: LogMetadata
): Promise<void> {
  const clientInfo = getClientInfo()
  
  await logUserActivity(
    userId,
    UserAction.EXPORT,
    'data',
    exportType,
    {
      ...clientInfo,
      metadata: {
        ...metadata,
        export_type: exportType,
        record_count: recordCount,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Log data import activity
 */
export async function logDataImport(
  userId: string,
  importType: string,
  recordCount: number,
  successCount: number,
  errorCount: number,
  metadata?: LogMetadata
): Promise<void> {
  const clientInfo = getClientInfo()
  
  await logUserActivity(
    userId,
    UserAction.IMPORT,
    'data',
    importType,
    {
      ...clientInfo,
      metadata: {
        ...metadata,
        import_type: importType,
        total_records: recordCount,
        success_count: successCount,
        error_count: errorCount,
        timestamp: new Date().toISOString()
      }
    }
  )
}

/**
 * Get activity log analytics
 */
export async function getActivityLogAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_activity_log_analytics', {
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null
    })

    if (error) {
      handleSupabaseError('get activity log analytics', error)
      return null
    }

    return data
  } catch (error) {
    handleSupabaseError('get activity log analytics', error)
    return null
  }
}

/**
 * Batch log multiple activities (for performance)
 */
export async function batchLogActivities(
  activities: Array<{
    type: 'user' | 'vehicle'
    userId?: string
    vehicleId?: string
    action: string
    resource?: string
    resourceId?: string
    actionBy?: string
    options?: LogOptions
  }>
): Promise<void> {
  try {
    const promises = activities.map(activity => {
      if (activity.type === 'user' && activity.userId) {
        return logUserActivity(
          activity.userId,
          activity.action,
          activity.resource,
          activity.resourceId,
          activity.options
        )
      } else if (activity.type === 'vehicle' && activity.vehicleId && activity.actionBy) {
        return logVehicleActivity(
          activity.vehicleId,
          activity.action,
          activity.actionBy,
          activity.options
        )
      }
      return Promise.resolve(null)
    })

    await Promise.all(promises)
  } catch (error) {
    handleSupabaseError('batch log activities', error)
  }
}

/**
 * Performance monitoring for activity logging
 */
export class ActivityLogPerformanceMonitor {
  private static instance: ActivityLogPerformanceMonitor
  private metrics: Map<string, { startTime: number; endTime?: number }> = new Map()

  static getInstance(): ActivityLogPerformanceMonitor {
    if (!ActivityLogPerformanceMonitor.instance) {
      ActivityLogPerformanceMonitor.instance = new ActivityLogPerformanceMonitor()
    }
    return ActivityLogPerformanceMonitor.instance
  }

  startTiming(operationId: string): void {
    this.metrics.set(operationId, { startTime: performance.now() })
  }

  endTiming(operationId: string): number {
    const metric = this.metrics.get(operationId)
    if (metric) {
      metric.endTime = performance.now()
      const duration = metric.endTime - metric.startTime
      this.metrics.delete(operationId)
      return duration
    }
    return 0
  }

  getMetrics(): Map<string, number> {
    const result = new Map<string, number>()
    for (const [id, metric] of this.metrics.entries()) {
      if (metric.endTime) {
        result.set(id, metric.endTime - metric.startTime)
      }
    }
    return result
  }
}
