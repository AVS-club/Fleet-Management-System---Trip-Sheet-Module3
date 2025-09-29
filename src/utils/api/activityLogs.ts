import { supabase } from '../supabaseClient'
import { handleSupabaseError } from '../errors'
import { LogFilters, LogResponse, VehicleActivityLog, UserActivityLog, LogExportOptions } from '../../types/logs'

/**
 * API functions for Activity Logs
 * These functions provide a clean interface for fetching and managing activity logs
 */

/**
 * Fetch vehicle activity logs with pagination and filtering
 */
export async function fetchVehicleLogs(filters: LogFilters): Promise<LogResponse<VehicleActivityLog>> {
  try {
    const skip = (filters.page - 1) * filters.limit
    
    // Build filter conditions
    let query = supabase
      .from('vehicle_activity_log')
      .select(`
        *,
        vehicles!inner(
          registration_number,
          make,
          model
        )
      `)
      .order('timestamp', { ascending: false })
      .range(skip, skip + filters.limit - 1)

    // Apply filters
    if (filters.vehicleId && filters.vehicleId !== 'all') {
      query = query.eq('vehicle_id', filters.vehicleId)
    }
    
    if (filters.action && filters.action !== 'all') {
      query = query.eq('action_type', filters.action)
    }
    
    if (filters.searchQuery) {
      query = query.or(`
        action_by.ilike.%${filters.searchQuery}%,
        notes.ilike.%${filters.searchQuery}%,
        action_type.ilike.%${filters.searchQuery}%,
        vehicles.registration_number.ilike.%${filters.searchQuery}%
      `)
    }
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString())
      }
    }

    const { data: logs, error: logsError } = await query

    if (logsError) {
      handleSupabaseError('fetch vehicle logs', logsError)
      throw logsError
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('vehicle_activity_log')
      .select('*', { count: 'exact', head: true })

    // Apply same filters for count
    if (filters.vehicleId && filters.vehicleId !== 'all') {
      countQuery = countQuery.eq('vehicle_id', filters.vehicleId)
    }
    
    if (filters.action && filters.action !== 'all') {
      countQuery = countQuery.eq('action_type', filters.action)
    }
    
    if (filters.searchQuery) {
      countQuery = countQuery.or(`
        action_by.ilike.%${filters.searchQuery}%,
        notes.ilike.%${filters.searchQuery}%,
        action_type.ilike.%${filters.searchQuery}%
      `)
    }
    
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        countQuery = countQuery.gte('timestamp', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        countQuery = countQuery.lte('timestamp', filters.endDate.toISOString())
      }
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      handleSupabaseError('fetch vehicle logs count', countError)
      throw countError
    }

    const total = count || 0
    const totalPages = Math.ceil(total / filters.limit)
    const hasMore = filters.page < totalPages

    return {
      logs: logs || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasMore,
        nextPage: hasMore ? filters.page + 1 : null
      }
    }
  } catch (error) {
    handleSupabaseError('fetch vehicle logs', error)
    throw error
  }
}

/**
 * Fetch user activity logs with pagination and filtering
 */
export async function fetchUserLogs(filters: LogFilters): Promise<LogResponse<UserActivityLog>> {
  try {
    const skip = (filters.page - 1) * filters.limit
    
    // Build filter conditions
    let query = supabase
      .from('user_activity_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(skip, skip + filters.limit - 1)

    // Apply filters
    if (filters.userId && filters.userId !== 'all') {
      query = query.eq('user_id', filters.userId)
    }
    
    if (filters.action && filters.action !== 'all') {
      query = query.eq('action_type', filters.action)
    }
    
    if (filters.searchQuery) {
      query = query.or(`
        action_by.ilike.%${filters.searchQuery}%,
        resource.ilike.%${filters.searchQuery}%,
        action_type.ilike.%${filters.searchQuery}%
      `)
    }
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString())
      }
    }

    const { data: logs, error: logsError } = await query

    if (logsError) {
      handleSupabaseError('fetch user logs', logsError)
      throw logsError
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('user_activity_log')
      .select('*', { count: 'exact', head: true })

    // Apply same filters for count
    if (filters.userId && filters.userId !== 'all') {
      countQuery = countQuery.eq('user_id', filters.userId)
    }
    
    if (filters.action && filters.action !== 'all') {
      countQuery = countQuery.eq('action_type', filters.action)
    }
    
    if (filters.searchQuery) {
      countQuery = countQuery.or(`
        action_by.ilike.%${filters.searchQuery}%,
        resource.ilike.%${filters.searchQuery}%,
        action_type.ilike.%${filters.searchQuery}%
      `)
    }
    
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        countQuery = countQuery.gte('timestamp', filters.startDate.toISOString())
      }
      if (filters.endDate) {
        countQuery = countQuery.lte('timestamp', filters.endDate.toISOString())
      }
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      handleSupabaseError('fetch user logs count', countError)
      throw countError
    }

    const total = count || 0
    const totalPages = Math.ceil(total / filters.limit)
    const hasMore = filters.page < totalPages

    return {
      logs: logs || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasMore,
        nextPage: hasMore ? filters.page + 1 : null
      }
    }
  } catch (error) {
    handleSupabaseError('fetch user logs', error)
    throw error
  }
}

