import React, { useState, useMemo } from 'react';
import { Trip, Vehicle, Driver } from '../../types';
import { ChevronDown, ChevronUp, Search, Filter, Download, Upload, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { format } from 'date-fns';

interface Column {
  id: string;
  label: string;
  accessor: (trip: Trip, vehicles: Vehicle[], drivers: Driver[]) => string | number;
  sortable?: boolean;
  editable?: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  description?: string;
}

interface TripsTableProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onUpdateTrip: (tripId: string, updates: Partial<Trip>) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onDownloadFormat: () => void;
}

const TripsTable: React.FC<TripsTableProps> = ({
  trips,
  vehicles,
  drivers,
  onUpdateTrip,
  onExport,
  onImport,
  onDownloadFormat
}) => {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'trip_serial_number',
      label: 'Trip ID',
      accessor: (trip) => trip.trip_serial_number,
      sortable: true,
      width: '120px',
      description: 'Unique identifier for the trip (e.g., T0001)'
    },
    {
      id: 'vehicle',
      label: 'Vehicle',
      accessor: (trip, vehicles) => 
        vehicles.find(v => v.id === trip.vehicle_id)?.registration_number || 'Unknown',
      sortable: true,
      editable: true,
      type: 'select',
      options: (vehicles || []).map(v => ({
        value: v.id,
        label: v.registration_number
      })),
      width: '150px',
      description: 'Vehicle registration number'
    },
    {
      id: 'driver',
      label: 'Driver',
      accessor: (trip, vehicles, drivers) => 
        drivers.find(d => d.id === trip.driver_id)?.name || 'Unknown',
      sortable: true,
      editable: true,
      type: 'select',
      options: drivers.map(d => ({
        value: d.id,
        label: d.name
      })),
      width: '150px',
      description: 'Driver name'
    },
    {
      id: 'start_date',
      label: 'Start Date',
      accessor: (trip) => format(new Date(trip.trip_start_date), 'dd/MM/yyyy'),
      sortable: true,
      editable: true,
      type: 'date',
      width: '120px',
      description: 'Trip start date (DD/MM/YYYY)'
    },
    {
      id: 'end_date',
      label: 'End Date',
      accessor: (trip) => format(new Date(trip.trip_end_date), 'dd/MM/yyyy'),
      sortable: true,
      editable: true,
      type: 'date',
      width: '120px',
      description: 'Trip end date (DD/MM/YYYY)'
    },
    {
      id: 'start_km',
      label: 'Start KM',
      accessor: (trip) => trip.start_km,
      sortable: true,
      editable: true,
      type: 'number',
      width: '120px',
      description: 'Starting odometer reading'
    },
    {
      id: 'end_km',
      label: 'End KM',
      accessor: (trip) => trip.end_km,
      sortable: true,
      editable: true,
      type: 'number',
      width: '120px',
      description: 'Ending odometer reading'
    },
    {
      id: 'distance',
      label: 'Distance (km)',
      accessor: (trip) => trip.end_km - trip.start_km,
      sortable: true,
      width: '120px',
      description: 'Total distance covered (calculated)'
    },
    {
      id: 'mileage',
      label: 'Mileage',
      accessor: (trip) => trip.calculated_kmpl?.toFixed(2) || '-',
      sortable: true,
      width: '100px',
      description: 'Fuel efficiency in km/L (calculated)'
    },
    {
      id: 'expenses',
      label: 'Total Expenses',
      accessor: (trip) => trip.total_road_expenses + (trip.total_fuel_cost || 0),
      sortable: true,
      width: '120px',
      description: 'Combined road and fuel expenses'
    }
  ]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [filters, setFilters] = useState<{
    search: string;
    vehicle: string;
    driver: string;
    dateRange: { start: string; end: string };
  }>({
    search: '',
    vehicle: '',
    driver: '',
    dateRange: { start: '', end: '' }
  });

  const [editingCell, setEditingCell] = useState<{
    tripId: string;
    columnId: string;
  } | null>(null);

  const sortedTrips = useMemo(() => {
    if (!sortConfig) return trips;

    return [...trips].sort((a, b) => {
      const column = columns.find(col => col.id === sortConfig.key);
      if (!column) return 0;

      const aValue = column.accessor(a, vehicles, drivers);
      const bValue = column.accessor(b, vehicles, drivers);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [trips, sortConfig, columns, vehicles, drivers]);

  const filteredTrips = useMemo(() => {
    return sortedTrips.filter(trip => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
        const driver = drivers.find(d => d.id === trip.driver_id);
        
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

      if (filters.vehicle && trip.vehicle_id !== filters.vehicle) {
        return false;
      }

      if (filters.driver && trip.driver_id !== filters.driver) {
        return false;
      }

      if (filters.dateRange.start && new Date(trip.trip_start_date) < new Date(filters.dateRange.start)) {
        return false;
      }
      if (filters.dateRange.end && new Date(trip.trip_end_date) > new Date(filters.dateRange.end)) {
        return false;
      }

      return true;
    });
  }, [sortedTrips, filters, vehicles, drivers]);

  const handleSort = (columnId: string) => {
    setSortConfig(current => {
      if (!current || current.key !== columnId) {
        return { key: columnId, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key: columnId, direction: 'desc' };
      }
      return null;
    });
  };

  const handleCellEdit = (tripId: string, columnId: string, value: any) => {
    const updates: Partial<Trip> = {};
    
    switch (columnId) {
      case 'vehicle':
        updates.vehicle_id = value;
        break;
      case 'driver':
        updates.driver_id = value;
        break;
      case 'start_date':
        updates.trip_start_date = value;
        break;
      case 'end_date':
        updates.trip_end_date = value;
        break;
      case 'start_km':
        updates.start_km = Number(value);
        break;
      case 'end_km':
        updates.end_km = Number(value);
        break;
    }

    onUpdateTrip(tripId, updates);
    setEditingCell(null);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search trips..."
            icon={<Search className="h-4 w-4" />}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        
        <Select
          options={[
            { value: '', label: 'All Vehicles' },
            ...(vehicles || []).map(v => ({
              value: v.id,
              label: v.registration_number
            }))
          ]}
          value={filters.vehicle}
          onChange={e => setFilters(f => ({ ...f, vehicle: e.target.value }))}
        />
        
        <Select
          options={[
            { value: '', label: 'All Drivers' },
            ...drivers.map(d => ({
              value: d.id,
              label: d.name
            }))
          ]}
          value={filters.driver}
          onChange={e => setFilters(f => ({ ...f, driver: e.target.value }))}
        />
        
        <Input
          type="date"
          value={filters.dateRange.start}
          onChange={e => setFilters(f => ({
            ...f,
            dateRange: { ...f.dateRange, start: e.target.value }
          }))}
        />
        
        <Input
          type="date"
          value={filters.dateRange.end}
          onChange={e => setFilters(f => ({
            ...f,
            dateRange: { ...f.dateRange, end: e.target.value }
          }))}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onDownloadFormat}
            icon={<FileText className="h-4 w-4" />}
          >
            Download Format
          </Button>

          <Button
            variant="outline"
            onClick={onExport}
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileImport}
              className="hidden"
              id="file-import"
              aria-label="Import trips file"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-import')?.click()}
              icon={<Upload className="h-4 w-4" />}
            >
              Import
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                <th
                  key={column.id}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.width ? `w-[${column.width}]` : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.id)}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && sortConfig?.key === column.id && (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTrips.map(trip => (
              <tr key={trip.id} className="hover:bg-gray-50">
                {columns.map(column => (
                  <td
                    key={`${trip.id}-${column.id}`}
                    className="px-6 py-4 whitespace-nowrap text-sm"
                    onClick={() => column.editable && setEditingCell({
                      tripId: trip.id,
                      columnId: column.id
                    })}
                  >
                    {editingCell?.tripId === trip.id && 
                     editingCell?.columnId === column.id ? (
                      column.type === 'select' ? (
                        <Select
                          options={column.options || []}
                          value={column.id === 'vehicle' ? trip.vehicle_id : trip.driver_id}
                          onChange={e => handleCellEdit(trip.id, column.id, e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <Input
                          type={column.type || 'text'}
                          value={column.accessor(trip, vehicles, drivers).toString()}
                          onChange={e => handleCellEdit(trip.id, column.id, e.target.value)}
                          autoFocus
                          onBlur={() => setEditingCell(null)}
                        />
                      )
                    ) : (
                      <span className={column.editable ? 'cursor-pointer' : ''}>
                        {column.accessor(trip, vehicles, drivers)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripsTable;
