import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import TripsTable from '../../components/admin/TripsTable';
import TripsSummary from '../../components/admin/TripsSummary';
import ExportOptionsModal, { ExportOptions } from '../../components/admin/ExportOptionsModal';
import { Trip, Vehicle, Driver, Warehouse } from '../../types';
import { getTrips, getVehicles, getDrivers, getWarehouses, updateTrip } from '../../utils/storage';
import { generateCSV, downloadCSV, parseCSV } from '../../utils/csvParser';
import * as XLSX from 'xlsx';

const AdminTripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  // const [pageSize, setPageSize] = useState(50); // This state is not used by TripsTable, consider removing if not needed elsewhere.

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tripsData = await getTrips();
        const vehiclesData = await getVehicles();
        const driversData = await getDrivers();
        const warehousesData = await getWarehouses();
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setDrivers(driversData);
        setWarehouses(warehousesData);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Optionally, set some error state here to display to the user
      }
    };
    fetchData();
  }, []);

  const handleUpdateTrip = async (tripId: string, updates: Partial<Trip>) => {
    const updatedTrip = await updateTrip(tripId, updates);
    if (updatedTrip) {
      setTrips(prevTrips => 
        prevTrips.map(trip => 
          trip.id === tripId ? updatedTrip : trip
        )
      );
    }
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
        if (options.tripType === 'two_way') return trip.destinations.length > 1;
        return !trip.short_trip && trip.destinations.length === 1;
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
      // Process imported data and update trips
      console.log('Imported data:', data);
    } catch (error) {
      console.error('Error importing file:', error);
    }
  };

  return (
    <Layout
      title="Trip Management"
      subtitle="View and manage all trip records"
    >
      <TripsSummary
        trips={trips}
        vehicles={vehicles}
        drivers={drivers}
      />

      <TripsTable
        trips={trips}
        vehicles={vehicles}
        drivers={drivers}
        onUpdateTrip={handleUpdateTrip}
        onExport={() => setShowExportModal(true)}
        onImport={handleImport}
        onDownloadFormat={handleDownloadFormat}
        // pageSize={pageSize} // pageSize is not a prop of TripsTable
        // onPageSizeChange={setPageSize} // onPageSizeChange is not a prop of TripsTable
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