/**
 * Export activity logs in various formats
 */
export async function exportActivityLogs(options: LogExportOptions): Promise<Blob> {
  try {
    // Fetch all logs based on filters (with a high limit for export)
    const exportFilters: LogFilters = {
      ...options.filters,
      limit: 10000, // High limit for export
      page: 1
    }

    let logs: any[] = []
    
    if (options.type === 'vehicle') {
      const response = await fetchVehicleLogs(exportFilters)
      logs = response.logs
    } else {
      const response = await fetchUserLogs(exportFilters)
      logs = response.logs
    }

    // Generate content based on format
    let content: string
    let mimeType: string
    let filename: string

    const timestamp = new Date().toISOString().split('T')[0]

    if (options.format === 'csv') {
      content = generateCSVContent(logs, options.type)
      mimeType = 'text/csv'
      filename = `${options.type}-logs-${timestamp}.csv`
    } else if (options.format === 'excel') {
      // For Excel, we'll generate CSV format (can be enhanced with a proper Excel library)
      content = generateCSVContent(logs, options.type)
      mimeType = 'application/vnd.ms-excel'
      filename = `${options.type}-logs-${timestamp}.xls`
    } else {
      // PDF format - generate simple text format (can be enhanced with PDF library)
      content = generateTextContent(logs, options.type)
      mimeType = 'text/plain'
      filename = `${options.type}-logs-${timestamp}.txt`
    }

    return new Blob([content], { type: mimeType })
  } catch (error) {
    handleSupabaseError('export activity logs', error)
    throw error
  }
}

/**
 * Generate CSV content for export
 */
function generateCSVContent(logs: any[], type: 'vehicle' | 'user'): string {
  if (type === 'vehicle') {
    const headers = ['Vehicle', 'Action', 'User', 'Timestamp', 'Notes', 'IP Address', 'Device']
    const rows = logs.map(log => [
      log.vehicles?.registration_number || 'Unknown',
      log.action_type,
      log.action_by,
      log.timestamp ? new Date(log.timestamp).toISOString() : '',
      log.notes || '',
      log.ip_address || '',
      log.device || ''
    ])
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
  } else {
    const headers = ['User ID', 'Action', 'Resource', 'Timestamp', 'IP Address', 'Device', 'Location']
    const rows = logs.map(log => [
      log.user_id,
      log.action_type,
      log.resource || '',
      log.timestamp ? new Date(log.timestamp).toISOString() : '',
      log.ip_address || '',
      log.device || '',
      log.location || ''
    ])
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
  }
}

/**
 * Generate text content for export
 */
function generateTextContent(logs: any[], type: 'vehicle' | 'user'): string {
  const header = `${type.toUpperCase()} ACTIVITY LOGS\nGenerated: ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`
  
  const content = logs.map((log, index) => {
    if (type === 'vehicle') {
      return `${index + 1}. Vehicle: ${log.vehicles?.registration_number || 'Unknown'}
   Action: ${log.action_type}
   User: ${log.action_by}
   Timestamp: ${log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A'}
   Notes: ${log.notes || 'N/A'}
   IP: ${log.ip_address || 'N/A'}
   Device: ${log.device || 'N/A'}
`
    } else {
      return `${index + 1}. User ID: ${log.user_id}
   Action: ${log.action_type}
   Resource: ${log.resource || 'N/A'}
   Timestamp: ${log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A'}
   IP: ${log.ip_address || 'N/A'}
   Device: ${log.device || 'N/A'}
   Location: ${log.location || 'N/A'}
`
    }
  }).join('\n')

  return header + content
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
      throw error
    }

    return data
  } catch (error) {
    handleSupabaseError('get activity log analytics', error)
    throw error
  }
}

/**
 * Create a new activity log entry
 */
export async function createActivityLog(
  type: 'vehicle' | 'user',
  data: any
): Promise<string | null> {
  try {
    let result
    
    if (type === 'vehicle') {
      const { data: logData, error } = await supabase.rpc('log_vehicle_activity', {
        p_vehicle_id: data.vehicleId,
        p_action_type: data.action,
        p_action_by: data.actionBy,
        p_notes: data.notes || null,
        p_metadata: data.metadata || null,
        p_ip_address: data.ipAddress || null,
        p_user_agent: data.userAgent || null,
        p_device: data.device || null,
        p_location: data.location || null
      })
      
      if (error) throw error
      result = logData
    } else {
      const { data: logData, error } = await supabase.rpc('log_user_activity', {
        p_user_id: data.userId,
        p_action_type: data.action,
        p_resource: data.resource || null,
        p_resource_id: data.resourceId || null,
        p_metadata: data.metadata || null,
        p_ip_address: data.ipAddress || null,
        p_user_agent: data.userAgent || null,
        p_device: data.device || null,
        p_location: data.location || null
      })
      
      if (error) throw error
      result = logData
    }

    return result
  } catch (error) {
    handleSupabaseError('create activity log', error)
    throw error
  }
}
