/**
 * Maintenance Audit Logger
 * Tracks all maintenance operations for security and compliance
 */

import { supabase } from './supabaseClient';
import { getCurrentUserId, getUserActiveOrganization } from './supaHelpers';
import { createLogger } from './logger';

const logger = createLogger('maintenanceAudit');

export type AuditAction = 
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'VIEW_TASK'
  | 'CREATE_VENDOR'
  | 'UPDATE_VENDOR'
  | 'DELETE_VENDOR'
  | 'CREATE_SERVICE_GROUP'
  | 'UPDATE_SERVICE_GROUP'
  | 'DELETE_SERVICE_GROUP'
  | 'UPLOAD_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'UPDATE_PART'
  | 'COMPLETE_TASK'
  | 'REOPEN_TASK'
  | 'EXPORT_DATA';

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  entity_type: 'maintenance_task' | 'vendor' | 'service_group' | 'part' | 'document';
  entity_id: string;
  user_id: string;
  organization_id: string;
  details?: Record<string, any>;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  action: AuditAction,
  entityType: AuditLogEntry['entity_type'],
  entityId: string,
  details?: Record<string, any>,
  changes?: AuditLogEntry['changes'],
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      logger.warn('No user ID for audit log');
      return;
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      logger.warn('No organization ID for audit log');
      return;
    }

    const auditEntry: AuditLogEntry = {
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      organization_id: organizationId,
      details,
      changes,
      ip_address: await getClientIpAddress(),
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      success,
      error_message: errorMessage
    };

    // Store in database
    const { error } = await supabase
      .from('maintenance_audit_logs')
      .insert(auditEntry);

    if (error) {
      logger.error('Failed to write audit log to database:', error);
      // Fall back to local storage
      storeAuditLogLocally(auditEntry);
    } else {
      logger.debug(`Audit log written: ${action} on ${entityType} ${entityId}`);
    }

    // For critical actions, also send to monitoring service
    if (isCriticalAction(action)) {
      sendToMonitoringService(auditEntry);
    }
  } catch (error) {
    logger.error('Error in audit logging:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Store audit log locally as fallback
 */
function storeAuditLogLocally(entry: AuditLogEntry): void {
  try {
    const localAuditLogs = JSON.parse(localStorage.getItem('maintenance_audit_logs') || '[]');
    localAuditLogs.push(entry);
    
    // Keep only last 100 entries
    if (localAuditLogs.length > 100) {
      localAuditLogs.shift();
    }
    
    localStorage.setItem('maintenance_audit_logs', JSON.stringify(localAuditLogs));
    logger.debug('Audit log stored locally');
  } catch (error) {
    logger.error('Failed to store audit log locally:', error);
  }
}

/**
 * Sync local audit logs to database
 */
export async function syncLocalAuditLogs(): Promise<void> {
  try {
    const localAuditLogs = JSON.parse(localStorage.getItem('maintenance_audit_logs') || '[]');
    
    if (localAuditLogs.length === 0) {
      return;
    }

    logger.info(`Syncing ${localAuditLogs.length} local audit logs`);

    for (const entry of localAuditLogs) {
      const { error } = await supabase
        .from('maintenance_audit_logs')
        .insert(entry);
      
      if (error) {
        logger.error('Failed to sync audit log entry:', error);
        break; // Stop syncing on first error
      }
    }

    // Clear local logs after successful sync
    localStorage.removeItem('maintenance_audit_logs');
    logger.info('Local audit logs synced successfully');
  } catch (error) {
    logger.error('Error syncing local audit logs:', error);
  }
}

/**
 * Get client IP address (best effort)
 */
async function getClientIpAddress(): Promise<string | undefined> {
  try {
    // Try to get IP from a public API
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(1000) // 1 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch {
    // Ignore errors - IP is optional
  }
  
  return undefined;
}

/**
 * Check if action is critical and needs immediate monitoring
 */
function isCriticalAction(action: AuditAction): boolean {
  const criticalActions: AuditAction[] = [
    'DELETE_TASK',
    'DELETE_VENDOR',
    'DELETE_DOCUMENT',
    'EXPORT_DATA'
  ];
  
  return criticalActions.includes(action);
}

/**
 * Send critical audit events to monitoring service
 */
function sendToMonitoringService(entry: AuditLogEntry): void {
  // This would integrate with your monitoring service (Sentry, DataDog, etc.)
  // For now, just log it
  logger.warn('Critical audit event:', {
    action: entry.action,
    entity: `${entry.entity_type}:${entry.entity_id}`,
    user: entry.user_id,
    timestamp: entry.timestamp
  });
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(
  filters: {
    action?: AuditAction;
    entityType?: AuditLogEntry['entity_type'];
    entityId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<AuditLogEntry[]> {
  try {
    const organizationId = await getUserActiveOrganization(await getCurrentUserId() || '');
    if (!organizationId) {
      return [];
    }

    let query = supabase
      .from('maintenance_audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }
    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error querying audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in queryAuditLogs:', error);
    return [];
  }
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: AuditLogEntry['entity_type'],
  entityId: string
): Promise<AuditLogEntry[]> {
  return queryAuditLogs({
    entityType,
    entityId,
    limit: 50
  });
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalActions: number;
  actionBreakdown: Record<AuditAction, number>;
  recentActions: AuditLogEntry[];
}> {
  const logs = await queryAuditLogs({
    userId,
    startDate,
    endDate,
    limit: 500
  });

  const actionBreakdown: Record<string, number> = {};
  
  logs.forEach(log => {
    actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
  });

  return {
    totalActions: logs.length,
    actionBreakdown: actionBreakdown as Record<AuditAction, number>,
    recentActions: logs.slice(0, 10)
  };
}

/**
 * Export audit logs
 */
export async function exportAuditLogs(
  filters: Parameters<typeof queryAuditLogs>[0] = {}
): Promise<Blob> {
  const logs = await queryAuditLogs({ ...filters, limit: 10000 });
  
  // Convert to CSV
  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'User ID',
    'Success',
    'Error Message',
    'Details'
  ];
  
  const rows = logs.map(log => [
    log.timestamp,
    log.action,
    log.entity_type,
    log.entity_id,
    log.user_id,
    log.success ? 'Yes' : 'No',
    log.error_message || '',
    JSON.stringify(log.details || {})
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Log the export action
  await logAuditEvent(
    'EXPORT_DATA',
    'maintenance_task',
    'audit_logs',
    { 
      filters, 
      rowCount: logs.length 
    }
  );
  
  return new Blob([csv], { type: 'text/csv' });
}
