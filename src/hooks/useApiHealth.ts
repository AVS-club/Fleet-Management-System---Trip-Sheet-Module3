/**
 * API Health Monitoring Hook
 * Monitors the health and availability of external APIs
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiConfig } from '../config/apiConfig';

export interface ApiHealthStatus {
  endpoint: string;
  status: 'online' | 'degraded' | 'offline' | 'unknown';
  lastChecked: number;
  responseTime?: number;
  error?: string;
}

export interface HealthCheckResult {
  driver: ApiHealthStatus;
  vehicle: ApiHealthStatus;
  challan: ApiHealthStatus;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

const HEALTH_CHECK_INTERVAL = 60000; // Check every 60 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout

/**
 * Perform health check on a single endpoint
 */
async function checkEndpointHealth(url: string): Promise<ApiHealthStatus> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ health_check: true }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Consider 2xx and 4xx as "online" (400 means endpoint exists but validation failed)
    const isOnline = response.status < 500;
    
    return {
      endpoint: url,
      status: isOnline ? (responseTime > 2000 ? 'degraded' : 'online') : 'offline',
      lastChecked: Date.now(),
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      endpoint: url,
      status: responseTime > HEALTH_CHECK_TIMEOUT ? 'offline' : 'degraded',
      lastChecked: Date.now(),
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Use API Health monitoring
 */
export function useApiHealth(enableAutoCheck = true) {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult>({
    driver: { endpoint: '', status: 'unknown', lastChecked: 0 },
    vehicle: { endpoint: '', status: 'unknown', lastChecked: 0 },
    challan: { endpoint: '', status: 'unknown', lastChecked: 0 },
    overall: 'healthy',
  });
  
  const [isChecking, setIsChecking] = useState(false);
  
  const checkHealth = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    const config = getApiConfig();
    
    try {
      // Check all endpoints in parallel
      const [driverHealth, vehicleHealth, challanHealth] = await Promise.all([
        checkEndpointHealth(config.driver.url),
        checkEndpointHealth(config.vehicle.url),
        checkEndpointHealth(config.challan.url),
      ]);
      
      // Determine overall health
      const statuses = [driverHealth.status, vehicleHealth.status, challanHealth.status];
      let overall: 'healthy' | 'degraded' | 'unhealthy';
      
      if (statuses.every(s => s === 'online')) {
        overall = 'healthy';
      } else if (statuses.some(s => s === 'offline')) {
        overall = 'unhealthy';
      } else {
        overall = 'degraded';
      }
      
      setHealthStatus({
        driver: driverHealth,
        vehicle: vehicleHealth,
        challan: challanHealth,
        overall,
      });
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);
  
  // Auto-check on mount and at intervals
  useEffect(() => {
    if (!enableAutoCheck) return;
    
    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [enableAutoCheck, checkHealth]);
  
  return {
    healthStatus,
    isChecking,
    checkHealth,
  };
}

/**
 * Get health status badge color
 */
export function getHealthBadgeColor(status: ApiHealthStatus['status']): string {
  switch (status) {
    case 'online':
      return 'green';
    case 'degraded':
      return 'yellow';
    case 'offline':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get health status message
 */
export function getHealthMessage(result: HealthCheckResult): string {
  if (result.overall === 'healthy') {
    return 'All systems operational';
  }
  
  const offline = Object.entries(result)
    .filter(([key, value]) => key !== 'overall' && value.status === 'offline')
    .map(([key]) => key);
  
  const degraded = Object.entries(result)
    .filter(([key, value]) => key !== 'overall' && value.status === 'degraded')
    .map(([key]) => key);
  
  if (offline.length > 0) {
    return `${offline.join(', ')} API${offline.length > 1 ? 's are' : ' is'} offline`;
  }
  
  if (degraded.length > 0) {
    return `${degraded.join(', ')} API${degraded.length > 1 ? 's are' : ' is'} experiencing delays`;
  }
  
  return 'System status unknown';
}

