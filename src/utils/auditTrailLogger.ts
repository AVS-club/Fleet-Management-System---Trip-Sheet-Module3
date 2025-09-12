import { supabase } from './supabaseClient';

export interface AuditTrailEntry {
  id?: string;
  operation_type: string;
  operation_category: 'trip_data' | 'vehicle_data' | 'driver_data' | 'fuel_data' | 'system_maintenance';
  entity_type: string;
  entity_id: string;
  entity_description?: string;
  action_performed: 'created' | 'updated' | 'deleted' | 'validated' | 'corrected' | 'flagged' | 'analyzed' | 'detected';
  performed_by?: string;
  performed_at?: string;
  user_type?: 'user' | 'system' | 'admin';
  changes_made?: any;
  validation_results?: any;
  severity_level?: 'info' | 'warning' | 'error' | 'critical';
  confidence_score?: number;
  tags?: string[];
  business_context?: string;
  data_quality_score?: number;
  operation_duration_ms?: number;
  performer_name?: string;
}

export interface AuditSearchFilters {
  operation_types?: string[];
  severity_levels?: string[];
  entity_types?: string[];
  start_date?: string;
  end_date?: string;
  search_text?: string;
  limit?: number;
  offset?: number;
}

export interface AuditTrailStats {
  total_operations: number;
  operations_by_type: Record<string, number>;
  operations_by_severity: Record<string, number>;
  recent_operations: AuditTrailEntry[];
  error_rate: number;
  avg_quality_score: number;
  avg_confidence_score: number;
  operations_today: number;
  operations_this_week: number;
}

export class AuditTrailLogger {
  
