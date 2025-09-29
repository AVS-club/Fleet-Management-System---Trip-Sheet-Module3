# 🚀 Activity Log API Integration Guide

## 📋 Overview

The Activity Log API provides a complete set of functions for managing vehicle and user activity logs in your Fleet Management System. All functions are optimized for performance and include proper error handling.

## 🔧 API Functions

### **Core API Functions** (`src/utils/api/activityLogs.ts`)

#### 1. **Fetch Vehicle Logs**
```typescript
import { fetchVehicleLogs } from '../utils/api/activityLogs'

const logs = await fetchVehicleLogs({
  page: 1,
  limit: 20,
  vehicleId: 'all', // or specific vehicle ID
  action: 'all', // or specific action
  searchQuery: 'search term',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
})
```

#### 2. **Fetch User Logs**
```typescript
import { fetchUserLogs } from '../utils/api/activityLogs'

const logs = await fetchUserLogs({
  page: 1,
  limit: 20,
  userId: 'all', // or specific user ID
  action: 'all', // or specific action
  searchQuery: 'search term',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31')
})
```

#### 3. **Export Logs**
```typescript
import { exportActivityLogs } from '../utils/api/activityLogs'

const blob = await exportActivityLogs({
  type: 'vehicle', // or 'user'
  format: 'csv', // or 'excel', 'pdf'
  filters: {
    page: 1,
    limit: 1000,
    action: 'all'
  },
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  }
})

// Download the file
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'vehicle-logs.csv'
a.click()
```

#### 4. **Get Analytics**
```typescript
import { getActivityLogAnalytics } from '../utils/api/activityLogs'

const analytics = await getActivityLogAnalytics(
  new Date('2024-01-01'),
  new Date('2024-12-31')
)
```

#### 5. **Create Activity Log**
```typescript
import { createActivityLog } from '../utils/api/activityLogs'

// Create vehicle activity log
const logId = await createActivityLog('vehicle', {
  vehicleId: 'vehicle-uuid',
  action: 'DELETED',
  actionBy: 'John Doe',
  notes: 'Vehicle deleted by admin',
  metadata: { reason: 'End of service' },
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  device: 'Desktop',
  location: 'Office'
})

// Create user activity log
const logId = await createActivityLog('user', {
  userId: 'user-uuid',
  action: 'LOGIN',
  resource: 'auth',
  resourceId: 'login',
  metadata: { loginMethod: 'email' },
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  device: 'Desktop',
  location: 'Office'
})
```

## 🎣 React Hooks

### **Using the Hooks** (`src/hooks/useLogs.ts`)

#### 1. **Vehicle Logs Hook**
```tsx
import { useVehicleLogs } from '../hooks/useLogs'

function VehicleLogsComponent() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useVehicleLogs({
    page: 1,
    limit: 20,
    vehicleId: 'all',
    action: 'all',
    searchQuery: ''
  })

  const allLogs = data?.pages.flatMap(page => page.logs) || []
  
  return (
    <div>
      {allLogs.map(log => (
        <div key={log.id}>
          {log.action_type} - {log.action_by}
        </div>
      ))}
    </div>
  )
}
```

#### 2. **User Logs Hook**
```tsx
import { useUserLogs } from '../hooks/useLogs'

function UserLogsComponent() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useUserLogs({
    page: 1,
    limit: 20,
    userId: 'all',
    action: 'all',
    searchQuery: ''
  })

  const allLogs = data?.pages.flatMap(page => page.logs) || []
  
  return (
    <div>
      {allLogs.map(log => (
        <div key={log.id}>
          {log.action_type} - {log.action_by}
        </div>
      ))}
    </div>
  )
}
```

#### 3. **Analytics Hook**
```tsx
import { useActivityLogAnalytics } from '../hooks/useLogs'

function AnalyticsComponent() {
  const { data: analytics, isLoading } = useActivityLogAnalytics(
    new Date('2024-01-01'),
    new Date('2024-12-31')
  )

  if (isLoading) return <div>Loading analytics...</div>

  return (
    <div>
      <h3>Activity Analytics</h3>
      <p>Total Vehicle Logs: {analytics?.total_vehicle_logs}</p>
      <p>Total User Logs: {analytics?.total_user_logs}</p>
    </div>
  )
}
```

## 🔄 Integration Examples

### **1. Log Vehicle Deletion**
```typescript
import { createActivityLog } from '../utils/api/activityLogs'

async function deleteVehicle(vehicleId: string, vehicleRegistration: string, deletedBy: string) {
  try {
    // Your vehicle deletion logic here
    await deleteVehicleFromDatabase(vehicleId)
    
    // Log the activity
    await createActivityLog('vehicle', {
      vehicleId,
      action: 'DELETED',
      actionBy: deletedBy,
      notes: `Vehicle ${vehicleRegistration} deleted`,
      metadata: {
        vehicle_registration: vehicleRegistration,
        deletion_reason: 'User requested'
      }
    })
    
    console.log('Vehicle deleted and activity logged')
  } catch (error) {
    console.error('Failed to delete vehicle:', error)
  }
}
```

### **2. Log User Login**
```typescript
import { createActivityLog } from '../utils/api/activityLogs'

async function logUserLogin(userId: string, loginMethod: string = 'email') {
  try {
    await createActivityLog('user', {
      userId,
      action: 'LOGIN',
      resource: 'auth',
      resourceId: 'login',
      metadata: {
        login_method: loginMethod,
        session_start: new Date().toISOString()
      }
    })
    
    console.log('User login logged')
  } catch (error) {
    console.error('Failed to log user login:', error)
  }
}
```

### **3. Export Activity Logs**
```typescript
import { exportActivityLogs } from '../utils/api/activityLogs'

async function exportVehicleLogs() {
  try {
    const blob = await exportActivityLogs({
      type: 'vehicle',
      format: 'csv',
      filters: {
        page: 1,
        limit: 1000,
        action: 'all'
      },
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date()
      }
    })

    // Download the file
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vehicle-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    console.log('Export completed')
  } catch (error) {
    console.error('Export failed:', error)
  }
}
```

## 🎯 Performance Tips

### **1. Use Infinite Scroll**
```tsx
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

function LogsList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useVehicleLogs(filters)
  
  const lastElementRef = useInfiniteScroll({
    loading: isFetchingNextPage,
    hasMore: hasNextPage || false,
    onLoadMore: fetchNextPage
  })

  return (
    <div>
      {data?.pages.flatMap(page => page.logs).map((log, index) => (
        <div 
          key={log.id}
          ref={index === logs.length - 1 ? lastElementRef : null}
        >
          {log.action_type}
        </div>
      ))}
    </div>
  )
}
```

### **2. Use Debounced Search**
```tsx
import { useDebounce } from '../hooks/useDebounce'

function SearchableLogs() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 500)
  
  const { data } = useVehicleLogs({
    ...filters,
    searchQuery: debouncedSearch
  })

  return (
    <input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search logs..."
    />
  )
}
```

### **3. Optimize with React Query**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  )
}
```

## 🔒 Security Features

- **Row Level Security (RLS)**: All queries respect user permissions
- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Rate Limiting**: Built-in protection against excessive API calls

## 📊 Monitoring

### **Performance Monitoring**
```typescript
import { ActivityLogPerformanceMonitor } from '../utils/activityLogger'

const monitor = ActivityLogPerformanceMonitor.getInstance()

// Start timing
monitor.startTiming('fetch_logs')

// Perform operation
const logs = await fetchVehicleLogs(filters)

// End timing
const duration = monitor.endTiming('fetch_logs')
console.log(`Fetch took ${duration}ms`)
```

## 🚀 Ready to Use!

The Activity Log API is now fully implemented and ready for production use. All functions are optimized for performance and include comprehensive error handling. You can start integrating these functions into your Fleet Management System immediately!
