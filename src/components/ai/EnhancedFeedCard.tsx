import React from 'react';
import {
  AlertTriangle,
  Truck,
  Wrench,
  FileText,
  TrendingUp,
  Bell,
  Calendar,
  MapPin,
  Fuel,
  DollarSign,
  TrendingDown,
  User,
  Activity,
  Navigation,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface FeedCardProps {
  event: any;
  onAction?: (eventId: string, action: 'accept' | 'reject') => void;
  vehicleData?: any;
  driverData?: any;
}

export default function EnhancedFeedCard({ event, onAction, vehicleData, driverData }: FeedCardProps) {
  const isTrip = event.kind === 'trip';
  const isAIAlert = event.kind === 'ai_alert';
  const tripData = isTrip ? event.entity_json : null;

  // Get event icon based on type and priority
  const getEventIcon = (kind: string, priority?: string) => {
    const iconClass = `h-5 w-5 ${
      priority === 'danger' ? 'text-red-500' :
      priority === 'warn' ? 'text-yellow-500' :
      'text-blue-500'
    }`;

    switch (kind) {
      case 'ai_alert': return <AlertTriangle className={iconClass} />;
      case 'trip': return <Truck className={iconClass} />;
      case 'maintenance': return <Wrench className={iconClass} />;
      case 'vehicle_doc': return <FileText className={iconClass} />;
      case 'kpi': return <TrendingUp className={iconClass} />;
      default: return <Bell className={iconClass} />;
    }
  };

  // Format currency with Indian locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Enhanced maintenance card
  const isMaintenance = event.kind === 'maintenance';
  const maintenanceData = isMaintenance ? event.entity_json : null;

  if (isMaintenance && maintenanceData) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 hover:shadow-md transition-all ${
        event.priority === 'danger' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
        event.priority === 'warn' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' :
        'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-start gap-3">
          {getEventIcon(event.kind, event.priority)}
          <div className="flex-1">
            {/* Header with title and status */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h3>
              {event.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  event.status === 'open' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                  event.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                  event.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                  event.status === 'pending' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {event.status}
                </span>
              )}
              {maintenanceData.priority && maintenanceData.priority !== 'medium' && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  maintenanceData.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                }`}>
                  {maintenanceData.priority} priority
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{event.description}</p>

            {/* Vehicle and Maintenance details grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Vehicle info */}
              {vehicleData && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {vehicleData.registration_number}
                    {vehicleData.make && ` - ${vehicleData.make}`}
                    {vehicleData.model && ` ${vehicleData.model}`}
                    {vehicleData.year && ` (${vehicleData.year})`}
                  </span>
                </div>
              )}

              {/* Scheduled date */}
              {maintenanceData.scheduled_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {format(new Date(maintenanceData.scheduled_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}

              {/* Cost */}
              {maintenanceData.cost && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    ₹{Number(maintenanceData.cost).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Odometer reading */}
              {maintenanceData.odometer_reading && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {maintenanceData.odometer_reading.toLocaleString('en-IN')} km
                  </span>
                </div>
              )}
            </div>

            {/* Task type and vendor */}
            <div className="flex flex-wrap gap-2 mb-2">
              {maintenanceData.task_type && (
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                  {maintenanceData.task_type}
                </span>
              )}
              {maintenanceData.vendor && (
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                  Vendor: {maintenanceData.vendor}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced AI Alert card with structured layout
  if (isAIAlert) {
    // Extract key metrics from title and description
    const alertData = event.entity_json || {};
    const titleMatch = event.title.match(/(\d+(?:\.\d+)?%?)/);
    const keyMetric = titleMatch ? titleMatch[1] : null;

    // Extract trip ID from description
    const tripMatch = event.description.match(/Trip (T\d+-\d+-\d+)/);
    const tripId = tripMatch ? tripMatch[1] : null;

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition-all ${
        event.priority === 'danger' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
        event.priority === 'warn' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
        'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {getEventIcon(event.kind, event.priority)}
            <div className="flex-1 min-w-0">
              {/* Header with metric highlight */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                  {event.title.split(':')[0]}:
                </h3>
                {keyMetric && (
                  <span className={`text-2xl font-bold ${
                    event.priority === 'danger' ? 'text-red-600 dark:text-red-400' :
                    event.priority === 'warn' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {keyMetric}
                  </span>
                )}
                {event.status && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ml-auto ${
                    event.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                    event.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                    event.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {event.status}
                  </span>
                )}
              </div>

              {/* Condensed description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                {event.description.length > 120
                  ? event.description.substring(0, 120) + '...'
                  : event.description}
              </p>

              {/* Key details in a grid */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {tripId && (
                  <div className="flex items-center gap-1.5">
                    <Navigation className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">{tripId}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {event.status === 'pending' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => onAction?.(event.id, 'accept')}
                className="p-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors"
                title="Accept"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
              <button
                onClick={() => onAction?.(event.id, 'reject')}
                className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
                title="Reject"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular card for other non-trip, non-maintenance events
  if (!isTrip) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 hover:shadow-md transition-all ${
        event.priority === 'danger' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
        event.priority === 'warn' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' :
        'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getEventIcon(event.kind, event.priority)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h3>
                {event.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    event.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                    event.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                    event.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {event.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{event.description}</p>

              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced trip card with visuals
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden ${
      tripData?.route_deviation > 20 ? 'border-2 border-yellow-400 dark:border-yellow-600' :
      tripData?.fuel_quantity > 100 ? 'border-2 border-orange-400 dark:border-orange-600' :
      'border border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header with Trip Info */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-blue-100 text-sm">{event.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-100">
              {format(new Date(event.event_time), 'MMM dd, yyyy')}
            </div>
            <div className="text-xs text-blue-200">
              {format(new Date(event.event_time), 'HH:mm')}
            </div>
          </div>
        </div>
      </div>

      {/* Map Preview Section */}
      <div className="relative h-32 bg-gray-100 dark:bg-gray-900">
        {/* SVG map simulation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 dark:from-blue-950 dark:via-green-950 dark:to-blue-950">
          <div className="relative h-full w-full">
            {/* Simulated map view with route */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160">
              {/* Background grid pattern */}
              <pattern id={`grid-${event.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill={`url(#grid-${event.id})`} />

              {/* Route line */}
              <path
                d="M 50 80 Q 150 40, 250 60 T 350 80"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="5,5"
                className="animate-pulse"
              />

              {/* Start marker */}
              <circle cx="50" cy="80" r="8" fill="#10B981" />
              <text x="50" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">S</text>

              {/* End marker */}
              <circle cx="350" cy="80" r="8" fill="#EF4444" />
              <text x="350" y="85" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">E</text>

              {/* Distance label */}
              <rect x="170" y="100" width="60" height="20" rx="10" fill="white" fillOpacity="0.9"/>
              <text x="200" y="114" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="500">
                {tripData?.distance || 0} km
              </text>
            </svg>

            {/* Overlay gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Map overlay info */}
        <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-2 py-1">
          <div className="flex items-center gap-1 text-xs">
            <Navigation className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Route Overview</span>
          </div>
        </div>
      </div>

      {/* Driver and Vehicle Info */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Driver Info */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="relative">
            {driverData?.photo_url ? (
              <>
                <img
                  src={driverData.photo_url}
                  alt={driverData.name || 'Driver'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {driverData?.name?.charAt(0)?.toUpperCase() || 'D'}
                  </span>
                </div>
              </>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {driverData?.name?.charAt(0)?.toUpperCase() || 'D'}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
              <Activity className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Driver</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
              {driverData?.name || 'Not Assigned'}
            </p>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="relative">
            {vehicleData?.photo_url ? (
              <>
                <img
                  src={vehicleData.photo_url}
                  alt={vehicleData.registration_number || 'Vehicle'}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
              {vehicleData?.registration_number || tripData?.vehicle_id}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
        {/* Distance */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Distance</span>
          </div>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
            {tripData?.distance || 0} <span className="text-xs font-normal">km</span>
          </p>
        </div>

        {/* Fuel */}
        {tripData?.fuel_quantity && (
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Fuel className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Fuel</span>
            </div>
            <p className="text-lg font-bold text-orange-900 dark:text-orange-100 mt-1">
              {tripData.fuel_quantity} <span className="text-xs font-normal">L</span>
            </p>
          </div>
        )}

        {/* Revenue */}
        {tripData?.net_profit !== undefined && (
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <DollarSign className="h-4 w-4 text-green-500 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Revenue</span>
            </div>
            <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1 truncate">
              {formatCurrency(tripData.net_profit)}
            </p>
          </div>
        )}

        {/* Efficiency/Deviation */}
        {tripData?.route_deviation !== undefined && (
          <div className={`rounded-lg p-3 ${
            tripData.route_deviation > 20 ? 'bg-red-50 dark:bg-red-900/30' :
            tripData.route_deviation > 10 ? 'bg-yellow-50 dark:bg-yellow-900/30' :
            'bg-green-50 dark:bg-green-900/30'
          }`}>
            <div className="flex items-center justify-between">
              <TrendingDown className={`h-4 w-4 ${
                tripData.route_deviation > 20 ? 'text-red-500 dark:text-red-400' :
                tripData.route_deviation > 10 ? 'text-yellow-500 dark:text-yellow-400' :
                'text-green-500 dark:text-green-400'
              }`} />
              <span className={`text-xs font-medium ${
                tripData.route_deviation > 20 ? 'text-red-700 dark:text-red-300' :
                tripData.route_deviation > 10 ? 'text-yellow-700 dark:text-yellow-300' :
                'text-green-700 dark:text-green-300'
              }`}>Deviation</span>
            </div>
            <p className={`text-lg font-bold mt-1 ${
              tripData.route_deviation > 20 ? 'text-red-900 dark:text-red-100' :
              tripData.route_deviation > 10 ? 'text-yellow-900 dark:text-yellow-100' :
              'text-green-900 dark:text-green-100'
            }`}>
              {tripData.route_deviation}%
            </p>
          </div>
        )}
      </div>

      {/* Footer with status and time */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatDistanceToNow(new Date(event.event_time), { addSuffix: true })}
          </span>
        </div>
        {event.status && (
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            event.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
            event.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {event.status === 'completed' ? 'Completed' :
             event.status === 'in_progress' ? 'In Progress' :
             event.status}
          </span>
        )}
      </div>
    </div>
  );
}
