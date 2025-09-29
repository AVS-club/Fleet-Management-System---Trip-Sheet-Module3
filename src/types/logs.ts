/**
 * Enhanced Activity Log Types for Fleet Management System
 * Provides comprehensive typing for vehicle and user activity tracking
 */

export interface VehicleLog {
  id: string
  vehicleId: string
  vehicle: {
    registration_number: string
    make: string
    model: string
  }
  action: VehicleAction
  userId: string
  user: {
    name: string
    email: string
  }
  metadata?: Record<string, any>
  notes?: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export interface UserLog {
  id: string
  userId: string
  user: {
    name: string
    email: string
    role: string
  }
  action: UserAction
  resource?: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress: string
  device?: string
  location?: string
  timestamp: Date
}

export enum VehicleAction {
  STARTED = 'STARTED',
  STOPPED = 'STOPPED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  REFUELED = 'REFUELED',
  GPS_UPDATED = 'GPS_UPDATED',
  SPEED_ALERT = 'SPEED_ALERT',
  ROUTE_DEVIATION = 'ROUTE_DEVIATION',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED',
  UPDATED = 'UPDATED',
  EXPORTED = 'EXPORTED',
  PERMANENTLY_DELETED = 'PERMANENTLY_DELETED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_UNASSIGNED = 'DRIVER_UNASSIGNED'
}

export enum UserAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PROFILE_UPDATE = 'PROFILE_UPDATE'
}

export interface LogFilters {
  startDate?: Date
  endDate?: Date
  action?: string
  userId?: string
  vehicleId?: string
  searchQuery?: string
  page: number
  limit: number
}

export interface LogPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
  nextPage: number | null
}

export interface LogResponse<T> {
  logs: T[]
  pagination: LogPagination
}

export interface LogExportOptions {
  type: 'vehicle' | 'user'
  format: 'csv' | 'excel' | 'pdf'
  filters: LogFilters
  dateRange?: {
    start: Date
    end: Date
  }
}

// Legacy compatibility types
export interface VehicleActivityLog {
  id?: string
  vehicle_id: string
  action_type: VehicleAction | string
  action_by: string
  timestamp?: string
  notes?: string
  created_at?: string
  vehicles?: {
    registration_number: string
  }
}

export interface UserActivityLog {
  id?: string
  user_id: string
  action_type: UserAction | string
  action_by: string
  resource?: string
  resource_id?: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  device?: string
  location?: string
  timestamp?: string
  created_at?: string
}

// Performance monitoring types
export interface LogPerformanceMetrics {
  queryTime: number
  totalRecords: number
  cacheHit: boolean
  memoryUsage?: number
}

export interface LogAnalytics {
  totalLogs: number
  logsByAction: Record<string, number>
  logsByUser: Record<string, number>
  logsByVehicle: Record<string, number>
  logsByDate: Record<string, number>
  topActions: Array<{ action: string; count: number }>
  topUsers: Array<{ user: string; count: number }>
  topVehicles: Array<{ vehicle: string; count: number }>
}
