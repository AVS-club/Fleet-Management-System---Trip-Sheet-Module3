import React from 'react';
import { format } from 'date-fns';
import { MaintenanceAuditLog as MaintenanceAuditLogType } from '../../types/maintenance';
import { Clock, User, FileText } from 'lucide-react';

interface MaintenanceAuditLogProps {
  taskId: string;
  logs: MaintenanceAuditLogType[];
}

const MaintenanceAuditLog: React.FC<MaintenanceAuditLogProps> = ({ taskId, logs }) => {
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Audit Log</h3>
      
      {sortedLogs.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No audit logs found for this task.</p>
      ) : (
        <div className="space-y-4">
          {sortedLogs.map(log => (
            <div key={log.id} className="bg-white p-4 rounded-lg border">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {log.adminUser || 'System'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {format(new Date(log.timestamp), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {Object.entries(log.changes).map(([field, change]) => (
                  <div key={field} className="text-sm">
                    <span className="font-medium text-gray-700">
                      {field.charAt(0).toUpperCase() + field.slice(1)}:
                    </span>
                    <div className="ml-4 space-y-1">
                      <div className="text-error-600 line-through">
                        {change.previousValue?.toString() || 'Not set'}
                      </div>
                      <div className="text-success-600">
                        {change.updatedValue?.toString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceAuditLog;