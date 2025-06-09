import { LogEntry } from './utils/logger';

export interface DiagnosisResult {
  summary: string;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    recommendation?: string;
  }>;
  recommendations: string[];
}

export default async function diagnoseBug(logs: LogEntry[], state: Record<string, any>): Promise<DiagnosisResult> {
  // Analyze logs for patterns and issues
  const errors = logs.filter(log => log.level === 'error');
  const warnings = logs.filter(log => log.level === 'warn');
  const recentLogs = logs.slice(0, 50);

  // Analyze state for potential issues
  const stateIssues = analyzeState(state);

  // Build diagnosis result
  const result: DiagnosisResult = {
    summary: generateSummary(errors, warnings, recentLogs),
    issues: [
      ...errors.map(error => ({
        type: 'error' as const,
        message: error.message,
        recommendation: generateRecommendation(error)
      })),
      ...warnings.map(warning => ({
        type: 'warning' as const,
        message: warning.message,
        recommendation: generateRecommendation(warning)
      })),
      ...stateIssues
    ],
    recommendations: generateRecommendations(errors, warnings, stateIssues)
  };

  return result;
}

function analyzeState(state: Record<string, any>): Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  recommendation?: string;
}> {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    recommendation?: string;
  }> = [];

  // Check for undefined or null values in state
  Object.entries(state).forEach(([key, value]) => {
    if (value === undefined) {
      issues.push({
        type: 'warning',
        message: `State key "${key}" is undefined`,
        recommendation: `Initialize "${key}" with a default value`
      });
    }
    if (value === null) {
      issues.push({
        type: 'info',
        message: `State key "${key}" is null`,
        recommendation: `Consider using a more specific default value for "${key}"`
      });
    }
  });

  return issues;
}

function generateSummary(errors: LogEntry[], warnings: LogEntry[], recentLogs: LogEntry[]): string {
  const summary = [];

  if (errors.length > 0) {
    summary.push(`Found ${errors.length} error(s) in the logs.`);
  }

  if (warnings.length > 0) {
    summary.push(`Found ${warnings.length} warning(s) in the logs.`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    summary.push('No critical issues found in the logs.');
  }

  summary.push(`Analyzed ${recentLogs.length} recent log entries.`);

  return summary.join(' ');
}

function generateRecommendation(log: LogEntry): string {
  // Add specific recommendations based on common error patterns
  if (log.message.includes('undefined')) {
    return 'Check for undefined variables and add proper initialization';
  }
  if (log.message.includes('null')) {
    return 'Ensure proper null checks are in place';
  }
  if (log.message.includes('network')) {
    return 'Verify network connectivity and API endpoint configuration';
  }
  return 'Review the error context and add appropriate error handling';
}

function generateRecommendations(
  errors: LogEntry[],
  warnings: LogEntry[],
  stateIssues: Array<{ type: string; message: string; recommendation?: string }>
): string[] {
  const recommendations = new Set<string>();

  // Add recommendations from errors
  errors.forEach(error => {
    const recommendation = generateRecommendation(error);
    if (recommendation) {
      recommendations.add(recommendation);
    }
  });

  // Add recommendations from warnings
  warnings.forEach(warning => {
    const recommendation = generateRecommendation(warning);
    if (recommendation) {
      recommendations.add(recommendation);
    }
  });

  // Add recommendations from state issues
  stateIssues.forEach(issue => {
    if (issue.recommendation) {
      recommendations.add(issue.recommendation);
    }
  });

  return Array.from(recommendations);
}