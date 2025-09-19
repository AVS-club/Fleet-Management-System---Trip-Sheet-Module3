import React, { useState, useEffect } from "react";
import { AlertThreshold, AlertThresholdConfig } from "@/utils/alertThresholds";
import { getAlertThresholds, upsertAlertThreshold, resetAlertThresholdsToDefault } from "@/utils/alertThresholds";
import { Settings, Save, RotateCcw, Bell, BellOff } from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Switch from "../ui/Switch";
import { toast } from "react-hot-toast";

const AlertThresholdsManager: React.FC = () => {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load thresholds on component mount
  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      setLoading(true);
      const data = await getAlertThresholds();
      setThresholds(data);
    } catch (error) {
      console.error("Error loading alert thresholds:", error);
      toast.error("Failed to load alert thresholds");
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (
    index: number,
    field: keyof AlertThreshold,
    value: any
  ) => {
    const updatedThresholds = [...thresholds];
    updatedThresholds[index] = {
      ...updatedThresholds[index],
      [field]: value,
    };
    setThresholds(updatedThresholds);
  };

  const handleSaveThresholds = async () => {
    try {
      setSaving(true);
      
      for (const threshold of thresholds) {
        const config: AlertThresholdConfig = {
          alert_type: threshold.alert_type,
          entity_type: threshold.entity_type,
          threshold_days: threshold.threshold_days,
          threshold_km: threshold.threshold_km,
          is_enabled: threshold.is_enabled,
          priority: threshold.priority,
          notification_methods: threshold.notification_methods,
        };
        
        await upsertAlertThreshold(config);
      }
      
      toast.success("Alert thresholds updated successfully");
    } catch (error) {
      console.error("Error saving alert thresholds:", error);
      toast.error("Failed to save alert thresholds");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm("Are you sure you want to reset all alert thresholds to default values? This will overwrite your current settings.")) {
      try {
        setSaving(true);
        await resetAlertThresholdsToDefault();
        await loadThresholds();
        toast.success("Alert thresholds reset to default values");
      } catch (error) {
        console.error("Error resetting alert thresholds:", error);
        toast.error("Failed to reset alert thresholds");
      } finally {
        setSaving(false);
      }
    }
  };

  // Group thresholds by entity type
  const groupedThresholds = thresholds.reduce((acc, threshold) => {
    if (!acc[threshold.entity_type]) {
      acc[threshold.entity_type] = [];
    }
    acc[threshold.entity_type].push(threshold);
    return acc;
  }, {} as Record<string, AlertThreshold[]>);

  const getEntityTypeDisplayName = (entityType: string): string => {
    switch (entityType) {
      case 'vehicle':
        return 'Vehicle Documents';
      case 'driver':
        return 'Driver Documents';
      case 'maintenance':
        return 'Maintenance';
      case 'trip':
        return 'Trip Management';
      default:
        return entityType.charAt(0).toUpperCase() + entityType.slice(1);
    }
  };

  const getAlertTypeDisplayName = (alertType: string): string => {
    switch (alertType) {
      case 'rc_expiry':
        return 'RC Expiry';
      case 'insurance_expiry':
        return 'Insurance Expiry';
      case 'puc_expiry':
        return 'PUC Expiry';
      case 'fitness_expiry':
        return 'Fitness Certificate Expiry';
      case 'permit_expiry':
        return 'Permit Expiry';
      case 'license_expiry':
        return 'License Expiry';
      case 'service_due_date':
        return 'Service Due (Date)';
      case 'service_due_km':
        return 'Service Due (Kilometers)';
      case 'task_open_too_long':
        return 'Task Open Too Long';
      case 'no_recent_maintenance':
        return 'No Recent Maintenance';
      case 'missing_fuel_bill':
        return 'Missing Fuel Bill';
      case 'missing_end_km':
        return 'Missing End KM';
      case 'missing_fuel_data':
        return 'Missing Fuel Data';
      case 'high_route_deviation':
        return 'High Route Deviation';
      default:
        return alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="ml-3 text-gray-600">Loading alert thresholds...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="h-6 w-6 mr-2 text-primary-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            Alert Thresholds Configuration
          </h2>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={handleResetToDefault}
            variant="outline"
            inputSize="sm"
            icon={<RotateCcw className="h-4 w-4" />}
            disabled={saving}
          >
            Reset to Default
          </Button>
          
          <Button
            onClick={handleSaveThresholds}
            inputSize="sm"
            icon={<Save className="h-4 w-4" />}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Configure when you want to receive alerts for different types of events. 
        You can set thresholds in days or kilometers, and choose the priority level.
      </p>

      <div className="space-y-8">
        {Object.entries(groupedThresholds).map(([entityType, entityThresholds]) => (
          <div key={entityType} className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {getEntityTypeDisplayName(entityType)}
            </h3>
            
            <div className="space-y-4">
              {entityThresholds.map((threshold, index) => {
                const globalIndex = thresholds.findIndex(t => t.id === threshold.id);
                
                return (
                  <div key={threshold.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {getAlertTypeDisplayName(threshold.alert_type)}
                      </label>
                      <p className="text-xs text-gray-500">
                        {threshold.alert_type}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={threshold.is_enabled}
                        onChange={(checked) => handleThresholdChange(globalIndex, 'is_enabled', checked)}
                        inputSize="sm"
                      />
                      <span className="text-sm text-gray-600">
                        {threshold.is_enabled ? (
                          <Bell className="h-4 w-4 text-green-500" />
                        ) : (
                          <BellOff className="h-4 w-4 text-gray-400" />
                        )}
                      </span>
                    </div>
                    
                    <div>
                      <Input
                        label="Days"
                        type="number"
                        value={threshold.threshold_days}
                        onChange={(e) => handleThresholdChange(globalIndex, 'threshold_days', parseInt(e.target.value) || 0)}
                        inputSize="sm"
                        min="0"
                      />
                    </div>
                    
                    {threshold.threshold_km !== undefined && (
                      <div>
                        <Input
                          label="KM"
                          type="number"
                          value={threshold.threshold_km}
                          onChange={(e) => handleThresholdChange(globalIndex, 'threshold_km', parseInt(e.target.value) || 0)}
                          inputSize="sm"
                          min="0"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Select
                        label="Priority"
                        value={threshold.priority}
                        onChange={(e) => handleThresholdChange(globalIndex, 'priority', e.target.value)}
                        options={[
                          { value: 'normal', label: 'Normal' },
                          { value: 'warning', label: 'Warning' },
                          { value: 'critical', label: 'Critical' },
                        ]}
                        inputSize="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {thresholds.length === 0 && (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Alert Thresholds Found</h3>
          <p className="text-gray-600 mb-4">
            It looks like you don't have any alert thresholds configured yet.
          </p>
          <Button
            onClick={handleResetToDefault}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            Set Up Default Thresholds
          </Button>
        </div>
      )}
    </div>
  );
};

export default AlertThresholdsManager;