  /**
   * Log an audit trail entry with robust error handling and fallback for system operations
   */
  static async logOperation(
    operationType: string,
    operationCategory: 'trip_data' | 'vehicle_data' | 'driver_data' | 'fuel_data' | 'system_maintenance',
    entityType: string,
    entityId: string,
    actionPerformed: 'created' | 'updated' | 'deleted' | 'validated' | 'corrected' | 'flagged' | 'analyzed' | 'detected',
    options: {
      entityDescription?: string;
      changesMade?: any;
      validationResults?: any;
      severityLevel?: 'info' | 'warning' | 'error' | 'critical';
      confidenceScore?: number;
      tags?: string[];
      businessContext?: string;
      dataQualityScore?: number;
      operationDurationMs?: number;
      allowSystemFallback?: boolean; // Allow system operations without user authentication
    } = {}
  ): Promise<string | null> {
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Attempt to get current user - but don't fail if not authenticated for system operations
        let user = null;
        let userType = 'system';
        
        const { data: authData, error: userError } = await supabase.auth.getUser();
        
        if (authData?.user) {
          user = authData.user;
          userType = 'user';
        } else if (userError && !options.allowSystemFallback) {
          // Only fail if this is not a system operation
          console.error(`Attempt ${attempt}: User authentication required for audit logging:`, userError);
          lastError = userError;
          
          if (attempt === maxRetries) {
            // Final attempt - use fallback logging
            await this.fallbackLog(operationType, operationCategory, entityType, entityId, actionPerformed, options, userError);
            return null;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        // Call the database function to log the audit trail
        const { data, error } = await supabase.rpc('log_audit_trail', {
          p_operation_type: operationType,
          p_operation_category: operationCategory,
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_entity_description: options.entityDescription || null,
          p_action_performed: actionPerformed,
          p_changes_made: options.changesMade || null,
          p_validation_results: options.validationResults || null,
          p_severity_level: options.severityLevel || 'info',
          p_confidence_score: options.confidenceScore || null,
          p_tags: options.tags || [],
          p_business_context: options.businessContext || null,
          p_data_quality_score: options.dataQualityScore || null,
          p_operation_duration_ms: options.operationDurationMs || (Date.now() - startTime),
          p_user_type: userType
        });

        if (error) {
          console.error(`Attempt ${attempt}: Failed to log audit trail:`, error);
          lastError = error;
          
          if (attempt === maxRetries) {
            // Final attempt failed - use fallback logging
            await this.fallbackLog(operationType, operationCategory, entityType, entityId, actionPerformed, options, error);
            return null;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }

        // Success - log completion
        if (attempt > 1) {
          console.log(`Audit logging succeeded on attempt ${attempt} for ${operationType} on ${entityType} ${entityId}`);
        }

        return data;
      } catch (error) {
        console.error(`Attempt ${attempt}: Error logging audit trail:`, error);
        lastError = error;
        
        if (attempt === maxRetries) {
          // Final attempt failed - use fallback logging
          await this.fallbackLog(operationType, operationCategory, entityType, entityId, actionPerformed, options, error);
          return null;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return null;
  }

  /**
   * Fallback logging mechanism when main audit trail fails
   */
  private static async fallbackLog(
    operationType: string,
    operationCategory: string,
    entityType: string,
    entityId: string,
    actionPerformed: string,
    options: any,
    originalError: any
  ): Promise<void> {
    try {
      // Log to browser console with detailed information for debugging
      const fallbackEntry = {
        timestamp: new Date().toISOString(),
        operation_type: operationType,
        operation_category: operationCategory,
        entity_type: entityType,
        entity_id: entityId,
        action_performed: actionPerformed,
        severity_level: options.severityLevel || 'info',
        business_context: options.businessContext,
        changes_made: options.changesMade,
        validation_results: options.validationResults,
        tags: options.tags,
        confidence_score: options.confidenceScore,
        original_error: originalError?.message || 'Unknown error',
        fallback_reason: 'Primary audit logging failed - using fallback mechanism'
      };

      console.warn('AUDIT TRAIL FALLBACK:', JSON.stringify(fallbackEntry, null, 2));

      // For critical operations, also try to store in localStorage as backup
      if (options.severityLevel === 'critical' || options.severityLevel === 'error') {
        try {
          const existingFallbackLogs = JSON.parse(localStorage.getItem('audit_fallback_logs') || '[]');
          existingFallbackLogs.push(fallbackEntry);
          
          // Keep only last 100 fallback entries to prevent storage overflow
          if (existingFallbackLogs.length > 100) {
            existingFallbackLogs.splice(0, existingFallbackLogs.length - 100);
          }
          
          localStorage.setItem('audit_fallback_logs', JSON.stringify(existingFallbackLogs));
          console.log('Critical audit entry stored in localStorage fallback');
        } catch (storageError) {
          console.error('Failed to store fallback log in localStorage:', storageError);
        }
      }
    } catch (fallbackError) {
      console.error('Fallback logging mechanism also failed:', fallbackError);
    }
  }

  /**
   * Log a data correction operation with system fallback
   */
  static async logDataCorrection(
    entityType: string,
    entityId: string,
    beforeValues: any,
    afterValues: any,
    correctionReason: string,
    cascadeOperations: string[] = []
  ): Promise<string | null> {
    const changes = {
      before: beforeValues,
      after: afterValues,
      correction_reason: correctionReason,
      cascade_operations: cascadeOperations
    };

    return this.logOperation(
      'data_correction',
      'trip_data',
      entityType,
      entityId,
      'corrected',
      {
        entityDescription: `${entityType} ${entityId} data correction`,
        changesMade: changes,
        severityLevel: 'warning',
        businessContext: correctionReason,
        tags: ['data_correction', 'data_integrity', 'cascade_management'],
        allowSystemFallback: true // Critical data corrections should always be logged
      }
    );
  }

  /**
   * Log a validation check operation with system fallback
   */
  static async logValidationCheck(
    entityType: string,
    entityId: string,
    validationType: string,
    validationResults: any,
    issues: any[] = []
  ): Promise<string | null> {
    const severity = issues.length > 0 ? 
      (issues.some(i => i.severity === 'critical') ? 'critical' :
       issues.some(i => i.severity === 'error') ? 'error' : 'warning') : 'info';

    return this.logOperation(
      'validation_check',
      'trip_data',
      entityType,
      entityId,
      'validated',
      {
        entityDescription: `${validationType} validation for ${entityType} ${entityId}`,
        validationResults: {
          validation_type: validationType,
          passed: issues.length === 0,
          issues: issues,
          results: validationResults
        },
        severityLevel: severity,
        tags: ['validation', 'data_integrity', validationType],
        businessContext: `Validation check: ${issues.length} issues found`,
        allowSystemFallback: true // System validations should always be logged
      }
    );
  }

  /**
   * Log edge case detection with system fallback
   */
  static async logEdgeCaseDetection(
    caseType: string,
    entityId: string,
    patterns: string[],
    confidence: number,
    severity: 'info' | 'warning' | 'error' | 'critical',
    recommendations: string[]
  ): Promise<string | null> {
    return this.logOperation(
      'edge_case_detection',
      'trip_data',
      'trip',
      entityId,
      'detected',
      {
        entityDescription: `Edge case detected: ${caseType} for trip ${entityId}`,
        validationResults: {
          case_type: caseType,
          patterns_detected: patterns,
          recommendations: recommendations
        },
        severityLevel: severity,
        confidenceScore: confidence,
        tags: ['edge_case', 'anomaly_detection', caseType],
        businessContext: `Edge case detected: ${patterns.join(', ')}`,
        allowSystemFallback: true // Edge case detection is often automated
      }
    );
  }

  /**
   * Log fuel efficiency baseline operation with system fallback
   */
  static async logBaselineOperation(
    vehicleId: string,
    operationType: 'establish' | 'update' | 'analysis',
    baselineData: any,
    confidenceScore: number
  ): Promise<string | null> {
    return this.logOperation(
      'baseline_management',
      'fuel_data',
      'vehicle',
      vehicleId,
      operationType === 'establish' ? 'created' : 'updated',
      {
        entityDescription: `Fuel efficiency baseline ${operationType} for vehicle ${vehicleId}`,
        changesMade: baselineData,
        severityLevel: 'info',
        confidenceScore: confidenceScore,
        tags: ['fuel_efficiency', 'baseline_management', 'analytics'],
        businessContext: `Baseline ${operationType}: ${baselineData.baseline_kmpl}km/l`,
        allowSystemFallback: true // Baseline operations are often automated
      }
    );
  }

  /**
   * Log sequence monitoring operation
   */
  static async logSequenceMonitoring(
    vehicleId: string,
    issues: any[],
    analysis: any
  ): Promise<string | null> {
    const severity = issues.length > 0 ? 'warning' : 'info';
    
    return this.logOperation(
      'sequence_monitoring',
      'trip_data',
      'vehicle',
      vehicleId,
      'analyzed',
      {
        entityDescription: `Serial sequence monitoring for vehicle ${vehicleId}`,
        validationResults: {
          issues_found: issues.length,
          issues: issues,
          analysis: analysis
        },
        severityLevel: severity,
        tags: ['sequence_monitoring', 'data_integrity', 'serial_numbers'],
        businessContext: `Sequence analysis: ${issues.length} issues found`
      }
    );
  }

  /**
   * Log return trip validation
   */
  static async logReturnTripValidation(
    tripId: string,
    validationResults: any,
    issues: any[]
  ): Promise<string | null> {
    const severity = issues.length > 0 ? 'warning' : 'info';
    
    return this.logOperation(
      'return_trip_validation',
      'trip_data',
      'trip',
      tripId,
      'validated',
      {
        entityDescription: `Return trip validation for trip ${tripId}`,
        validationResults: {
          passed: issues.length === 0,
          issues: issues,
          validation_details: validationResults
        },
        severityLevel: severity,
        tags: ['return_trip', 'validation', 'consistency_check'],
        businessContext: `Return trip validation: ${issues.length > 0 ? 'Failed' : 'Passed'}`
      }
    );
  }

  /**
   * Get audit trail for a specific entity
   */
  static async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditTrailEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_entity_audit_trail', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_limit: limit
      });

      if (error) {
        console.error('Failed to get entity audit trail:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting entity audit trail:', error);
      return [];
    }
  }

  /**
   * Search audit trail with filters
   */
  static async searchAuditTrail(filters: AuditSearchFilters = {}): Promise<{
    entries: AuditTrailEntry[];
    total: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('search_audit_trail', {
        p_operation_types: filters.operation_types || null,
        p_severity_levels: filters.severity_levels || null,
        p_entity_types: filters.entity_types || null,
        p_start_date: filters.start_date || null,
        p_end_date: filters.end_date || null,
        p_search_text: filters.search_text || null,
        p_limit: filters.limit || 100,
        p_offset: filters.offset || 0
      });

      if (error) {
        console.error('Failed to search audit trail:', error);
        return { entries: [], total: 0 };
      }

      const entries = data || [];
      const total = entries.length > 0 ? entries[0].total_count : 0;

      return { entries, total };
    } catch (error) {
      console.error('Error searching audit trail:', error);
      return { entries: [], total: 0 };
    }
  }

