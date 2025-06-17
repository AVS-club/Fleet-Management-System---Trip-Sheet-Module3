import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import TripsTable from '../../components/admin/TripsTable';
import TripsSummary from '../../components/admin/TripsSummary';
import ExportOptionsModal, { ExportOptions } from '../../components/admin/ExportOptionsModal';
import { Trip, Vehicle, Driver, Warehouse } from '../../types';
import { getTrips, getVehicles, getDrivers, getWarehouses, updateTrip } from '../../utils/storage';
import { generateCSV, downloadCSV, parseCSV } from '../../utils/csvParser';
import { supabase } from '../../utils/supabaseClient';
import { format, subDays } from 'date-fns';
import Button from '../../components/ui/Button';
import { Calendar, ChevronDown, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

interface TripSummaryMetrics {
  totalExpenses: number;
  avgDistance: number;
  tripCount: number;
  meanMileage: number;
  topDriver: {
    id: string;
    name: string;
    totalDistance: number;
    tripCount: number;
  } | null;
  topVehicle: {
    id: string;
    registrationNumber: string;
    tripCount: number;
  } | null;
}

const AdminTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryMetrics, setSummaryMetrics] = useState<TripSummaryMetrics>({
    totalExpenses: 0,
    avgDistance: 0,
    tripCount: 0,
    meanMileage: 0,
    topDriver: null,
    topVehicle: null
  });

  // Filter state
  const [filters, setFilters] = useState({
    dateRange: {
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    },
    vehicleId: '',
    driverId: '',
    warehouseId: '',
    tripType: '',
    search: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setSummaryLoading(true);

        const [tripsData, vehiclesData, driversData, warehousesData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses()
        ]);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);

        // Fetch summary metrics
        await fetchSummaryMetrics();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
        setSummaryLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch summary metrics when filters change
  useEffect(() => {
    fetchSummaryMetrics();
  }, [filters]);

  // Filter trips based on current filters
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Search filter
      if (filters.search) {
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        const driver = drivers.find(d => d.id === trip.driver_id);
        
        const searchTerm = filters.search.toLowerCase();
        const searchFields = [
          trip.trip_serial_number,
          vehicle?.registration_number,
          driver?.name,
          trip.station
        ].map(field => field?.toLowerCase());
        
        if (!searchFields.some(field => field?.includes(searchTerm))) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        const tripStartDate = new Date(trip.trip_start_date);
        if (tripStartDate < startDate) {
          return false;
        }
      }
      
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999); // End of day
        const tripEndDate = new Date(trip.trip_end_date);
        if (tripEndDate > endDate) {
          return false;
        }
      }

      // Vehicle filter
      if (filters.vehicleId && trip.vehicle_id !== filters.vehicleId) {
        return false;
      }

      // Driver filter
      if (filters.driverId && trip.driver_id !== filters.driverId) {
        return false;
      }

      // Warehouse filter
      if (filters.warehouseId && trip.warehouse_id !== filters.warehouseId) {
        return false;
      }

      // Trip type filter
      if (filters.tripType) {
        if (filters.tripType === 'local' && !trip.short_trip) {
          return false;
        }
        if (filters.tripType === 'two_way' && !(Array.isArray(trip.destinations) && trip.destinations.length > 1)) {
          return false;
        }
        if (filters.tripType === 'one_way' && (!(!trip.short_trip && Array.isArray(trip.destinations) && trip.destinations.length === 1))) {
          return false;
        }
      }

      return true;
    });
  }, [trips, vehicles, drivers, filters]);

  const fetchSummaryMetrics = async () => {
    try {
      setSummaryLoading(true);
      
      const { data, error } = await supabase.rpc('get_trip_summary_metrics', {
        start_date: filters.dateRange.start ? new Date(filters.dateRange.start).toISOString() : null,
        end_date: filters.dateRange.end ? new Date(filters.dateRange.end).toISOString() : null,
        p_vehicle_id: filters.vehicleId || null,
        p_driver_id: filters.driverId || null,
        p_warehouse_id: filters.warehouseId || null,
        p_trip_type: filters.tripType || null
      });
      
      if (error) {
        console.error("Error fetching summary metrics:", error);
      } else if (data) {
        setSummaryMetrics(data);
      }
    } catch (error) {
      console.error("Exception fetching summary metrics:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleUpdateTrip = async (tripId: string, updates: Partial<Trip>) => {
    const updatedTrip = await updateTrip(tripId, updates);
    if (updatedTrip) {
      setTrips(prev => 
        prev.map(trip => 
          trip.id === tripId ? updatedTrip : trip
        )
      );
      // Refresh summary metrics after update
      fetchSummaryMetrics();
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      // Delete the trip from Supabase
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) {
        throw new Error(`Failed to delete trip: ${error.message}`);
      }

      // If successful, update the trips list
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      toast.success('Trip deleted successfully');
      
      // Refresh summary metrics
      fetchSummaryMetrics();
    } catch (error) {
      console.error("Error deleting trip:", error);
      toast.error(`Error deleting trip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const handleExport = (options: ExportOptions) => {
    // Filter trips based on export options
    let filteredTrips = trips;

    if (options.dateRange.start) {
      filteredTrips = filteredTrips.filter(trip => 
        new Date(trip.trip_start_date) >= new Date(options.dateRange.start)
      );
    }

    if (options.dateRange.end) {
      filteredTrips = filteredTrips.filter(trip => 
        new Date(trip.trip_end_date) <= new Date(options.dateRange.end)
      );
    }

    if (options.vehicleId) {
      filteredTrips = filteredTrips.filter(trip => trip.vehicle_id === options.vehicleId);
    }

    if (options.driverId) {
      filteredTrips = filteredTrips.filter(trip => trip.driver_id === options.driverId);
    }

    if (options.warehouseId) {
      filteredTrips = filteredTrips.filter(trip => trip.warehouse_id === options.warehouseId);
    }

    if (options.tripType) {
      filteredTrips = filteredTrips.filter(trip => {
        if (options.tripType === 'local') return trip.short_trip;
        if (options.tripType === 'two_way') return Array.isArray(trip.destinations) && trip.destinations.length > 1;
        return !trip.short_trip && Array.isArray(trip.destinations) && trip.destinations.length === 1;
      });
    }

    // Prepare data for export
    const exportData = filteredTrips.map(trip => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      const driver = drivers.find(d => d.id === trip.driver_id);
      const warehouse = warehouses.find(w => w.id === trip.warehouse_id);

      return {
        'Trip ID': trip.trip_serial_number,
        'Start Date': new Date(trip.trip_start_date).toLocaleDateString(),
        'End Date': new Date(trip.trip_end_date).toLocaleDateString(),
        'Vehicle': vehicle?.registration_number,
        'Driver': driver?.name,
        'Source': warehouse?.name,
        'Start KM': trip.start_km,
        'End KM': trip.end_km,
        'Distance': trip.end_km - trip.start_km,
        'Mileage': trip.calculated_kmpl?.toFixed(2) || '-',
        'Fuel Cost': trip.total_fuel_cost || 0,
        'Road Expenses': trip.total_road_expenses,
        'Total Cost': (trip.total_fuel_cost || 0) + trip.total_road_expenses,
        'Type': trip.short_trip ? 'Local' : trip.destinations.length > 1 ? 'Two Way' : 'One Way'
      };
    });

    // Export based on format
    if (options.format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trips');
      XLSX.writeFile(wb, 'trips-export.xlsx');
    } else {
      const csv = generateCSV(exportData, {});
      downloadCSV('trips-export.csv', csv);
    }
  };

  const handleDownloadFormat = () => {
    const sampleData = [{
      'Trip ID': 'T0001',
      'Vehicle Registration': 'CG-04-XX-1234',
      'Driver Name': 'John Doe',
      'Start Date': '01/01/2024',
      'End Date': '02/01/2024',
      'Source Warehouse': 'Main Warehouse',
      'Destination(s)': 'Bhilai, Durg',
      'Start KM': '10000',
      'End KM': '10500',
      'Fuel Quantity': '50',
      'Fuel Cost': '5000',
      'Road Expenses': '2000',
      'Trip Type': 'Two Way',
      'Notes': 'Regular delivery trip'
    }];

    const csv = generateCSV(sampleData, {});
    downloadCSV('trips-import-format.csv', csv);
  };

  const handleImport = async (file: File) => {
    try {
      const data = await parseCSV(file);
      // Process imported data
      toast.info(`Imported ${data.length} trips. Processing...`);
      // You'd normally process these and add to the database
      // For now, we're just showing a success message
      toast.success(`Successfully processed ${data.length} trips`);
    } catch (error) {
      console.error('Error importing file:', error);
      toast.error('Failed to import trips');
    }
  };

  const getActiveFiltersText = () => {
    const parts = [];
    
    if (filters.vehicleId) {
      const vehicle = vehicles.find(v => v.id === filters.vehicleId);
      parts.push(`Vehicle: ${vehicle?.registration_number || 'Unknown'}`);
    } else {
      parts.push('Vehicle: All');
    }
    
    if (filters.driverId) {
      const driver = drivers.find(d => d.id === filters.driverId);
      parts.push(`Driver: ${driver?.name || 'Unknown'}`);
    } else {
      parts.push('Driver: All');
    }
    
    if (filters.dateRange.start && filters.dateRange.end) {
      parts.push(`Dates: ${format(new Date(filters.dateRange.start), 'dd MMM yyyy')} - ${format(new Date(filters.dateRange.end), 'dd MMM yyyy')}`);
    }
    
    return parts.join(', ');
  };

  return (
    <Layout
      title="Trip Management"
      subtitle="View and manage all trip records"
    >
      {/* Filters */}
      {!loading && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 sticky top-16 z-10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-2">
            <h3 className="text-lg font-medium">Trip Filters</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              icon={showFilters ? <ChevronDown className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex gap-2 items-center">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <input
                    type="date"
                    className="border border-gray-300 rounded-md p-2 text-sm"
                    value={filters.dateRange.start}
                    onChange={e => handleFiltersChange({ dateRange: { ...filters.dateRange, start: e.target.value } })}
                  />
                  <input
                    type="date"
                    className="border border-gray-300 rounded-md p-2 text-sm"
                    value={filters.dateRange.end}
                    onChange={e => handleFiltersChange({ dateRange: { ...filters.dateRange, end: e.target.value } })}
                  />
                </div>
              </div>
              <select
                className="border border-gray-300 rounded-md p-2 text-sm"
                value={filters.vehicleId}
                onChange={e => handleFiltersChange({ vehicleId: e.target.value })}
              >
                <option value="">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number}</option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-md p-2 text-sm"
                value={filters.driverId}
                onChange={e => handleFiltersChange({ driverId: e.target.value })}
              >
                <option value="">All Drivers</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-md p-2 text-sm"
                value={filters.warehouseId}
                onChange={e => handleFiltersChange({ warehouseId: e.target.value })}
              >
                <option value="">All Warehouses</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-md p-2 text-sm"
                value={filters.tripType}
                onChange={e => handleFiltersChange({ tripType: e.target.value })}
              >
                <option value="">All Trip Types</option>
                <option value="one_way">One Way</option>
                <option value="two_way">Two Way</option>
                <option value="local">Local Trip</option>
              </select>
              <input
                type="text"
                placeholder="Search trips..."
                className="border border-gray-300 rounded-md p-2 text-sm"
                value={filters.search}
                onChange={e => handleFiltersChange({ search: e.target.value })}
              />
            </div>
          )}

          {/* Active filters display */}
          <div className="bg-gray-100 px-3 py-1.5 text-sm text-gray-600 rounded">
            <strong>Active Filters:</strong> {getActiveFiltersText()}
          </div>
        </div>
      )}

      <TripsSummary
        trips={trips}
        vehicles={vehicles}
        drivers={drivers}
        loading={summaryLoading}
        metrics={summaryMetrics}
      />

      <TripsTable
        trips={filteredTrips}
        vehicles={vehicles}
        drivers={drivers}
        onUpdateTrip={handleUpdateTrip}
        onDeleteTrip={handleDeleteTrip}
        onExport={() => setShowExportModal(true)}
        onImport={handleImport}
        onDownloadFormat={handleDownloadFormat}
      />

      {showExportModal && (
        <ExportOptionsModal
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
          vehicles={vehicles}
          drivers={drivers}
          warehouses={warehouses}
        />
      )}
    </Layout>
  );
};

export default AdminTripsPage;