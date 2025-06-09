import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { AIAlert } from '../types';
import { getAIAlerts, processAlertAction } from '../utils/aiAnalytics';
import { getVehicle } from '../utils/storage';
import { AlertTriangle, CheckCircle, XCircle, Bell, Search } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import AlertActionModal from '../components/alerts/AlertActionModal';
import { format } from 'date-fns';

const AIAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    severity: 'all',
    status: 'pending'
  });
  const [actionModal, setActionModal] = useState<{
    type: 'accept' | 'deny' | 'ignore';
    alert: AIAlert;
  } | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const data = await getAIAlerts();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching AI alerts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, []);

  const handleAction = async (alert: AIAlert, action: 'accept' | 'deny' | 'ignore') => {
    setActionModal({ type: action, alert });
  };

  const handleActionSubmit = async (reason: string, duration?: 'week' | 'permanent') => {
    if (actionModal) {
      try {
        await processAlertAction(actionModal.alert.id, actionModal.type, reason, duration);
        // Refresh alerts
        const data = await getAIAlerts();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error processing alert action:', error);
      }
      setActionModal(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'accepted': return 'bg-success-100 text-success-700';
      case 'denied': return 'bg-error-100 text-error-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-error-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-warning-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filters.search && alert.affected_entity) {
      const vehicle = alert.affected_entity.type === 'vehicle' ? getVehicle(alert.affected_entity.id) : null;
      const searchTerm = filters.search.toLowerCase();
      const searchFields = [
        alert.title,
        alert.description,
        vehicle?.registration_number
      ].map(field => field?.toLowerCase());

      if (!searchFields.some(field => field?.includes(searchTerm))) {
        return false;
      }
    }

    if (filters.type !== 'all' && alert.alert_type !== filters.type) return false;
    if (filters.severity !== 'all' && alert.severity !== filters.severity) return false;
    if (filters.status !== 'all' && alert.status !== filters.status) return false;

    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Layout title="AI AVS Alerts" subtitle="Review and manage AI-generated alerts">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 text-gray-600">
            Loading alerts...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
        {/* Compact Filter Bar */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
          <Input
            placeholder="Search alerts..."
            icon={<Search className="h-4 w-4" />}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-64"
          />
          <Select
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'route_deviation', label: 'Route Deviation' },
              { value: 'fuel_anomaly', label: 'Fuel Anomaly' }
            ]}
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            className="w-36"
          />
          <Select
            options={[
              { value: 'all', label: 'All Severity' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' }
            ]}
            value={filters.severity}
            onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
            className="w-36"
          />
          <Select
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'denied', label: 'Denied' }
            ]}
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="w-36"
          />
        </div>

        {/* Alerts Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Alert</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Vehicle</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.isArray(filteredAlerts) && filteredAlerts.map(alert => {
                const vehicle = alert.affected_entity?.type === 'vehicle' ? getVehicle(alert.affected_entity.id) : null;
                return (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getSeverityIcon(alert.severity)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                      {alert.metadata?.deviation && (
                        <div className="text-xs text-gray-500">
                          Deviation: {alert.metadata.deviation.toFixed(1)}%
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-sm text-primary-600 font-medium">
                        {vehicle?.registration_number || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {format(new Date(alert.createdAt), 'dd MMM HH:mm')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      {alert.status === 'pending' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleAction(alert, 'accept')}
                            className="text-success-600 hover:text-success-700"
                            title="Accept"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAction(alert, 'deny')}
                            className="text-error-600 hover:text-error-700"
                            title="Deny"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(!Array.isArray(filteredAlerts) || filteredAlerts.length === 0) && (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No alerts match your current filters</p>
            </div>
          )}
        </div>
      </div>
      )}

      {actionModal && (
        <AlertActionModal
          type={actionModal.type}
          onSubmit={handleActionSubmit}
          onClose={() => setActionModal(null)}
        />
      )}
    </Layout>
  );
};

export default AIAlertsPage