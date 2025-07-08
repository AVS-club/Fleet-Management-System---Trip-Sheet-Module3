import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getAlertSettings, updateAlertSettings, AlertSettings as AlertSettingsType } from '../../utils/alertSettings';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { toast } from 'react-toastify';

const frequencyOptions = [
  { value: 'always', label: 'Always Show' },
  { value: 'once_per_session', label: 'Once Per Session' },
  { value: 'daily', label: 'Once Per Day' },
  { value: 'never', label: 'Never Show' }
];

const AlertSettings: React.FC = () => {
  const [settings, setSettings] = useState<AlertSettingsType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await getAlertSettings();
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading alert settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (
    key: keyof AlertSettingsType,
    value: AlertSettingsType[keyof AlertSettingsType]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateAlertSettings(settings);
      toast.success('Alert settings saved successfully');
    } catch (error) {
      console.error('Error saving alert settings:', error);
      toast.error('Failed to save alert settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-4 text-center">Loading settings...</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Alert Settings</h3>
          <p className="text-sm text-gray-500">Configure how you want to receive alerts</p>
        </div>
        <div className="flex items-center">
          <Bell className="h-5 w-5 text-primary-600" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-medium text-gray-700">Notification Popup Frequency</label>
          <Select
            options={frequencyOptions}
            value={settings.popup_display_frequency || 'always'}
            onChange={(e) => handleChange('popup_display_frequency', e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Controls how often notification popups appear when you open the dashboard
          </p>
        </div>

        <Select
          label="Display Type"
          options={[
            { value: 'all', label: 'All Alerts' },
            { value: 'critical', label: 'Critical Only' }
          ]}
          value={settings.display_type}
          onChange={(e) => handleChange('display_type', e.target.value)}
        />

        <Select
          label="Group Alerts By"
          options={[
            { value: 'none', label: 'No Grouping' },
            { value: 'vehicle', label: 'Vehicle' },
            { value: 'type', label: 'Alert Type' }
          ]}
          value={settings.group_by}
          onChange={(e) => handleChange('group_by', e.target.value)}
        />

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Alert Types</h4>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="route_deviation"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.enabled_types.includes('route_deviation')}
                onChange={(e) => {
                  const types = e.target.checked
                    ? [...settings.enabled_types, 'route_deviation']
                    : settings.enabled_types.filter(t => t !== 'route_deviation');
                  handleChange('enabled_types', types);
                }}
              />
              <label htmlFor="route_deviation" className="ml-2 text-sm text-gray-700">
                Route Deviations
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenance"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.enabled_types.includes('maintenance')}
                onChange={(e) => {
                  const types = e.target.checked
                    ? [...settings.enabled_types, 'maintenance']
                    : settings.enabled_types.filter(t => t !== 'maintenance');
                  handleChange('enabled_types', types);
                }}
              />
              <label htmlFor="maintenance" className="ml-2 text-sm text-gray-700">
                Maintenance Alerts
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="documentation"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.enabled_types.includes('documentation')}
                onChange={(e) => {
                  const types = e.target.checked
                    ? [...settings.enabled_types, 'documentation']
                    : settings.enabled_types.filter(t => t !== 'documentation');
                  handleChange('enabled_types', types);
                }}
              />
              <label htmlFor="documentation" className="ml-2 text-sm text-gray-700">
                Documentation Issues
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="fuel_anomaly"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.enabled_types.includes('fuel_anomaly')}
                onChange={(e) => {
                  const types = e.target.checked
                    ? [...settings.enabled_types, 'fuel_anomaly']
                    : settings.enabled_types.filter(t => t !== 'fuel_anomaly');
                  handleChange('enabled_types', types);
                }}
              />
              <label htmlFor="fuel_anomaly" className="ml-2 text-sm text-gray-700">
                Fuel Anomalies
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            isLoading={saving}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertSettings;