# API Services Documentation

This directory contains the centralized API service layer that handles all external API calls with retry logic, caching, validation, and error recovery.

## Architecture Overview

```
┌─────────────────┐
│  Form Component │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Service    │ ◄─── Entry point for all API calls
└────────┬────────┘
         │
         ├──► Validation (Zod schemas)
         ├──► Caching (localStorage)
         ├──► Retry Logic (exponential backoff)
         ├──► Error Recovery (graceful degradation)
         └──► Circuit Breaker (failure protection)
```

## Core Components

### 1. API Service (`apiService.ts`)

Main service that handles all API calls with built-in retry logic.

```typescript
import { fetchDriverDetails, fetchVehicleDetails } from './services/apiService';

// Fetch driver details with automatic retry and caching
const result = await fetchDriverDetails('DL123456', '02-03-1992');

if (result.success) {
  console.log('Driver data:', result.data);
  console.log('From cache:', result.cached);
} else {
  console.error('Error:', result.error);
}
```

**Features:**
- Automatic retry with exponential backoff
- Response caching with configurable duration
- Request timeout handling
- Network error recovery

### 2. API Validation (`apiValidation.ts`)

Zod-based validation schemas for API responses.

```typescript
import { validateApiResponse, DriverApiResponseSchema } from './services/apiValidation';

// Validate API response
const validation = validateApiResponse(apiResponse, DriverApiResponseSchema);

if (validation.success) {
  // Type-safe data
  const driver = validation.data;
} else {
  console.error('Validation error:', validation.error);
}
```

**Features:**
- Runtime type validation
- Date format conversion utilities
- Safe parsing with defaults
- Comprehensive error messages

### 3. API Cache (`apiCache.ts`)

localStorage-based caching with encryption.

```typescript
import { setCacheEntry, getCacheEntry, clearAllCache } from './services/apiCache';

// Manual cache operations
setCacheEntry('my_key', data, 3600000); // Cache for 1 hour
const cached = getCacheEntry('my_key');
```

**Features:**
- Automatic expiration
- Simple encryption/obfuscation
- Cache statistics
- Cleanup utilities

### 4. Error Recovery (`apiErrorRecovery.ts`)

Graceful degradation strategies when APIs fail.

```typescript
import { handleApiError, CircuitBreaker } from './services/apiErrorRecovery';

// Handle errors with fallback strategies
const result = await handleApiError<DriverData>(error, {
  fallbackStrategy: 'cache', // or 'manual' or 'error'
  cacheKey: 'driver_dl123',
  showUserMessage: true
});

// Use circuit breaker pattern
const breaker = new CircuitBreaker(5, 60000);
const data = await breaker.execute(() => fetchData());
```

**Features:**
- Cache fallback
- Manual entry fallback
- Circuit breaker pattern
- User-friendly error messages

### 5. Field Mappings (`../config/fieldMappings.ts`)

Configurable mapping between API responses and application models.

```typescript
import { mapDriverApiToDriver } from '../config/fieldMappings';

// Map API response to Driver model
const driver = mapDriverApiToDriver(apiResponse, existingDriver);
```

**Features:**
- Flexible field mapping
- Data format conversion
- Existing data preservation
- Priority field handling

### 6. API Configuration (`../config/apiConfig.ts`)

Centralized configuration with environment variable fallbacks.

```typescript
import { getApiConfig, getApiHeaders } from '../config/apiConfig';

const config = getApiConfig();
const headers = getApiHeaders();

// Access configuration
console.log('Driver API:', config.driver.url);
console.log('Cache enabled:', config.cache.enabled);
```

**Features:**
- Environment-based configuration
- Graceful fallbacks
- Production/development detection
- Configuration validation

## Usage Examples

### Fetching Driver Details

