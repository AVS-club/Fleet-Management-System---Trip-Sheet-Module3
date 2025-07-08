import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, Truck, User, PenTool as Tool, TrendingDown, Fuel, Clipboard } from 'lucide-react';
import Button from '../ui/Button';
import { AIAlert, Vehicle, Driver } from '../../types';
import { getVehicle, getDriver } from '../../utils/storage';
import { format, isValid } from 'date-fns';
import { toast } from 'react-toastify';

interface AlertDetailsModalProps {
  alert: AIAlert;
  onClose: () => void;
}

const AlertDetailsModal: React.FC<AlertDetailsModalProps> = ({ alert, onClose }) => {
  const [vehicle, setVehicle] = React.useState<Vehicle | null>(null);
  const [driver, setDriver] = React.useState<Driver | null>(null);
  const [similarAlerts, setSimilarAlerts] = React.useState<AIAlert[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRelatedData = async () => {
      setLoading(true);
      try {
        // Fetch vehicle if alert affects a vehicle
        if (alert.affected_entity?.type === 'vehicle' && alert.affected_entity.id) {
          const vehicleData = await getVehicle(alert.affected_entity.id);
          setVehicle(vehicleData);
        }
        
        // Fetch driver if alert affects a driver
        if (alert.affected_entity?.type === 'driver' && alert.affected_entity.id) {
          const driverData = await getDriver(alert.affected_entity.id);
          setDriver(driverData);
        }
        
        // Mock similar alerts - in a real app, you would fetch these from the API
        setSimilarAlerts([]); // For now, just use an empty array
      } catch (error) {
        console.error('Error fetching related data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelatedData();
  }, [alert]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'dd MMM yyyy, hh:mm a') : '-';
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-error-50 text-error-700 border-error-200';
      case 'medium': return 'bg-warning-50 text-warning-700 border-warning-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'fuel_anomaly':
        return <Fuel className="h-5 w-5 text-amber-500" />;
      case 'route_deviation':
        return <TrendingDown className="h-5 w-5 text-blue-500" />;
      case 'frequent_maintenance':
        return <Tool className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
    }
  };

  const copyTripId = () => {
    if (alert.metadata?.trip_id) {
      navigator.clipboard.writeText(alert.metadata.trip_id);
      toast.success('Trip ID copied!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-3 sm:px-4 pb-16 sm:pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full sm:w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-3 sm:px-4 py-3 sm:py-5 border-b border-gray-200 sm:px-6 sticky top-0 bg-white z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center pr-8">
                {getAlertTypeIcon(alert.alert_type)}
                <h3 className="ml-2 text-base sm:text-lg leading-6 font-medium text-gray-900 line-clamp-1">
                  {alert.title}
                </h3>
              </div>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500"
                onClick={onClose}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 sm:px-4 py-4 sm:py-5 sm:p-6">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {/* Alert Info */}
                <div className={`p-3 sm:p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between mb-2 gap-2">
                    <div className="flex items-center flex-wrap">
                      <span className="text-xs sm:text-sm font-medium">Alert Type:</span>
                      <span className="ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap">
                      <span className="text-xs sm:text-sm font-medium">Created:</span>
                      <span className="ml-2 text-xs sm:text-sm">{formatDate(alert.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-medium mb-1">Description:</p>
                  <p className="text-xs sm:text-sm">{alert.description}</p>
                </div>

                {/* Affected Entity */}
                {(vehicle || driver) && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-medium mb-3">Affected Entity</h4>
                    {vehicle && (
                      <div className="flex items-start space-x-3 mb-2">
                        <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{vehicle.registration_number}</p>
                          <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                        </div>
                      </div>
                    )}
                    {driver && (
                      <div className="flex items-start space-x-3">
                        <User className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          <p className="text-sm text-gray-500">License: {driver.license_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Alert Metadata */}
                {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-medium mb-3">Alert Details</h4>
                    <div className="space-y-2">
                      {alert.metadata.expected_value !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Expected Value:</span>
                          <span className="font-medium">{alert.metadata.expected_value}</span>
                        </div>
                      )}
                      {alert.metadata.actual_value !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Actual Value:</span>
                          <span className="font-medium">{alert.metadata.actual_value}</span>
                        </div>
                      )}
                      {alert.metadata.deviation !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Deviation:</span>
                          <span className={`font-medium ${
                            alert.metadata.deviation > 0 ? 'text-error-600' : 'text-success-600'
                          }`}>
                            {alert.metadata.deviation > 0 ? '+' : ''}{alert.metadata.deviation.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {alert.metadata.distance !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Distance:</span>
                          <span className="font-medium">{alert.metadata.distance} km</span>
                        </div>
                      )}
                      {alert.metadata.fuel_quantity !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fuel Quantity:</span>
                          <span className="font-medium">{alert.metadata.fuel_quantity} L</span>
                        </div>
                      )}
                      {alert.metadata.expected_range && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Expected Range:</span>
                          <span className="font-medium">{alert.metadata.expected_range}</span>
                        </div>
                      )}
                      {alert.metadata.resolution_reason && (
                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                          <span className="text-gray-600">Resolution Reason:</span>
                          <span className="font-medium">{alert.metadata.resolution_reason}</span>
                        </div>
                      )}
                      {alert.metadata.resolution_comment && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Comment:</span>
                          <span className="font-medium">{alert.metadata.resolution_comment}</span>
                        </div>
                      )}
                      {alert.metadata.resolved_at && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Resolved At:</span>
                          <span className="font-medium">{formatDate(alert.metadata.resolved_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {alert.metadata?.recommendations && alert.metadata.recommendations.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-700 mb-3">Suggested Resolution</h4>
                    <ul className="space-y-2">
                      {alert.metadata.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                          <a 
                            href="#" 
                            className="text-sm text-blue-700 hover:text-blue-800 cursor-pointer"
                            title="More info coming soon"
                          >
                            {rec}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Similar Alerts (Placeholder) */}
                {similarAlerts.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-medium mb-3">Similar Alerts</h4>
                    <div className="space-y-2">
                      {similarAlerts.map(alert => (
                        <div key={alert.id} className="border-b pb-2">
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-gray-600">{formatDate(alert.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                    <Info className="h-5 w-5 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 text-sm">No similar alerts found in the past 30 days</p>
                  </div>
                )}

                {/* Trip ID at the bottom */}
                {alert.metadata?.trip_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center">
                    <span className="text-xs text-gray-500 font-mono">Trip ID: {alert.metadata.trip_id}</span>
                    <button 
                      onClick={copyTripId}
                      size="sm" 
                      className="text-xs py-1 px-2"
                      title="Copy to clipboard"
                    >
                      <Clipboard className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
            <Button
              onClick={onClose}
              className="ml-3"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailsModal;