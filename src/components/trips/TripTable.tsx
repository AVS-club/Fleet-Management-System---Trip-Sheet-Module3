import React, { useMemo, useState, useEffect } from 'react';
import { Trip, Vehicle, Driver, Warehouse } from '@/types';
import { format, parseISO } from 'date-fns';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Download, 
  Eye, Edit2, DollarSign, Copy
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { NumberFormatter } from '@/utils/numberFormatter';
import { getDestinationByAnyId } from '@/utils/storage';

interface TripTableProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  warehouses?: Warehouse[];
  onSelectTrip: (trip: Trip) => void;
  onPnlClick?: (e: React.MouseEvent, trip: Trip) => void;
  onEditTrip?: (trip: Trip) => void;
  highlightTripId?: string | null;
}

type SortField = 'serial' | 'date' | 'vehicle' | 'driver' | 'distance' | 'expense' | 'mileage';
type SortOrder = 'asc' | 'desc';

// Component to handle destination resolution for table display
const TripDestinationCell: React.FC<{ 
  trip: Trip; 
  destinationCache: Map<string, string>;
}> = ({ trip, destinationCache }) => {
  const [destinationNames, setDestinationNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveDestinations = async () => {
      if (!trip.destinations || trip.destinations.length === 0) {
        setDestinationNames([]);
        setLoading(false);
        return;
      }

      // Check which destination IDs are in cache vs missing
      const cachedNames: string[] = [];
      const missing: string[] = [];

      trip.destinations.forEach(id => {
        if (destinationCache.has(id)) {
          cachedNames.push(destinationCache.get(id)!);
        } else {
          missing.push(id);
        }
      });

      // If all destinations are cached, use them immediately
      if (missing.length === 0) {
        setDestinationNames(cachedNames);
        setLoading(false);
        return;
      }

      // Fetch any missing destinations
      try {
        const missingDestinations = await Promise.all(
          missing.map(async (id) => {
            try {
              const dest = await getDestinationByAnyId(id);
              return { id, name: dest ? dest.name : id };
            } catch (error) {
              console.warn(`Destination ${id} not found:`, error);
              return { id, name: id };
            }
          })
        );

        // Combine cached and fetched destinations
        const allNames = [...cachedNames];
        missingDestinations.forEach(({ name }) => {
          allNames.push(name);
        });

        setDestinationNames(allNames);
      } catch (error) {
        console.error('Error resolving missing destinations:', error);
        // Fallback to cached names + missing IDs
        setDestinationNames([...cachedNames, ...missing]);
      } finally {
        setLoading(false);
      }
    };

    resolveDestinations();
  }, [trip.destinations, destinationCache]);

  if (loading) {
    return <span className="text-gray-400 italic">Loading...</span>;
  }

  if (destinationNames.length === 0) {
    return <span className="text-gray-500">-</span>;
  }

  return (
    <span className="text-xs truncate" title={destinationNames.join(', ')}>
      {destinationNames.join(', ')}
    </span>
  );
};

const TripTable: React.FC<TripTableProps> = ({ 
  trips, 
  vehicles, 
  drivers,
  warehouses = [],
  onSelectTrip,
  onPnlClick,
  onEditTrip,
  highlightTripId
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [destinationCache, setDestinationCache] = useState<Map<string, string>>(new Map());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    select: 40,
    serial: 140,
    date: 100,
    vehicle: 120,
    driver: 150,
    start_km: 90,
    end_km: 90,
    distance: 90,
    mileage: 90,
    fuel: 80,
    expense: 100,
    destinations: 200,
    warehouse: 120,
    deviation: 90,
    actions: 100
  });

  // Create lookup maps
  const vehiclesMap = useMemo(() => 
    new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  
  const driversMap = useMemo(() => 
    new Map(drivers.map(d => [d.id, d])), [drivers]);
  
  const warehousesMap = useMemo(() => 
    new Map(warehouses.map(w => [w.id, w])), [warehouses]);

  // Extract unique destination IDs from all trips
  const uniqueDestinationIds = useMemo(() => {
    const ids = new Set<string>();
    trips.forEach(trip => {
      if (trip.destinations && trip.destinations.length > 0) {
        trip.destinations.forEach(id => ids.add(id));
      }
    });
    return Array.from(ids);
  }, [trips]);

  // Fetch destinations and populate cache
  useEffect(() => {
    const fetchDestinations = async () => {
      if (uniqueDestinationIds.length === 0) {
        setDestinationCache(new Map());
        return;
      }

      try {
        const newCache = new Map<string, string>();
        
        // Fetch all destinations in parallel
        const destinationPromises = uniqueDestinationIds.map(async (id) => {
          try {
            const dest = await getDestinationByAnyId(id);
            return { id, name: dest ? dest.name : id };
          } catch (error) {
            console.warn(`Destination ${id} not found:`, error);
            return { id, name: id }; // Fallback to ID if error
          }
        });

        const results = await Promise.all(destinationPromises);
        results.forEach(({ id, name }) => {
          newCache.set(id, name);
        });

        setDestinationCache(newCache);
      } catch (error) {
        console.error('Error fetching destinations:', error);
        // Fallback: create cache with IDs as names
        const fallbackCache = new Map<string, string>();
        uniqueDestinationIds.forEach(id => fallbackCache.set(id, id));
        setDestinationCache(fallbackCache);
      }
    };

    fetchDestinations();
  }, [uniqueDestinationIds]);

  // Sort trips
  const sortedTrips = useMemo(() => {
    const sorted = [...trips].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'serial':
          aVal = a.trip_serial_number || '';
          bVal = b.trip_serial_number || '';
          break;
        case 'date':
          aVal = new Date(a.trip_start_date || 0).getTime();
          bVal = new Date(b.trip_start_date || 0).getTime();
          break;
        case 'vehicle':
          aVal = vehiclesMap.get(a.vehicle_id)?.registration_number || '';
          bVal = vehiclesMap.get(b.vehicle_id)?.registration_number || '';
          break;
        case 'driver':
          aVal = driversMap.get(a.driver_id)?.name || '';
          bVal = driversMap.get(b.driver_id)?.name || '';
          break;
        case 'distance':
          aVal = a.total_distance || 0;
          bVal = b.total_distance || 0;
          break;
        case 'expense':
          aVal = a.total_expenses || 0;
          bVal = b.total_expenses || 0;
          break;
        case 'mileage':
          aVal = a.calculated_kmpl || 0;
          bVal = b.calculated_kmpl || 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  }, [trips, sortField, sortOrder, vehiclesMap, driversMap]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle row selection
  const handleSelectRow = (tripId: string, isShift: boolean = false) => {
    const newSelection = new Set(selectedRows);
    
    if (isShift && selectedRows.size > 0) {
      // Range selection
      const lastSelected = Array.from(selectedRows).pop();
      const lastIndex = sortedTrips.findIndex(t => t.id === lastSelected);
      const currentIndex = sortedTrips.findIndex(t => t.id === tripId);
      
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      
      for (let i = start; i <= end; i++) {
        newSelection.add(sortedTrips[i].id);
      }
    } else {
      // Toggle selection
      if (newSelection.has(tripId)) {
        newSelection.delete(tripId);
      } else {
        newSelection.add(tripId);
      }
    }
    
    setSelectedRows(newSelection);
  };

  // Select all/none
  const handleSelectAll = () => {
    if (selectedRows.size === sortedTrips.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedTrips.map(t => t.id)));
    }
  };

  // Copy selected to clipboard
  const handleCopySelected = () => {
    const selected = sortedTrips.filter(t => selectedRows.has(t.id));
    const data = selected.map(trip => {
      const vehicle = vehiclesMap.get(trip.vehicle_id);
      const driver = driversMap.get(trip.driver_id);
      return {
        'Serial': trip.trip_serial_number,
        'Date': format(parseISO(trip.trip_start_date || ''), 'dd/MM/yyyy'),
        'Vehicle': vehicle?.registration_number,
        'Driver': driver?.name,
        'Distance': trip.end_km && trip.start_km ? trip.end_km - trip.start_km : trip.total_distance,
        'Fuel': trip.fuel_quantity,
        'Expenses': trip.total_expenses,
        'Mileage': trip.calculated_kmpl
      };
    });
    
    const text = data.map(row => Object.values(row).join('\t')).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${selected.length} rows to clipboard`);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      // Resolve destination names for all trips
      const data = await Promise.all(sortedTrips.map(async trip => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        const driver = driversMap.get(trip.driver_id);
        const warehouse = warehousesMap.get(trip.warehouse_id);
        
        // Resolve destination names
        let destinationNames = '';
        if (trip.destinations && trip.destinations.length > 0) {
          try {
            const destinations = await Promise.all(
              trip.destinations.map(async (id) => {
                try {
                  const dest = await getDestinationByAnyId(id);
                  return dest ? dest.name : id;
                } catch (error) {
                  return id; // Fallback to ID if error
                }
              })
            );
            destinationNames = destinations.join(', ');
          } catch (error) {
            console.error('Error resolving destinations for export:', error);
            destinationNames = trip.destinations.join(', '); // Fallback to IDs
          }
        }
        
        return {
          'Trip Serial': trip.trip_serial_number,
          'Date': format(parseISO(trip.trip_start_date || ''), 'dd/MM/yyyy'),
          'Vehicle': vehicle?.registration_number,
          'Driver': driver?.name,
          'Start KM': trip.start_km,
          'End KM': trip.end_km,
          'Distance': trip.end_km && trip.start_km ? trip.end_km - trip.start_km : trip.total_distance,
          'Fuel (L)': trip.fuel_quantity,
          'Fuel Cost': trip.total_fuel_cost,
          'Total Expenses': trip.total_expenses,
          'Mileage (km/L)': trip.calculated_kmpl,
          'Destinations': destinationNames,
          'Warehouse': warehouse?.name,
          'Deviation %': trip.route_deviation
        };
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trips');
      XLSX.writeFile(wb, `trips_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      toast.success('Exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    }
  };

  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-primary-600" /> : 
      <ArrowDown className="h-3 w-3 text-primary-600" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedRows.size > 0 ? (
              <span className="font-medium">{selectedRows.size} selected</span>
            ) : (
              <span>{sortedTrips.length} trips</span>
            )}
          </span>
          
          {selectedRows.size > 0 && (
            <>
              <button
                onClick={handleCopySelected}
                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                title="Copy selected"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSelectedRows(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '600px' }}>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              {/* Select All */}
              <th className="px-2 py-2 text-center" style={{ width: columnWidths.select }}>
                <input
                  type="checkbox"
                  checked={selectedRows.size === sortedTrips.length && sortedTrips.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>

              {/* Serial */}
              <th 
                className="px-2 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.serial }}
                onClick={() => handleSort('serial')}
              >
                <div className="flex items-center gap-1">
                  Trip Serial
                  <SortIcon field="serial" />
                </div>
              </th>

              {/* Date */}
              <th 
                className="px-2 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.date }}
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon field="date" />
                </div>
              </th>

              {/* Vehicle */}
              <th 
                className="px-2 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.vehicle }}
                onClick={() => handleSort('vehicle')}
              >
                <div className="flex items-center gap-1">
                  Vehicle
                  <SortIcon field="vehicle" />
                </div>
              </th>

              {/* Driver */}
              <th 
                className="px-2 py-2 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.driver }}
                onClick={() => handleSort('driver')}
              >
                <div className="flex items-center gap-1">
                  Driver
                  <SortIcon field="driver" />
                </div>
              </th>

              {/* Start KM */}
              <th className="px-2 py-2 text-right font-medium text-gray-700" style={{ width: columnWidths.start_km }}>
                Start KM
              </th>

              {/* End KM */}
              <th className="px-2 py-2 text-right font-medium text-gray-700" style={{ width: columnWidths.end_km }}>
                End KM
              </th>

              {/* Distance */}
              <th 
                className="px-2 py-2 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.distance }}
                onClick={() => handleSort('distance')}
              >
                <div className="flex items-center justify-end gap-1">
                  Distance
                  <SortIcon field="distance" />
                </div>
              </th>

              {/* Mileage */}
              <th 
                className="px-2 py-2 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.mileage }}
                onClick={() => handleSort('mileage')}
              >
                <div className="flex items-center justify-end gap-1">
                  Mileage
                  <SortIcon field="mileage" />
                </div>
              </th>

              {/* Fuel */}
              <th className="px-2 py-2 text-right font-medium text-gray-700" style={{ width: columnWidths.fuel }}>
                Fuel (L)
              </th>

              {/* Expense */}
              <th 
                className="px-2 py-2 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                style={{ width: columnWidths.expense }}
                onClick={() => handleSort('expense')}
              >
                <div className="flex items-center justify-end gap-1">
                  Expenses
                  <SortIcon field="expense" />
                </div>
              </th>

              {/* Destinations */}
              <th className="px-2 py-2 text-left font-medium text-gray-700" style={{ width: columnWidths.destinations }}>
                Destinations
              </th>

              {/* Warehouse */}
              <th className="px-2 py-2 text-left font-medium text-gray-700" style={{ width: columnWidths.warehouse }}>
                Warehouse
              </th>

              {/* Deviation */}
              <th className="px-2 py-2 text-right font-medium text-gray-700" style={{ width: columnWidths.deviation }}>
                Deviation
              </th>

              {/* Actions */}
              <th className="px-2 py-2 text-center font-medium text-gray-700" style={{ width: columnWidths.actions }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {sortedTrips.map((trip) => {
              const vehicle = vehiclesMap.get(trip.vehicle_id);
              const driver = driversMap.get(trip.driver_id);
              const warehouse = warehousesMap.get(trip.warehouse_id);
              const isSelected = selectedRows.has(trip.id);
              const isHovered = hoveredRow === trip.id;
              const isHighlighted = highlightTripId === trip.id;
              
              return (
                <tr 
                  key={trip.id}
                  className={`
                    ${isHighlighted ? 'bg-blue-50 ring-2 ring-blue-500' : 
                      isSelected ? 'bg-primary-50' : 
                      isHovered ? 'bg-gray-50' : 'bg-white'}
                    hover:bg-gray-50 transition-colors cursor-pointer
                  `}
                  onMouseEnter={() => setHoveredRow(trip.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onSelectTrip(trip)}
                >
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectRow(trip.id, e.shiftKey);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300"
                    />
                  </td>

                  <td className="px-2 py-1.5 font-mono text-xs">
                    {trip.trip_serial_number}
                  </td>

                  <td className="px-2 py-1.5">
                    {trip.trip_start_date ? format(parseISO(trip.trip_start_date), 'dd/MM/yyyy') : '-'}
                  </td>

                  <td className="px-2 py-1.5 font-medium">
                    {vehicle?.registration_number || '-'}
                  </td>

                  <td className="px-2 py-1.5">
                    {driver?.name || '-'}
                  </td>

                  <td className="px-2 py-1.5 text-right font-mono">
                    {trip.start_km?.toLocaleString() || '-'}
                  </td>

                  <td className="px-2 py-1.5 text-right font-mono">
                    {trip.end_km?.toLocaleString() || '-'}
                  </td>

                  <td className="px-2 py-1.5 text-right font-mono">
                    {(() => {
                      const distance = trip.end_km && trip.start_km ? trip.end_km - trip.start_km : trip.total_distance;
                      return distance ? NumberFormatter.display(distance, 2) : '-';
                    })()}
                  </td>

                  <td className="px-2 py-1.5 text-right font-mono">
                    {trip.calculated_kmpl ? NumberFormatter.display(trip.calculated_kmpl, 2) : '-'}
                  </td>

                  <td className="px-2 py-1.5 text-right font-mono">
                    {trip.fuel_quantity ? NumberFormatter.display(trip.fuel_quantity, 2) : '-'}
                  </td>

                  <td className="px-2 py-1.5 text-right font-mono">
                    {trip.total_expenses ? NumberFormatter.currency(trip.total_expenses, false) : '-'}
                  </td>

                  <td className="px-2 py-1.5">
                    <TripDestinationCell trip={trip} destinationCache={destinationCache} />
                  </td>

                  <td className="px-2 py-1.5">
                    {warehouse?.name || '-'}
                  </td>

                  <td className={`px-2 py-1.5 text-right font-mono ${
                    trip.route_deviation && Math.abs(trip.route_deviation) > 8 ? 'text-red-600' : ''
                  }`}>
                    {trip.route_deviation ? `${trip.route_deviation > 0 ? '+' : ''}${trip.route_deviation.toFixed(1)}%` : '-'}
                  </td>

                  <td className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrip(trip);
                        }}
                        className="p-1 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      
                      {onEditTrip && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTrip(trip);
                          }}
                          className="p-1 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Edit Trip"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      
                      {onPnlClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPnlClick(e, trip);
                          }}
                          className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="P&L Analysis"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {sortedTrips.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                  No trips found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>Total Distance: <strong>{NumberFormatter.display(sortedTrips.reduce((sum, t) => sum + (t.total_distance || 0), 0), 2)} km</strong></span>
          <span>Total Fuel: <strong>{NumberFormatter.display(sortedTrips.reduce((sum, t) => sum + (t.fuel_quantity || 0), 0), 2)} L</strong></span>
          <span>Total Expenses: <strong>{NumberFormatter.currency(sortedTrips.reduce((sum, t) => sum + (t.total_expenses || 0), 0), false)}</strong></span>
        </div>
        
        <div>
          Avg Mileage: <strong>
            {NumberFormatter.display((sortedTrips.reduce((sum, t) => sum + (t.calculated_kmpl || 0), 0) / sortedTrips.length || 0), 2)} km/L
          </strong>
        </div>
      </div>
    </div>
  );
};

export default TripTable;