```typescript
import { fetchDriverDetails } from './services/apiService';
import { mapDriverApiToDriver } from './config/fieldMappings';

async function loadDriver(licenseNumber: string, dob: string) {
  const result = await fetchDriverDetails(licenseNumber, dob);
  
  if (result.success) {
    const driver = mapDriverApiToDriver(result.data);
    return driver;
  } else {
    toast.error(result.error);
    return null;
  }
}
```

### Fetching Vehicle Details

```typescript
import { fetchVehicleDetails } from './services/apiService';
import { mapVehicleApiToVehicle } from './config/fieldMappings';

async function loadVehicle(registrationNumber: string) {
  const result = await fetchVehicleDetails(registrationNumber);
  
  if (result.success) {
    const vehicle = mapVehicleApiToVehicle(result.data);
    return vehicle;
  } else {
    toast.error(result.error);
    return null;
  }
}
```

### Force Refresh (Bypass Cache)

```typescript
import { forceRefreshDriverDetails } from './services/apiService';

// Bypass cache and force fresh API call
const result = await forceRefreshDriverDetails('DL123456', '02-03-1992');
```

### Monitor API Health

```typescript
import { useApiHealth } from '../hooks/useApiHealth';

function ApiHealthMonitor() {
  const { healthStatus, checkHealth } = useApiHealth(true);
  
  return (
    <div>
      <p>Driver API: {healthStatus.driver.status}</p>
      <p>Vehicle API: {healthStatus.vehicle.status}</p>
      <button onClick={checkHealth}>Check Health</button>
    </div>
  );
}
```

## Configuration

### Environment Variables

```env
# API Configuration
VITE_API_TIMEOUT=10000
VITE_API_RETRY_COUNT=3
VITE_CACHE_DURATION=86400000
VITE_ENABLE_API_CACHE=true
VITE_API_FALLBACK_MODE=cache

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Endpoints (optional overrides)
VITE_DL_PROXY_URL=https://custom-dl-api.com
VITE_RC_PROXY_URL=https://custom-rc-api.com
```

### Fallback Strategies

- **`cache`**: Use cached data when API fails (default)
- **`manual`**: Prompt user to enter data manually
- **`error`**: Show error and fail gracefully

## Error Handling

The service automatically handles common errors:

- **Network errors**: Retry with exponential backoff
- **Timeout errors**: Fallback to cache or manual entry
- **5xx server errors**: Retry up to configured limit
- **4xx client errors**: No retry, show user message
- **Authentication errors**: No retry, requires configuration fix

## Testing

Run tests with:

```bash
npm test src/services
npm test src/config
```

## Best Practices

1. **Always use the service layer** - Don't call APIs directly from components
2. **Handle both success and error cases** - Check `result.success` before using data
3. **Use type-safe responses** - Leverage Zod validation for runtime safety
4. **Monitor API health** - Use `useApiHealth` hook for status monitoring
5. **Clear cache when needed** - Use `forceRefresh*` functions for fresh data
6. **Test error scenarios** - Ensure your UI handles failures gracefully

## Migration from Direct API Calls

### Before:
```typescript
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ license_number, dob })
});
const data = await response.json();
```

### After:
```typescript
const result = await fetchDriverDetails(license_number, dob);
if (result.success) {
  const driver = mapDriverApiToDriver(result.data);
  // Use driver
}
```

## Troubleshooting

### Cache Issues

```typescript
import { clearAllCache, getCacheStats } from './services/apiCache';

// View cache statistics
console.log(getCacheStats());

// Clear all cache
clearAllCache();
```

### Circuit Breaker Reset

```typescript
import { driverApiCircuitBreaker } from './services/apiErrorRecovery';

// Check circuit breaker state
console.log(driverApiCircuitBreaker.getState());

// Reset if needed
driverApiCircuitBreaker.reset();
```

### Configuration Validation

```typescript
import { validateApiConfig } from '../config/apiConfig';

const validation = validateApiConfig();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

## Support

For issues or questions, contact the development team or refer to the main project documentation.