  /**
   * Get audit trail statistics
   */
  static async getAuditTrailStats(): Promise<AuditTrailStats> {
    try {
      // Get basic statistics
      const { data: stats, error: statsError } = await supabase
        .from('audit_trail')
        .select('operation_type, severity_level, performed_at, data_quality_score, confidence_score, error_details')
        .order('performed_at', { ascending: false })
        .limit(1000);

      if (statsError) {
        console.error('Failed to get audit trail stats:', statsError);
        return this.getEmptyStats();
      }

      // Get recent operations
      const { data: recent, error: recentError } = await supabase
        .from('audit_trail')
        .select(`
          id, operation_type, operation_category, entity_type, entity_id, 
          entity_description, action_performed, performed_at, severity_level,
          confidence_score, business_context
        `)
        .order('performed_at', { ascending: false })
        .limit(20);

      if (recentError) {
        console.error('Failed to get recent operations:', recentError);
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Calculate statistics
      const totalOperations = stats?.length || 0;
      const operationsByType: Record<string, number> = {};
      const operationsBySeverity: Record<string, number> = {};
      let errorCount = 0;
      let qualityScoreSum = 0;
      let qualityScoreCount = 0;
      let confidenceScoreSum = 0;
      let confidenceScoreCount = 0;
      let operationsToday = 0;
      let operationsThisWeek = 0;

      stats?.forEach((entry: any) => {
        // Count by type
        operationsByType[entry.operation_type] = (operationsByType[entry.operation_type] || 0) + 1;
        
        // Count by severity
        operationsBySeverity[entry.severity_level] = (operationsBySeverity[entry.severity_level] || 0) + 1;
        
        // Count errors
        if (entry.error_details) {
          errorCount++;
        }
        
        // Quality scores
        if (entry.data_quality_score) {
          qualityScoreSum += entry.data_quality_score;
          qualityScoreCount++;
        }
        
        // Confidence scores
        if (entry.confidence_score) {
          confidenceScoreSum += entry.confidence_score;
          confidenceScoreCount++;
        }
        
        // Time-based counts
        const entryDate = new Date(entry.performed_at);
        if (entryDate >= todayStart) {
          operationsToday++;
        }
        if (entryDate >= weekStart) {
          operationsThisWeek++;
        }
      });

      return {
        total_operations: totalOperations,
        operations_by_type: operationsByType,
        operations_by_severity: operationsBySeverity,
        recent_operations: recent || [],
        error_rate: totalOperations > 0 ? (errorCount / totalOperations) * 100 : 0,
        avg_quality_score: qualityScoreCount > 0 ? qualityScoreSum / qualityScoreCount : 0,
        avg_confidence_score: confidenceScoreCount > 0 ? confidenceScoreSum / confidenceScoreCount : 0,
        operations_today: operationsToday,
        operations_this_week: operationsThisWeek
      };
    } catch (error) {
      console.error('Error getting audit trail stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get empty stats structure
   */
  private static getEmptyStats(): AuditTrailStats {
    return {
      total_operations: 0,
      operations_by_type: {},
      operations_by_severity: {},
      recent_operations: [],
      error_rate: 0,
      avg_quality_score: 0,
      avg_confidence_score: 0,
      operations_today: 0,
      operations_this_week: 0
    };
  }

  /**
   * Get audit trail summary for dashboard
   */
  static async getAuditSummary(days: number = 30): Promise<{
    daily_counts: Array<{ date: string; count: number; }>;
    operation_breakdown: Record<string, number>;
    severity_breakdown: Record<string, number>;
    top_entities: Array<{ entity_type: string; entity_id: string; operation_count: number; }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('audit_trail')
        .select('operation_type, severity_level, entity_type, entity_id, performed_at')
        .gte('performed_at', startDate.toISOString());

      if (error) {
        console.error('Failed to get audit summary:', error);
        return {
          daily_counts: [],
          operation_breakdown: {},
          severity_breakdown: {},
          top_entities: []
        };
      }

      // Process daily counts
      const dailyCounts: Record<string, number> = {};
      const operationBreakdown: Record<string, number> = {};
      const severityBreakdown: Record<string, number> = {};
      const entityCounts: Record<string, number> = {};

      data?.forEach((entry: any) => {
        const date = new Date(entry.performed_at).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        
        operationBreakdown[entry.operation_type] = (operationBreakdown[entry.operation_type] || 0) + 1;
        severityBreakdown[entry.severity_level] = (severityBreakdown[entry.severity_level] || 0) + 1;
        
        const entityKey = `${entry.entity_type}:${entry.entity_id}`;
        entityCounts[entityKey] = (entityCounts[entityKey] || 0) + 1;
      });

      // Convert to arrays
      const dailyCountsArray = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
      const topEntities = Object.entries(entityCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([key, count]) => {
          const [entity_type, entity_id] = key.split(':');
          return { entity_type, entity_id, operation_count: count };
        });

      return {
        daily_counts: dailyCountsArray,
        operation_breakdown: operationBreakdown,
        severity_breakdown: severityBreakdown,
        top_entities: topEntities
      };
    } catch (error) {
      console.error('Error getting audit summary:', error);
      return {
        daily_counts: [],
        operation_breakdown: {},
        severity_breakdown: {},
        top_entities: []
      };
    }
  }
}