import React, { useState, useEffect, useCallback } from 'react';
import { AuditTrailLogger, AuditTrailEntry, AuditSearchFilters, AuditTrailStats } from '../../utils/auditTrailLogger';
import { 
  User, AlertTriangle, Info, CheckCircle, XCircle, Filter, 
  Download, BarChart3, Activity, Shield, Eye, RefreshCw, 
  FileText, Settings, TrendingUp, AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface AuditTrailDashboardProps {
  className?: string;
}

const AuditTrailDashboard: React.FC<AuditTrailDashboardProps> = ({ className = '' }) => {
  const [auditStats, setAuditStats] = useState<AuditTrailStats | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<AuditSearchFilters>({
    limit: 50,
    offset: 0
  });
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  useEffect(() => {
    searchAuditTrail();
  }, [searchAuditTrail]);

  const loadAuditData = useCallback(async () => {
    try {
      const stats = await AuditTrailLogger.getAuditTrailStats();
      setAuditStats(stats);
    } catch (error) {
      console.error('Error loading audit stats:', error);
      toast.error('Failed to load audit trail statistics');
    }
  }, []);

  const searchAuditTrail = useCallback(async () => {
    setLoading(true);
    try {
      const { entries, total } = await AuditTrailLogger.searchAuditTrail(searchFilters);
      setAuditEntries(entries);
      setTotalEntries(total);
    } catch (error) {
      console.error('Error searching audit trail:', error);
      toast.error('Failed to search audit trail');
    } finally {
      setLoading(false);
    }
  }, [searchFilters]);

  const handleFilterChange = (field: keyof AuditSearchFilters, value: any) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value,
      offset: 0 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newOffset: number) => {
    setSearchFilters(prev => ({
      ...prev,
      offset: newOffset
    }));
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'data_correction': return <Settings className="h-4 w-4" />;
      case 'validation_check': return <CheckCircle className="h-4 w-4" />;
      case 'edge_case_detection': return <AlertTriangle className="h-4 w-4" />;
      case 'baseline_management': return <TrendingUp className="h-4 w-4" />;
      case 'sequence_monitoring': return <BarChart3 className="h-4 w-4" />;
      case 'return_trip_validation': return <Activity className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatOperationType = (operationType: string) => {
    return operationType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportAuditTrail = async () => {
    try {
      const { entries } = await AuditTrailLogger.searchAuditTrail({
        ...searchFilters,
        limit: 10000 // Large limit for export
      });
      
      const csvContent = generateCSV(entries);
      downloadCSV(csvContent, `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Audit trail exported successfully');
    } catch (error) {
      toast.error('Failed to export audit trail');
    }
  };

  const generateCSV = (entries: AuditTrailEntry[]) => {
    const headers = [
      'Date', 'Operation Type', 'Entity Type', 'Entity ID', 'Action', 
      'Performed By', 'Severity', 'Confidence Score', 'Business Context'
    ];
    
    const rows = entries.map(entry => [
      entry.performed_at ? formatDate(entry.performed_at) : '',
      entry.operation_type,
      entry.entity_type,
      entry.entity_id,
      entry.action_performed,
      entry.performer_name || 'System',
      entry.severity_level || 'info',
      entry.confidence_score?.toString() || '',
      entry.business_context || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !auditEntries.length) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span>Loading audit trail...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Audit Trail</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comprehensive tracking of all data integrity operations and system changes
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded ${showFilters ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-100'} hover:bg-blue-700`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={exportAuditTrail}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => { loadAuditData(); searchAuditTrail(); }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {auditStats && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{auditStats.total_operations}</div>
              <div className="text-sm text-gray-600">Total Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{auditStats.operations_today}</div>
              <div className="text-sm text-gray-600">Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{auditStats.operations_this_week}</div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{auditStats.error_rate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{auditStats.avg_quality_score.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Avg Quality</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{auditStats.avg_confidence_score.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
          </div>

          {/* Operation Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {Object.entries(auditStats.operations_by_type).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center">
                  {getOperationIcon(type)}
                  <span className="ml-2 font-medium">{formatOperationType(type)}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>

          {/* Severity Breakdown */}
          <div className="grid grid-cols-4 gap-4">
            {['critical', 'error', 'warning', 'info'].map(severity => (
              <div key={severity} className={`flex items-center justify-between p-3 rounded border ${getSeverityColor(severity)}`}>
                <div className="flex items-center">
                  {getSeverityIcon(severity)}
                  <span className="ml-2 font-medium capitalize">{severity}</span>
                </div>
                <span className="text-lg font-bold">{auditStats.operations_by_severity[severity] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operation Type</label>
              <select
                value={searchFilters.operation_types?.[0] || ''}
                onChange={(e) => handleFilterChange('operation_types', e.target.value ? [e.target.value] : undefined)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Operations</option>
                <option value="data_correction">Data Correction</option>
                <option value="validation_check">Validation Check</option>
                <option value="edge_case_detection">Edge Case Detection</option>
                <option value="baseline_management">Baseline Management</option>
                <option value="sequence_monitoring">Sequence Monitoring</option>
                <option value="return_trip_validation">Return Trip Validation</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={searchFilters.severity_levels?.[0] || ''}
                onChange={(e) => handleFilterChange('severity_levels', e.target.value ? [e.target.value] : undefined)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={searchFilters.entity_types?.[0] || ''}
                onChange={(e) => handleFilterChange('entity_types', e.target.value ? [e.target.value] : undefined)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Entities</option>
                <option value="trip">Trip</option>
                <option value="vehicle">Vehicle</option>
                <option value="driver">Driver</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Text</label>
              <input
                type="text"
                value={searchFilters.search_text || ''}
                onChange={(e) => handleFilterChange('search_text', e.target.value || undefined)}
                placeholder="Search descriptions..."
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* Audit Entries */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Audit Entries ({totalEntries} total)
          </h3>
          <div className="text-sm text-gray-500">
            Showing {searchFilters.offset! + 1}-{Math.min(searchFilters.offset! + (searchFilters.limit || 50), totalEntries)} of {totalEntries}
          </div>
        </div>

        {auditEntries.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No audit entries found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditEntries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {getOperationIcon(entry.operation_type)}
                      <span className="ml-2">{formatOperationType(entry.operation_type)}</span>
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(entry.severity_level || 'info')}`}>
                      {getSeverityIcon(entry.severity_level || 'info')}
                      <span className="ml-1">{(entry.severity_level || 'info').toUpperCase()}</span>
                    </span>
                    {entry.confidence_score && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {entry.confidence_score}% confidence
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.performed_at ? formatDate(entry.performed_at) : ''}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900">
                      {entry.entity_description || `${entry.entity_type} ${entry.entity_id}`}
                    </h4>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-3 w-3 mr-1" />
                      {entry.performer_name || 'System'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Action: {entry.action_performed}</span>
                    <span>Entity: {entry.entity_type}</span>
                    <span>ID: {entry.entity_id}</span>
                  </div>
                </div>

                {entry.business_context && (
                  <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                    <span className="font-medium text-blue-800">Context: </span>
                    <span className="text-blue-700">{entry.business_context}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex space-x-4 text-xs text-gray-500">
                    <span>Category: {entry.operation_category}</span>
                    {entry.data_quality_score && <span>Quality: {entry.data_quality_score}</span>}
                    {entry.operation_duration_ms && <span>Duration: {entry.operation_duration_ms}ms</span>}
                  </div>
                  <button
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="h-4 w-4 inline mr-1" />
                    {selectedEntry?.id === entry.id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>

                {selectedEntry?.id === entry.id && (
                  <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 px-4 -mb-4 pb-4 rounded-b-lg">
                    {entry.changes_made && (
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900 mb-2">Changes Made:</h5>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(entry.changes_made, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {entry.validation_results && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Validation Results:</h5>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(entry.validation_results, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalEntries > (searchFilters.limit || 50) && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => handlePageChange(Math.max(0, searchFilters.offset! - (searchFilters.limit || 50)))}
              disabled={searchFilters.offset === 0}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-200"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {Math.floor(searchFilters.offset! / (searchFilters.limit || 50)) + 1} of{' '}
              {Math.ceil(totalEntries / (searchFilters.limit || 50))}
            </span>
            <button
              onClick={() => handlePageChange(searchFilters.offset! + (searchFilters.limit || 50))}
              disabled={searchFilters.offset! + (searchFilters.limit || 50) >= totalEntries}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrailDashboard;
