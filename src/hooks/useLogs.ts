import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { LogFilters, VehicleLog, UserLog, LogResponse, VehicleActivityLog, UserActivityLog } from '../types/logs'
import { fetchVehicleLogs, fetchUserLogs, exportActivityLogs, getActivityLogAnalytics } from '../utils/api/activityLogs'

/**
 * Custom hook for fetching vehicle activity logs with infinite scroll support
 */
export function useVehicleLogs(filters: LogFilters, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: ['vehicleLogs', filters],
    queryFn: async ({ pageParam = 1 }) => {
      return await fetchVehicleLogs({
        ...filters,
        page: pageParam
      })
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextPage : undefined
    },
    enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  })
}

/**
 * Custom hook for fetching user activity logs with infinite scroll support
 */
export function useUserLogs(filters: LogFilters, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: ['userLogs', filters],
    queryFn: async ({ pageParam = 1 }) => {
      return await fetchUserLogs({
        ...filters,
        page: pageParam
      })
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextPage : undefined
    },
    enabled,
    staleTime: 30000,
    gcTime: 300000,
  })
}

/**
 * Hook for exporting activity logs
 */
export function useExportLogs() {
  return useQuery({
    queryKey: ['exportLogs'],
    queryFn: async (options: LogExportOptions) => {
      return await exportActivityLogs(options)
    },
    enabled: false
  })
}

/**
 * Hook for getting activity log analytics
 */
export function useActivityLogAnalytics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['activityLogAnalytics', startDate, endDate],
    queryFn: async () => {
      return await getActivityLogAnalytics(startDate, endDate)
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
  })
}

/**
 * Hook for creating new activity logs
 */
export function useCreateLog() {
  return useQuery({
    queryKey: ['createLog'],
    queryFn: async () => {
      // This would be used for optimistic updates
      return null
    },
    enabled: false
  })
}
