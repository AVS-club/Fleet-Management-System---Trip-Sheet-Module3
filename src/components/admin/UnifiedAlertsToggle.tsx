import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

/**
 * Toggle component for the Unified Alerts feature flag
 * Add this to your admin panel or settings page
 */
export const UnifiedAlertsToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(localStorage.getItem('unified_alerts') === 'true');
  }, []);

  const handleToggle = () => {
    const newValue = !enabled;
    localStorage.setItem('unified_alerts', newValue.toString());
    setEnabled(newValue);

    // Show confirmation and reload
    if (window.confirm(`Unified Alerts view will be ${newValue ? 'ENABLED' : 'DISABLED'}.\n\nPage will reload to apply changes.`)) {
      window.location.reload();
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Unified Alerts View (Beta)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enable the new social media-style timeline feed for AI alerts
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <div className="font-medium text-sm">
                Status: {enabled ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-xs text-gray-500">
                {enabled ? 'Using new unified timeline view' : 'Using classic alerts table view'}
              </div>
            </div>
          </div>

          <Button
            onClick={handleToggle}
            variant={enabled ? 'destructive' : 'default'}
            icon={<RefreshCw className="h-4 w-4" />}
            className="flex items-center gap-2"
          >
            {enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Feature flag stored in localStorage</p>
          <p>• Instant rollback if issues arise</p>
          <p>• Page reloads to apply changes</p>
          <p>• Route remains at /ai-alerts</p>
        </div>

        {enabled && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>New Features:</strong> Unified timeline, YouTube videos, mobile-optimized cards, chronological sorting
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default UnifiedAlertsToggle;
