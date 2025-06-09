import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { getAlertSettings, updateAlertSettings, AlertSettings as AlertSettingsType } from '../../utils/alertSettings';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';

const AlertSettings: React.FC = () => {
  const [settings, setSettings] = useState<AlertSettingsType>({
    auto_popup: true,
    display_type: 'all',
    group_by: 'none',
    enabled_types: ['route_deviation', 'maintenance', 'documentation', 'fuel_anomaly']
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await getAlertSettings();
        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (error) {
        console.error('Error loading alert settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = async (key: keyof AlertSettingsType, value: any) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    try {
      await updateAlertSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating alert settings:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Alert Settings</h3>
          <p className="text-sm text-gray-500">Configure how you want to receive alerts</p>
        </div>
        <div className="flex items-center">
          {settings.auto_popup ? (
            <Bell className="h-5 w-5 text-primary-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Checkbox
          label="Show alerts automatically"
          checked={settings.auto_popup}
          onChange={(e) => handleSettingChange('auto_popup', e.target.checked)}
          helperText="Alerts will pop up when you open the dashboard"
        />

        <Select
          label="Display Type"
          options={[
            { value: 'all', label: 'All Alerts' },
            { value: 'critical', label: 'Critical Only' }
          ]}
          value={settings.display_type}
          onChange={(e) => handleSettingChange('display_type', e.target.value)}
        />

        <Select
          label="Group Alerts By"
          options={[
            { value: 'none', label: 'No Grouping' },
            { value: 'vehicle', label: 'Vehicle' },
            { value: 'type', label: 'Alert Type' }
          ]}
          value={settings.group_by}
          onChange={(e) => handleSettingChange('group_by', e.target.value)}
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Alert Types</h4>
        <div className="space-y-2">
          <Checkbox
            label="Route Deviations"
            checked={Array.isArray(settings.enabled_types) && settings.enabled_types.includes('route_deviation')}
            onChange={(e) => {
              const types = e.target.checked
                ? [...(Array.isArray(settings.enabled_types) ? settings.enabled_types : []), 'route_deviation']
                : (Array.isArray(settings.enabled_types) ? settings.enabled_types.filter(t => t !== 'route_deviation') : []);
              handleSettingChange('enabled_types', types);
            }}
          />
          <Checkbox
            label="Maintenance Alerts"
            checked={Array.isArray(settings.enabled_types) && settings.enabled_types.includes('maintenance')}
            onChange={(e) => {
              const types = e.target.checked
                ? [...(Array.isArray(settings.enabled_types) ? settings.enabled_types : []), 'maintenance']
                : (Array.isArray(settings.enabled_types) ? settings.enabled_types.filter(t => t !== 'maintenance') : []);
              handleSettingChange('enabled_types', types);
            }}
          />
          <Checkbox
            label="Documentation Issues"
            checked={Array.isArray(settings.enabled_types) && settings.enabled_types.includes('documentation')}
            onChange={(e) => {
              const types = e.target.checked
                ? [...(Array.isArray(settings.enabled_types) ? settings.enabled_types : []), 'documentation']
                : (Array.isArray(settings.enabled_types) ? settings.enabled_types.filter(t => t !== 'documentation') : []);
              handleSettingChange('enabled_types', types);
            }}
          />
          <Checkbox
            label="Fuel Anomalies"
            checked={Array.isArray(settings.enabled_types) && settings.enabled_types.includes('fuel_anomaly')}
            onChange={(e) => {
              const types = e.target.checked
                ? [...(Array.isArray(settings.enabled_types) ? settings.enabled_types : []), 'fuel_anomaly']
                : (Array.isArray(settings.enabled_types) ? settings.enabled_types.filter(t => t !== 'fuel_anomaly') : []);
              handleSettingChange('enabled_types', types);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AlertSettings;