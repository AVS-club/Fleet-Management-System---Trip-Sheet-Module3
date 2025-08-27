import React, { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Trip, Vehicle, Driver, Warehouse, Destination } from '../../types';
import { MaterialType } from '../../utils/materialTypes';
import { AIAlert } from '../../types';
import { truncateString } from '../../utils/format';
import Button from '../ui/Button';
import { 
  Calendar, 
  MapPin, 
  Truck, 
  User, 
  FileText, 
  Fuel, 
  AlertTriangle, 
  ChevronLeft, 
  Trash2, 
  Edit, 
  IndianRupee,
  Package,
  Gauge,
  TrendingUp,
  Eye,
  X,
  Download,
  Settings,
  Info
} from 'lucide-react';

interface TripDetailsProps {
  trip: Trip;
  vehicle: Vehicle | null | undefined;
  driver: Driver | null | undefined;
  warehouse: Warehouse | null;
  destinations: Destination[];
  materialTypes: MaterialType[];
  aiAlerts: AIAlert[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TripDetails: React.FC<TripDetailsProps> = ({ 
  trip, 
  vehicle, 
  driver,
  warehouse,
  destinations,
  materialTypes,
  aiAlerts,
  onBack, 
  onEdit,
  onDelete
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const distance = trip.end_km - trip.start_km;

  // Helper function to format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'dd MMM yyyy') : 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  // Helper function to format currency
  const formatCurrency = (value?: number | null) => {
    if (!value || value === 0) return '–';
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Helper function to get material names
  const getMaterialNames = () => {
    if (!trip.material_type_ids || trip.material_type_ids.length === 0) return [];
    return trip.material_type_ids
      .map(id => materialTypes.find(mt => mt.id === id)?.name)
      .filter(Boolean) as string[];
  };

  // Check for AI alerts related to this trip
  const hasRouteDeviationAlert = aiAlerts.some(alert => 
    alert.alert_type === 'route_deviation' && alert.status === 'pending'
  );
  const hasFuelAnomalyAlert = aiAlerts.some(alert => 
    alert.alert_type === 'fuel_anomaly' && alert.status === 'pending'
  );

  // Get AI alert descriptions for tooltip
  const getAIAlertDescriptions = () => {
    const descriptions = [];
    if (hasFuelAnomalyAlert) {
      const fuelAlert = aiAlerts.find(alert => alert.alert_type === 'fuel_anomaly');
      descriptions.push(fuelAlert?.title || 'Fuel consumption anomaly detected');
    }
    if (hasRouteDeviationAlert) {
      const routeAlert = aiAlerts.find(alert => alert.alert_type === 'route_deviation');
      descriptions.push(routeAlert?.title || 'Route deviation detected');
    }
    return descriptions;
  };

  // Calculate total expenses
  const totalFuelCost = trip.total_fuel_cost || 0;
  const totalRoadExpenses = (trip.unloading_expense || 0) + 
                           (trip.driver_expense || 0) + 
                           (trip.road_rto_expense || 0) + 
                           (trip.breakdown_expense || 0) + 
                           (trip.miscellaneous_expense || 0);
  const totalExpenses = totalFuelCost + totalRoadExpenses;

  // Get route deviation color
  const getRouteDeviationColor = () => {
    if (!trip.route_deviation) return 'text-gray-600';
    const deviation = Math.abs(trip.route_deviation);
    if (deviation > 20) return 'text-error-600';
    if (deviation > 10) return 'text-warning-600';
    return 'text-success-600';
  };

  // Get mileage color based on AI alerts
  const getMileageColor = () => {
    if (hasFuelAnomalyAlert) {
      const fuelAlert = aiAlerts.find(alert => alert.alert_type === 'fuel_anomaly');
      if (fuelAlert?.severity === 'high') return 'text-error-600';
      return 'text-warning-600';
    }
    return 'text-success-600';
  };

  // Check if attachment is an image
  const isImageAttachment = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Check if we should show finance fields
  const hasFinanceData = trip.income_amount || trip.net_profit || trip.cost_per_km;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          icon={<ChevronLeft className="h-4 w-4" />}
          onClick={onBack}
          className="w-full sm:w-auto"
        >
          Back to Trips
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit className="h-4 w-4" />}
            onClick={onEdit}
            className="w-full sm:w-auto"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={onDelete}
            className="w-full sm:w-auto"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Trip Overview */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Trip {trip.trip_serial_number}
          </h2>
          <div className="flex flex-wrap gap-2">
            {trip.is_return_trip && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Return Trip
              </span>
            )}
            {trip.refueling_done && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <Fuel className="h-3 w-3 mr-1" />
                Refueling Trip
              </span>
            )}
            {(hasFuelAnomalyAlert || hasRouteDeviationAlert) && (
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 cursor-help"
                title={getAIAlertDescriptions().join('; ')}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                AI Alert
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Trip Start Date</p>
                <p className="font-medium text-gray-900">{formatDate(trip.trip_start_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Trip End Date</p>
                <p className="font-medium text-gray-900">{formatDate(trip.trip_end_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-medium text-gray-900">
                  {vehicle ? `${vehicle.registration_number} - ${vehicle.make} ${vehicle.model}` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Driver</p>
                <p className="font-medium text-gray-900">{driver?.name || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Origin Warehouse</p>
                <p className="font-medium text-gray-900">{warehouse?.name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500 mb-2">Destinations</p>
                <div className="flex flex-wrap gap-2">
                  {destinations.length > 0 ? (
                    destinations.map((dest, index) => (
                      <span
                        key={dest.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200"
                      >
                        <span className="bg-primary-200 text-primary-900 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold mr-1.5">
                          {index + 1}
                        </span>
                        {truncateString(dest.name)}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Odometer & Load */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-l-2 border-blue-500 pl-2">
          <Gauge className="h-5 w-5 mr-2 text-primary-500" />
          Odometer & Load
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Start KM</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold text-gray-900">{trip.start_km.toLocaleString()} km</p>
              {trip.manual_trip_id && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                  <Settings className="h-3 w-3 mr-1" />
                  Manual Odometer Entry
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">End KM</p>
            <p className="text-xl font-semibold text-gray-900">{trip.end_km.toLocaleString()} km</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Gross Weight</p>
            <p className="text-xl font-semibold text-gray-900">
              {trip.gross_weight ? `${trip.gross_weight.toLocaleString()} kg` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">Materials Carried</p>
          <div className="flex flex-wrap gap-2">
            {getMaterialNames().length > 0 ? (
              getMaterialNames().map((material, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                >
                  <Package className="h-3 w-3 mr-1.5" />
                  {material}
                </span>
              ))
            ) : (
              <span className="text-gray-500 text-sm">N/A</span>
            )}
          </div>
        </div>
      </div>

      {/* Trip Metrics */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-l-2 border-blue-500 pl-2">
          <TrendingUp className="h-5 w-5 mr-2 text-primary-500" />
          Trip Metrics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Distance</p>
            <p className="text-xl font-semibold text-primary-600">{distance.toLocaleString()} km</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Fuel Added</p>
            <p className="text-xl font-semibold text-gray-900">
              {trip.fuel_quantity ? `${trip.fuel_quantity} L` : 'N/A'}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Calculated Mileage</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-semibold ${getMileageColor()}`}>
                {trip.calculated_kmpl && typeof trip.calculated_kmpl === 'number' && !isNaN(trip.calculated_kmpl) ? `${trip.calculated_kmpl.toFixed(2)} km/L` : 'N/A'}
              </p>
              {hasFuelAnomalyAlert && (
                <div className="relative group">
                  <AlertTriangle className="h-4 w-4 text-warning-500 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    AI flagged: {getAIAlertDescriptions().join('; ')}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {trip.route_deviation && typeof trip.route_deviation === 'number' && !isNaN(trip.route_deviation) && (
            <div>
              <p className="text-sm text-gray-500">Route Deviation</p>
              <div className="flex items-center gap-2">
                <p className={`text-xl font-semibold ${getRouteDeviationColor()}`}>
                  {trip.route_deviation > 0 ? '+' : ''}{trip.route_deviation.toFixed(1)}%
                </p>
                {hasRouteDeviationAlert && (
                  <div className="relative group">
                    <AlertTriangle className="h-4 w-4 text-warning-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      Route deviation above threshold
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {(hasRouteDeviationAlert || hasFuelAnomalyAlert) && (
          <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-warning-500 mr-2 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-warning-800">AI Alert Triggered</span>
                <p className="text-sm text-warning-700 mt-1">
                  This trip has been flagged by our AI system for review: {getAIAlertDescriptions().join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-l-2 border-blue-500 pl-2">
          <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
          Expenses
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Fuel Cost (per L)</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.fuel_cost)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Fuel Cost</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.total_fuel_cost)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Unloading Expense</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.unloading_expense)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Driver Bata</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.driver_expense)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Road/RTO Expense</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.road_rto_expense)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Breakdown Expense</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.breakdown_expense)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Miscellaneous</p>
              <p className="font-medium text-gray-900">{formatCurrency(trip.miscellaneous_expense)}</p>
            </div>
            {trip.advance_amount && trip.advance_amount > 0 && (
              <div>
                <p className="text-sm text-gray-500">Advance Amount</p>
                <p className="font-medium text-gray-900">{formatCurrency(trip.advance_amount)}</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Road Expenses</p>
                <p className="font-semibold text-gray-900">{formatCurrency(totalRoadExpenses)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="font-semibold text-error-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>

          {/* Finance Fields - Only show if data exists */}
          {hasFinanceData && (
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {trip.income_amount && trip.income_amount > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Income Amount</p>
                    <p className="font-semibold text-success-600">{formatCurrency(trip.income_amount)}</p>
                  </div>
                )}
                {trip.net_profit !== undefined && trip.net_profit !== null && (
                  <div>
                    <p className="text-sm text-gray-500">Net Profit/Loss</p>
                    <p className={`font-semibold text-lg ${trip.net_profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                      {formatCurrency(trip.net_profit)}
                    </p>
                  </div>
                )}
                {trip.cost_per_km && trip.cost_per_km > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Cost per KM</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(trip.cost_per_km)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-l-2 border-blue-500 pl-2">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Attachments
        </h3>

        {trip.fuel_bill_url ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-3">Trip Slip / Fuel Bill</p>
            <div className="relative inline-block">
              {isImageAttachment(trip.fuel_bill_url) ? (
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedImage(trip.fuel_bill_url!)}
                >
                  <img
                    src={trip.fuel_bill_url}
                    alt="Fuel Bill"
                    className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded-lg">
                    <div className="text-white text-center">
                      <Eye className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs">View Full</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <FileText className="h-8 w-8 text-red-500 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Fuel Bill Document</p>
                    <p className="text-sm text-gray-500">PDF Document</p>
                  </div>
                  <a
                    href={trip.fuel_bill_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No attachment available</p>
        )}
      </div>

      {/* Remarks */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center border-l-2 border-blue-500 pl-2">
          <FileText className="h-5 w-5 mr-2 text-primary-500" />
          Remarks
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
            {trip.remarks || 'No remarks provided'}
          </p>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <a
                href={selectedImage}
                download
                className="inline-flex items-center px-3 py-2 bg-white bg-opacity-90 rounded-lg shadow-lg hover:bg-opacity-100 transition-all text-gray-700 hover:text-gray-900"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-2 bg-white bg-opacity-90 rounded-lg shadow-lg hover:bg-opacity-100 transition-all text-gray-700 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage}
                alt="Full size attachment"
                className="w-full h-full object-contain max-h-[80vh] rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;