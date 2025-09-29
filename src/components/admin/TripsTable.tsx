import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip, Vehicle, Driver } from '@/types';
import { ChevronDown, ChevronUp, Trash2, IndianRupee } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { format } from 'date-fns';

interface Column {
  id: string;
  label: string;
  accessor: (
    trip: Trip,
    vehiclesById: Record<string, Vehicle>,
    driversById: Record<string, Driver>
  ) => string | number;
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
  onDeleteTrip: (tripId: string) => Promise<void>;
}

const TripsTable: React.FC<TripsTableProps> = ({
  trips,
  vehicles,
  drivers,
  onUpdateTrip,
  onDeleteTrip
}) => {
  const vehiclesById = useMemo(() => {
    const map: Record<string, Vehicle> = {};
    (vehicles || []).forEach(v => {
      map[v.id] = v;
    });
    return map;
  }, [vehicles]);

  const driversById = useMemo(() => {
    const map: Record<string, Driver> = {};
    (drivers || []).forEach(d => {
      map[d.id] = d;
    });
    return map;
  }, [drivers]);

  const vehicleOptions = useMemo(
    () =>
      Object.values(vehiclesById).map(v => ({
        value: v.id,
        label: v.registration_number
      })),
    [vehiclesById]
  );

  const driverOptions = useMemo(
    () =>
      Object.values(driversById).map(d => ({
        value: d.id,
        label: d.name
      })),
    [driversById]
  );

  const columns: Column[] = useMemo(
    () => [
      {
        id: 'trip_serial_number',
        label: 'Trip ID',
        accessor: trip => trip.trip_serial_number,
        sortable: true,
        width: '120px',
        description: 'Unique identifier for the trip (e.g., T0001)'
      },
      {
        id: 'vehicle',
        label: 'Vehicle',
        accessor: (trip, vehiclesById) =>
          vehiclesById[trip.vehicle_id]?.registration_number || 'Unknown',
        sortable: true,
        editable: true,
        type: 'select',
        options: vehicleOptions,
        width: '150px',
        description: 'Vehicle registration number'
      },
      {
        id: 'driver',
        label: 'Driver',
        accessor: (trip, _vehiclesById, driversById) =>
          driversById[trip.driver_id]?.name || 'Unknown',
        sortable: true,
        editable: true,
        type: 'select',
        options: driverOptions,
        width: '150px',
        description: 'Driver name'
      },
      {
        id: 'start_date',
        label: 'Start Date',
        accessor: trip => format(new Date(trip.trip_start_date), 'dd/MM/yyyy'),
        sortable: true,
        editable: true,
        type: 'date',
        width: '120px',
        description: 'Trip start date (DD/MM/YYYY)'
      },
      {
        id: 'end_date',
        label: 'End Date',
        accessor: trip => format(new Date(trip.trip_end_date), 'dd/MM/yyyy'),
        sortable: true,
        editable: true,
        type: 'date',
        width: '120px',
        description: 'Trip end date (DD/MM/YYYY)'
      },
      {
        id: 'start_km',
        label: 'Start KM',
        accessor: trip => trip.start_km,
        sortable: true,
        editable: true,
        type: 'number',
        width: '120px',
        description: 'Starting odometer reading'
      },
      {
        id: 'end_km',
        label: 'End KM',
        accessor: trip => trip.end_km,
        sortable: true,
        editable: true,
        type: 'number',
        width: '120px',
        description: 'Ending odometer reading'
      },
      {
        id: 'distance',
        label: 'Distance (km)',
        accessor: trip => trip.end_km - trip.start_km,
        sortable: true,
        width: '120px',
        description: 'Total distance covered (calculated)'
      },
      {
        id: 'mileage',
        label: 'Mileage',
        accessor: trip => trip.calculated_kmpl?.toFixed(2) || '-',
        sortable: true,
        width: '100px',
        description: 'Fuel efficiency in km/L (calculated)'
      },
      {
        id: 'expenses',
        label: 'Total Expenses',
        accessor: trip => trip.total_road_expenses + (trip.total_fuel_cost || 0),
        sortable: true,
        width: '120px',
        description: 'Combined road and fuel expenses'
      },
      {
        id: 'profit_loss',
        label: 'Profit/Loss',
        accessor: trip => trip.net_profit || 0,
        sortable: true,
        width: '120px',
        description: 'Net profit or loss for the trip'
      }
    ],
    [vehicleOptions, driverOptions, vehiclesById, driversById]
  );

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const [editingCell, setEditingCell] = useState<{
    tripId: string;
    columnId: string;
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // Add ref for scrollable container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle scroll detection for indicator
  useEffect(() => {
    const handleScroll = () => {
      if (!tableContainerRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      
      // Check if scrolled at all
      if (scrollLeft > 0) {
        tableContainerRef.current.classList.add('scrolled-right');
      } else {
        tableContainerRef.current.classList.remove('scrolled-right');
      }
    };
    
    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const sortedTrips = useMemo(() => {
    if (!sortConfig) return trips;

    return [...trips].sort((a, b) => {
      const column = columns.find(col => col.id === sortConfig.key);
      if (!column) return 0;

      const aValue = column.accessor(a, vehiclesById, driversById);
      const bValue = column.accessor(b, vehiclesById, driversById);

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [trips, sortConfig, columns, vehiclesById, driversById]);

  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedTrips.slice(start, start + rowsPerPage);
  }, [sortedTrips, currentPage]);

  const totalPages = Math.ceil(sortedTrips.length / rowsPerPage) || 1;

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

  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this trip? This action cannot be undone.')) {
      await onDeleteTrip(tripId);
    }
  };

  // Function to get profit/loss cell style
  const getProfitLossStyle = (value: number) => {
    if (value > 0) return 'text-success-600 font-medium';
    if (value < 0) return 'text-error-600 font-medium';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto scroll-indicator" ref={tableContainerRef}>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTrips.length > 0 ? (
                paginatedTrips.map(trip => (
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
                              value={column.accessor(trip, vehiclesById, driversById).toString()}
                              onChange={e => handleCellEdit(trip.id, column.id, e.target.value)}
                              autoFocus
                              onBlur={() => setEditingCell(null)}
                            />
                          )
                        ) : column.id === 'profit_loss' ? (
                          <div className="flex items-center">
                            <IndianRupee className="h-4 w-4 mr-1 text-gray-400" />
                            <span className={getProfitLossStyle(trip.net_profit || 0)}>
                              {trip.net_profit ? trip.net_profit.toLocaleString() : '0'}
                            </span>
                          </div>
                        ) : (
                          <span className={column.editable ? 'cursor-pointer' : ''}>
                            {column.accessor(trip, vehiclesById, driversById)}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="text-error-600 hover:text-error-900"
                        title="Delete Trip"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-10 text-center text-gray-500">
                    No trips match your filter criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <div className="space-x-2">
            <Button
              variant="outline"
              inputSize="sm"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              inputSize="sm"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripsTable;