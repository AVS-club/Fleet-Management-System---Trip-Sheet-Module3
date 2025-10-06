import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trip, Vehicle, Driver } from '@/types';
import { ChevronDown, ChevronUp, Trash2, IndianRupee } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { format } from 'date-fns';
import { NumberFormatter } from '@/utils/numberFormatter';

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
        accessor: trip => trip.trip_serial_number || '-',
        sortable: true,
        width: '120px',
        description: 'Unique identifier for the trip'
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
        width: '120px',
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
        width: '100px',
        description: 'Trip start date'
      },
      {
        id: 'end_date',
        label: 'End Date',
        accessor: trip => format(new Date(trip.trip_end_date), 'dd/MM/yyyy'),
        sortable: true,
        editable: true,
        type: 'date',
        width: '100px',
        description: 'Trip end date'
      },
      {
        id: 'start_km',
        label: 'Start KM',
        accessor: trip => trip.start_km || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Starting odometer reading'
      },
      {
        id: 'end_km',
        label: 'End KM',
        accessor: trip => trip.end_km || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Ending odometer reading'
      },
      {
        id: 'distance',
        label: 'Distance',
        accessor: trip => (trip.end_km || 0) - (trip.start_km || 0),
        sortable: true,
        width: '90px',
        description: 'Total distance covered'
      },
      {
        id: 'gross_weight',
        label: 'Weight (kg)',
        accessor: trip => trip.gross_weight || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Gross weight of cargo'
      },
      {
        id: 'fuel_quantity',
        label: 'Fuel (L)',
        accessor: trip => trip.fuel_quantity || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '80px',
        description: 'Fuel quantity in liters'
      },
      {
        id: 'fuel_rate',
        label: 'Fuel Rate',
        accessor: trip => trip.fuel_rate_per_liter || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Fuel rate per liter'
      },
      {
        id: 'total_fuel_cost',
        label: 'Fuel Cost',
        accessor: trip => trip.total_fuel_cost || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Total fuel cost'
      },
      {
        id: 'mileage',
        label: 'Mileage',
        accessor: trip => trip.calculated_kmpl ? NumberFormatter.display(trip.calculated_kmpl, 2) : '-',
        sortable: true,
        width: '80px',
        description: 'Fuel efficiency in km/L'
      },
      {
        id: 'road_expenses',
        label: 'Road Exp',
        accessor: trip => trip.total_road_expenses || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Road expenses'
      },
      {
        id: 'unloading_expense',
        label: 'Unloading',
        accessor: trip => trip.unloading_expense || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Unloading expense'
      },
      {
        id: 'driver_expense',
        label: 'Driver Exp',
        accessor: trip => trip.driver_expense || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Driver expense'
      },
      {
        id: 'rto_expense',
        label: 'RTO Exp',
        accessor: trip => trip.road_rto_expense || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '80px',
        description: 'RTO expense'
      },
      {
        id: 'breakdown_expense',
        label: 'Breakdown',
        accessor: trip => trip.breakdown_expense || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Breakdown expense'
      },
      {
        id: 'misc_expense',
        label: 'Misc Exp',
        accessor: trip => trip.miscellaneous_expense || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '80px',
        description: 'Miscellaneous expense'
      },
      {
        id: 'total_expenses',
        label: 'Total Exp',
        accessor: trip => {
          const fuel = trip.total_fuel_cost || 0;
          const road = trip.total_road_expenses || 0;
          const unloading = trip.unloading_expense || 0;
          const driver = trip.driver_expense || 0;
          const rto = trip.road_rto_expense || 0;
          const breakdown = trip.breakdown_expense || 0;
          const misc = trip.miscellaneous_expense || 0;
          const total = fuel + road + unloading + driver + rto + breakdown + misc;
          return NumberFormatter.roundUp(total, 2);
        },
        sortable: true,
        width: '90px',
        description: 'Total expenses'
      },
      {
        id: 'freight_rate',
        label: 'Freight Rate',
        accessor: trip => trip.freight_rate || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '100px',
        description: 'Freight rate'
      },
      {
        id: 'billing_type',
        label: 'Billing',
        accessor: trip => trip.billing_type || '-',
        sortable: true,
        editable: true,
        type: 'select',
        options: [
          { value: 'per_km', label: 'Per KM' },
          { value: 'per_ton', label: 'Per Ton' },
          { value: 'manual', label: 'Manual' }
        ],
        width: '80px',
        description: 'Billing type'
      },
      {
        id: 'income_amount',
        label: 'Income',
        accessor: trip => trip.income_amount || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Income amount'
      },
      {
        id: 'net_profit',
        label: 'Net Profit',
        accessor: trip => trip.net_profit || 0,
        sortable: true,
        width: '90px',
        description: 'Net profit or loss'
      },
      {
        id: 'profit_status',
        label: 'Status',
        accessor: trip => trip.profit_status || '-',
        sortable: true,
        width: '80px',
        description: 'Profit status'
      },
      {
        id: 'refueling_done',
        label: 'Refuel',
        accessor: trip => trip.refueling_done ? 'Yes' : 'No',
        sortable: true,
        editable: true,
        type: 'select',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ],
        width: '70px',
        description: 'Refueling done'
      },
      {
        id: 'is_return_trip',
        label: 'Return',
        accessor: trip => trip.is_return_trip ? 'Yes' : 'No',
        sortable: true,
        width: '70px',
        description: 'Return trip'
      },
      {
        id: 'route_deviation',
        label: 'Deviation',
        accessor: trip => trip.route_deviation || 0,
        sortable: true,
        width: '90px',
        description: 'Route deviation'
      },
      {
        id: 'advance_amount',
        label: 'Advance',
        accessor: trip => trip.advance_amount || 0,
        sortable: true,
        editable: true,
        type: 'number',
        width: '90px',
        description: 'Advance amount'
      },
      {
        id: 'remarks',
        label: 'Remarks',
        accessor: trip => trip.remarks || '-',
        sortable: true,
        editable: true,
        type: 'text',
        width: '150px',
        description: 'Trip remarks'
      }
    ],
    [vehicleOptions, driverOptions]
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
        <div 
          className="overflow-x-auto scroll-indicator" 
          ref={tableContainerRef}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e0 #f7fafc'
          }}
        >
          <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '2000px' }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {columns.map(column => (
                  <th
                    key={column.id}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    onClick={() => column.sortable && handleSort(column.id)}
                    style={{ 
                      cursor: column.sortable ? 'pointer' : 'default',
                      width: column.width,
                      minWidth: column.width
                    }}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="truncate">{column.label}</span>
                      {column.sortable && sortConfig?.key === column.id && (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                        )
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
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
                        className="px-3 py-2 whitespace-nowrap text-xs"
                        onClick={() => column.editable && setEditingCell({
                          tripId: trip.id,
                          columnId: column.id
                        })}
                        style={{ width: column.width, minWidth: column.width }}
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
                    <td className="px-3 py-2 whitespace-nowrap text-center w-20">
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
                  <td colSpan={columns.length + 1} className="px-3 py-10 text-center text-gray-500">
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
