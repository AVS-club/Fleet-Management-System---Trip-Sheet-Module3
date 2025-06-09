import React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { MaintenanceTask, Vehicle } from '../../types';
import { format } from 'date-fns';
import { ArrowUpDown, AlertTriangle, Download, FileText } from 'lucide-react';
import Button from '../ui/Button';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface MaintenanceTableProps {
  data: MaintenanceTask[];
  vehicles: Vehicle[] | null;
  onRowClick: (task: MaintenanceTask) => void;
}

const columnHelper = createColumnHelper<MaintenanceTask>();

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
  data,
  vehicles,
  onRowClick,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = [
    columnHelper.accessor(row => {
      const vehicle = Array.isArray(vehicles) ? vehicles.find(v => v.id === row.vehicle_id) : undefined;
      return vehicle?.registration_number || 'Unknown';
    }, {
      id: 'vehicle',
      header: 'Vehicle',
      cell: info => (
        <span className="font-medium text-gray-900">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor(row => row.task_type, {
      id: 'type',
      header: 'Type',
      cell: info => (
        <span className="text-gray-500 capitalize">
          {info.getValue().replace('_', ' ')}
        </span>
      ),
    }),
    columnHelper.accessor(row => row.status, {
      id: 'status',
      header: 'Status',
      cell: info => {
        const status = info.getValue();
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            status === 'resolved'
              ? 'bg-success-100 text-success-800'
              : status === 'escalated'
              ? 'bg-error-100 text-error-800'
              : status === 'in_progress'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        );
      },
    }),
    columnHelper.accessor(row => row.priority, {
      id: 'priority',
      header: 'Priority',
      cell: info => {
        const priority = info.getValue();
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            priority === 'critical'
              ? 'bg-error-100 text-error-800'
              : priority === 'high'
              ? 'bg-warning-100 text-warning-800'
              : priority === 'medium'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {priority.toUpperCase()}
          </span>
        );
      },
    }),
    columnHelper.accessor(row => row.start_date, {
      id: 'startDate',
      header: 'Start Date',
      cell: info => info.getValue() ? format(new Date(info.getValue()), 'dd MMM yyyy') : '-',
    }),
    columnHelper.accessor(row => {
      if (!row.start_date) return '-';
      
      if (!row.start_date) return '-';
      
      const startDate = new Date(row.start_date);
      const endDate = row.end_date ? new Date(row.end_date) : new Date();
      
      if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
        // Same day - show hours
        const hours = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
        return `${hours}h`;
      } else {
        // Different days - show days
        const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return `${days}d`;
      }
    }, {
      id: 'downtime',
      header: 'Downtime',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor(row => row.actual_cost || row.estimated_cost || 0, {
      id: 'cost',
      header: 'Cost',
      cell: info => (
        <span className="font-medium text-gray-900">
          ₹{info.getValue().toLocaleString()}
        </span>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExportCSV = () => {
    const exportData = Array.isArray(data) ? data.map(task => ({
      'Vehicle': Array.isArray(vehicles) ? vehicles.find(v => v.id === task.vehicle_id)?.registration_number || 'Unknown' : 'Unknown',
      'Type': task.task_type.replace('_', ' '),
      'Status': task.status.replace('_', ' ').toUpperCase(),
      'Priority': task.priority.toUpperCase(),
      'Start Date': task.start_date ? format(new Date(task.start_date), 'dd MMM yyyy') : '-',
      'End Date': task.end_date ? format(new Date(task.end_date), 'dd MMM yyyy') : '-',
      'Cost': `₹${(task.actual_cost || task.estimated_cost || 0).toLocaleString()}`,
      'Description': task.description || '-'
    })) : [];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Tasks');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'maintenance-tasks.xlsx');
  };

  return (
    <div>
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Maintenance Tasks</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="h-4 w-4" />}
          >
            Export Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.length > 0 ? (
              Array.isArray(table.getRowModel().rows) ? table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2 whitespace-nowrap text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )) : null
            ) : (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-8 text-center text-gray-500 bg-gray-50"
                >
                  <div className="flex flex-col items-center">
                    <AlertTriangle className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-gray-600 font-medium">No maintenance tasks found</p>
                    <p className="text-sm text-gray-500">Try adjusting your filters or add a new task</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaintenanceTable;