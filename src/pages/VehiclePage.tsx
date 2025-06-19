import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { getVehicle, getVehicleStats, getTrips } from '../utils/storage';
import { Truck, Calendar, PenTool as PenToolIcon, AlertTriangle, ChevronLeft, Fuel, FileText, Shield, Download, Share2, FileDown, Eye, Clock, Info, BarChart2, Database, IndianRupee } from 'lucide-react';
import Button from '../components/ui/Button';
import MileageChart from '../components/dashboard/MileageChart';
import VehicleForm from '../components/vehicles/VehicleForm';
import { generateVehiclePDF, downloadVehicleDocuments, createShareableVehicleLink } from '../utils/exportUtils';
import { toast } from 'react-toastify';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import DocumentStatusPanel from '../components/vehicles/DocumentStatusPanel';
import DateRangeFilter, { DateRangeFilterType } from '../components/ui/DateRangeFilter';

const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [stats, setStats] = useState<{ totalTrips: number; totalDistance: number; averageKmpl?: number }>({
    totalTrips: 0,
    totalDistance: 0
  });
  
  // Date range filter state
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilterType>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const [vehicleData, tripsData, vehicleStats] = await Promise.all([
          getVehicle(id),
          getTrips(),
          getVehicleStats(id)
        ]);
        
        setVehicle(vehicleData);
        setTrips(Array.isArray(tripsData) ? tripsData.filter(trip => trip.vehicle_id === id) : []);
        setStats(vehicleStats || { totalTrips: 0, totalDistance: 0 });
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  if (!vehicle) {
    return (
      <Layout title="Vehicle Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">The requested vehicle could not be found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/vehicles')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Vehicles
          </Button>
        </div>
      </Layout>
    );
  }

  if (isEditing) {
    return (
      <Layout
        title="Edit Vehicle"
        subtitle={vehicle.registration_number}
        actions={
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          <VehicleForm
            initialData={vehicle}
            onSubmit={(data) => {
              // Handle update
              setIsEditing(false);
            }}
          />
        </div>
      </Layout>
    );
  }

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    
    switch (dateRangeFilter) {
      case 'today':
        return {
          start: new Date(now.setHours(0, 0, 0, 0)),
          end: new Date()
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          start: new Date(yesterday.setHours(0, 0, 0, 0)),
          end: new Date(yesterday.setHours(23, 59, 59, 999))
        };
      case 'thisWeek':
        return {
          start: subDays(now, now.getDay()),
          end: now
        };
      case 'lastWeek':
        return {
          start: subDays(now, now.getDay() + 7),
          end: subDays(now, now.getDay() + 1)
        };
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: now
        };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'thisYear':
        return {
          start: startOfYear(now),
          end: now
        };
      case 'lastYear':
        const lastYear = subYears(now, 1);
        return {
          start: startOfYear(lastYear),
          end: endOfYear(lastYear)
        };
      case 'custom':
        return {
          start: new Date(customDateRange.start),
          end: new Date(customDateRange.end)
        };
      default:
        return {
          start: startOfMonth(now),
          end: now
        };
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Handle export as PDF
  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = await generateVehiclePDF(vehicle, stats);
      doc.save(`${vehicle.registration_number}_profile.pdf`);
      toast.success('Vehicle profile exported successfully');
    } catch (error) {
      console.error('Error exporting vehicle profile:', error);
      toast.error('Failed to export vehicle profile');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle download documents
  const handleDownloadDocuments = async () => {
    try {
      setDownloadLoading(true);
      await downloadVehicleDocuments(vehicle);
      toast.success('Vehicle documents downloaded successfully');
    } catch (error) {
      console.error('Error downloading vehicle documents:', error);
      toast.error('Failed to download vehicle documents');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Handle create shareable link
  const handleCreateShareableLink = async () => {
    try {
      setShareLoading(true);
      const link = await createShareableVehicleLink(vehicle.id);
      
      // Copy link to clipboard
      await navigator.clipboard.writeText(link);
      toast.success('Shareable link copied to clipboard (valid for 7 days)');
    } catch (error) {
      console.error('Error creating shareable link:', error);
      toast.error('Failed to create shareable link');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <Layout
      title={`Vehicle: ${vehicle.registration_number}`}
      subtitle={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/vehicles')}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportPDF}
            isLoading={exportLoading}
            icon={<FileDown className="h-4 w-4" />}
          >
            Export PDF
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDownloadDocuments}
            isLoading={downloadLoading}
            icon={<Download className="h-4 w-4" />}
          >
            Download Docs
          </Button>
          
          <Button
            variant="outline"
            onClick={handleCreateShareableLink}
            isLoading={shareLoading}
            icon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>
          
          <Button
            onClick={() => setIsEditing(true)}
            icon={<PenToolIcon className="h-4 w-4" />}
          >
            Edit Vehicle
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="flex justify-end">
            <div className="w-full max-w-md">
              <DateRangeFilter
                value={dateRangeFilter}
                onChange={setDateRangeFilter}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
                compact
              />
            </div>
          </div>

          {/* Main Content Grid - 3 Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SECTION 1: VEHICLE INFORMATION */}
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
                  {vehicle.owner_name && (
                    <p className="text-sm text-gray-500">
                      <span className="inline-flex items-center">
                        <User className="h-3.5 w-3.5 mr-1 text-gray-400" />
                        Owned by {vehicle.owner_name}
                      </span>
                    </p>
                  )}
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                  vehicle.status === 'active' 
                    ? 'bg-success-100 text-success-800'
                    : vehicle.status === 'maintenance'
                    ? 'bg-warning-100 text-warning-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {vehicle.status}
                </div>
              </div>
              
              <div className="space-y-3 divide-y divide-gray-100">
                <div className="grid grid-cols-2 gap-4 pb-3">
                  <div>
                    <p className="text-xs text-gray-500">Registration</p>
                    <p className="font-medium">{vehicle.registration_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Make & Model</p>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-medium capitalize">{vehicle.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Year</p>
                    <p className="font-medium">{vehicle.year}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Fuel Type</p>
                    <p className="font-medium capitalize">{vehicle.fuel_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Chassis Number</p>
                    <p className="font-medium font-mono text-sm">{vehicle.chassis_number || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Engine Number</p>
                    <p className="font-medium font-mono text-sm">{vehicle.engine_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reg. Date</p>
                    <p className="font-medium">{formatDate(vehicle.registration_date)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-3">
                  <div>
                    <p className="text-xs text-gray-500">Current Odometer</p>
                    <p className="font-medium">{vehicle.current_odometer?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tyre Details</p>
                    <p className="font-medium">
                      {vehicle.tyre_size && vehicle.number_of_tyres ? 
                        `${vehicle.number_of_tyres}x ${vehicle.tyre_size}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* SECTION 2: DOCUMENT STATUS */}
            <div className="lg:col-span-2">
              <DocumentStatusPanel vehicle={vehicle} />
            </div>
          </div>
          
          {/* Financial Summary Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <IndianRupee className="h-5 w-5 mr-2 text-primary-500" />
                Financial Summary
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Insurance Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-blue-500" />
                  Insurance
                </h4>
                <dl className="space-y-1">
                  {vehicle.insurance_premium_amount && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Premium</dt>
                      <dd className="text-sm font-medium">₹{vehicle.insurance_premium_amount.toLocaleString()}</dd>
                    </div>
                  )}
                  {vehicle.insurance_idv && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">IDV</dt>
                      <dd className="text-sm font-medium">₹{vehicle.insurance_idv.toLocaleString()}</dd>
                    </div>
                  )}
                  {vehicle.insurance_start_date && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Start Date</dt>
                      <dd className="text-sm">{formatDate(vehicle.insurance_start_date)}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              {/* Tax Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <IndianRupee className="h-4 w-4 mr-1 text-green-500" />
                  Tax
                </h4>
                <dl className="space-y-1">
                  {vehicle.tax_amount && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Amount</dt>
                      <dd className="text-sm font-medium">₹{vehicle.tax_amount.toLocaleString()}</dd>
                    </div>
                  )}
                  {vehicle.tax_period && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Period</dt>
                      <dd className="text-sm font-medium capitalize">{vehicle.tax_period}</dd>
                    </div>
                  )}
                  {vehicle.tax_scope && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Scope</dt>
                      <dd className="text-sm">{vehicle.tax_scope}</dd>
                    </div>
                  )}
                </dl>
              </div>
              
              {/* Other Costs */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <IndianRupee className="h-4 w-4 mr-1 text-purple-500" />
                  Other Costs
                </h4>
                <dl className="space-y-1">
                  {vehicle.fitness_cost && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Fitness Cert.</dt>
                      <dd className="text-sm font-medium">₹{vehicle.fitness_cost.toLocaleString()}</dd>
                    </div>
                  )}
                  {vehicle.permit_cost && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">Permit</dt>
                      <dd className="text-sm font-medium">₹{vehicle.permit_cost.toLocaleString()}</dd>
                    </div>
                  )}
                  {vehicle.puc_cost && (
                    <div className="flex justify-between">
                      <dt className="text-xs text-gray-500">PUC</dt>
                      <dd className="text-sm font-medium">₹{vehicle.puc_cost.toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
          
          {/* Document Alerts Section */}
          {(vehicle.insurance_expiry_date && new Date(vehicle.insurance_expiry_date) < new Date() ||
            vehicle.fitness_expiry_date && new Date(vehicle.fitness_expiry_date) < new Date() ||
            vehicle.permit_expiry_date && new Date(vehicle.permit_expiry_date) < new Date() ||
            vehicle.puc_expiry_date && new Date(vehicle.puc_expiry_date) < new Date()) && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-error-500 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-error-800 font-medium">Expired Document Alert</h3>
                  <ul className="mt-1 text-error-700 list-disc list-inside text-sm">
                    {vehicle.insurance_expiry_date && new Date(vehicle.insurance_expiry_date) < new Date() && (
                      <li>Insurance expired on {formatDate(vehicle.insurance_expiry_date)}</li>
                    )}
                    {vehicle.fitness_expiry_date && new Date(vehicle.fitness_expiry_date) < new Date() && (
                      <li>Fitness certificate expired on {formatDate(vehicle.fitness_expiry_date)}</li>
                    )}
                    {vehicle.permit_expiry_date && new Date(vehicle.permit_expiry_date) < new Date() && (
                      <li>Permit expired on {formatDate(vehicle.permit_expiry_date)}</li>
                    )}
                    {vehicle.puc_expiry_date && new Date(vehicle.puc_expiry_date) < new Date() && (
                      <li>PUC certificate expired on {formatDate(vehicle.puc_expiry_date)}</li>
                    )}
                  </ul>
                  <p className="mt-2 text-sm text-error-700">Please update these documents to maintain compliance.</p>
                </div>
              </div>
            </div>
          )}

          {/* Expiring Soon Alert */}
          {(vehicle.insurance_expiry_date && 
            new Date(vehicle.insurance_expiry_date) > new Date() && 
            new Date(vehicle.insurance_expiry_date) < addDays(new Date(), 30) ||
            vehicle.fitness_expiry_date && 
            new Date(vehicle.fitness_expiry_date) > new Date() && 
            new Date(vehicle.fitness_expiry_date) < addDays(new Date(), 30) ||
            vehicle.permit_expiry_date && 
            new Date(vehicle.permit_expiry_date) > new Date() && 
            new Date(vehicle.permit_expiry_date) < addDays(new Date(), 30) ||
            vehicle.puc_expiry_date && 
            new Date(vehicle.puc_expiry_date) > new Date() && 
            new Date(vehicle.puc_expiry_date) < addDays(new Date(), 30)) && 
          !(vehicle.insurance_expiry_date && new Date(vehicle.insurance_expiry_date) < new Date() ||
            vehicle.fitness_expiry_date && new Date(vehicle.fitness_expiry_date) < new Date() ||
            vehicle.permit_expiry_date && new Date(vehicle.permit_expiry_date) < new Date() ||
            vehicle.puc_expiry_date && new Date(vehicle.puc_expiry_date) < new Date()) && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-warning-500 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-warning-800 font-medium">Documents Expiring Soon</h3>
                  <ul className="mt-1 text-warning-700 list-disc list-inside text-sm">
                    {vehicle.insurance_expiry_date && 
                      new Date(vehicle.insurance_expiry_date) > new Date() && 
                      new Date(vehicle.insurance_expiry_date) < addDays(new Date(), 30) && (
                      <li>Insurance expires on {formatDate(vehicle.insurance_expiry_date)}</li>
                    )}
                    {vehicle.fitness_expiry_date && 
                      new Date(vehicle.fitness_expiry_date) > new Date() && 
                      new Date(vehicle.fitness_expiry_date) < addDays(new Date(), 30) && (
                      <li>Fitness certificate expires on {formatDate(vehicle.fitness_expiry_date)}</li>
                    )}
                    {vehicle.permit_expiry_date && 
                      new Date(vehicle.permit_expiry_date) > new Date() && 
                      new Date(vehicle.permit_expiry_date) < addDays(new Date(), 30) && (
                      <li>Permit expires on {formatDate(vehicle.permit_expiry_date)}</li>
                    )}
                    {vehicle.puc_expiry_date && 
                      new Date(vehicle.puc_expiry_date) > new Date() && 
                      new Date(vehicle.puc_expiry_date) < addDays(new Date(), 30) && (
                      <li>PUC certificate expires on {formatDate(vehicle.puc_expiry_date)}</li>
                    )}
                  </ul>
                  <p className="mt-2 text-sm text-warning-700">Please prepare for renewal soon.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Mileage Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mileage Trends</h3>
            <div className="h-64">
              <MileageChart trips={trips} />
            </div>
          </div>
          
          {/* Additional VAHAN Data Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Database className="h-5 w-5 mr-2 text-primary-500" />
                Additional Vehicle Information
              </h3>
              {vehicle.vahan_last_fetched_at && (
                <span className="text-xs text-gray-500">
                  Last updated: {new Date(vehicle.vahan_last_fetched_at).toLocaleString()}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 max-w-4xl">
              {vehicle.financer && (
                <div>
                  <p className="text-xs text-gray-500">Financer</p>
                  <p className="font-medium">{vehicle.financer}</p>
                </div>
              )}
              
              {vehicle.vehicle_class && (
                <div>
                  <p className="text-xs text-gray-500">Vehicle Class</p>
                  <p className="font-medium">{vehicle.vehicle_class}</p>
                </div>
              )}
              
              {vehicle.color && (
                <div>
                  <p className="text-xs text-gray-500">Color</p>
                  <p className="font-medium">{vehicle.color}</p>
                </div>
              )}
              
              {vehicle.cubic_capacity && (
                <div>
                  <p className="text-xs text-gray-500">Cubic Capacity</p>
                  <p className="font-medium">{vehicle.cubic_capacity} cc</p>
                </div>
              )}
              
              {vehicle.cylinders && (
                <div>
                  <p className="text-xs text-gray-500">Cylinders</p>
                  <p className="font-medium">{vehicle.cylinders}</p>
                </div>
              )}
              
              {vehicle.unladen_weight && (
                <div>
                  <p className="text-xs text-gray-500">Unladen Weight</p>
                  <p className="font-medium">{vehicle.unladen_weight} kg</p>
                </div>
              )}
              
              {vehicle.seating_capacity && (
                <div>
                  <p className="text-xs text-gray-500">Seating Capacity</p>
                  <p className="font-medium">{vehicle.seating_capacity}</p>
                </div>
              )}
              
              {vehicle.emission_norms && (
                <div>
                  <p className="text-xs text-gray-500">Emission Norms</p>
                  <p className="font-medium">{vehicle.emission_norms}</p>
                </div>
              )}
              
              {vehicle.rc_status && (
                <div>
                  <p className="text-xs text-gray-500">RC Status</p>
                  <p className="font-medium">{vehicle.rc_status}</p>
                </div>
              )}
              
              {vehicle.national_permit_number && (
                <div>
                  <p className="text-xs text-gray-500">National Permit</p>
                  <p className="font-medium">{vehicle.national_permit_number}</p>
                </div>
              )}
              
              {vehicle.national_permit_upto && (
                <div>
                  <p className="text-xs text-gray-500">Permit Valid Till</p>
                  <p className="font-medium">{formatDate(vehicle.national_permit_upto)}</p>
                </div>
              )}
              
              {vehicle.noc_details && (
                <div>
                  <p className="text-xs text-gray-500">NOC Details</p>
                  <p className="font-medium">{vehicle.noc_details}</p>
                </div>
              )}
            </div>
            
            {!vehicle.financer && 
             !vehicle.vehicle_class &&
             !vehicle.color && 
             !vehicle.cubic_capacity && 
             !vehicle.cylinders && 
             !vehicle.unladen_weight && 
             !vehicle.seating_capacity && 
             !vehicle.emission_norms && 
             !vehicle.rc_status && 
             !vehicle.national_permit_number && (
              <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg mt-4">
                <Info className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-500">No additional information available for this vehicle</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default VehiclePage;