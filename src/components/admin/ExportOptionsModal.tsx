import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Vehicle, Driver, Warehouse } from '../../types';

interface ExportOptionsProps {
  onExport: (options: ExportOptions) => void;
  onClose: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  warehouses: Warehouse[];
}

export interface ExportOptions {
  dateRange: {
    start: string;
    end: string;
  };
  vehicleId?: string;
  driverId?: string;
  warehouseId?: string;
  tripType?: string;
  format: 'csv' | 'xlsx';
}

const ExportOptionsModal: React.FC<ExportOptionsProps> = ({
  onExport,
  onClose,
  vehicles,
  drivers,
  warehouses
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    dateRange: {
      start: '',
      end: ''
    },
    format: 'csv'
  });

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                aria-label="Close export options"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={options.dateRange.start}
                  onChange={e => setOptions({
                    ...options,
                    dateRange: { ...options.dateRange, start: e.target.value }
                  })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={options.dateRange.end}
                  onChange={e => setOptions({
                    ...options,
                    dateRange: { ...options.dateRange, end: e.target.value }
                  })}
                />
              </div>

              <Select
                label="Vehicle"
                options={[
                  { value: '', label: 'All Vehicles' },
                  ...vehicles.map(v => ({
                    value: v.id,
                    label: v.registration_number
                  }))
                ]}
                value={options.vehicleId || ''}
                onChange={e => setOptions({ ...options, vehicleId: e.target.value })}
              />

              <Select
                label="Driver"
                options={[
                  { value: '', label: 'All Drivers' },
                  ...drivers.map(d => ({
                    value: d.id,
                    label: d.name
                  }))
                ]}
                value={options.driverId || ''}
                onChange={e => setOptions({ ...options, driverId: e.target.value })}
              />

              <Select
                label="Source Warehouse"
                options={[
                  { value: '', label: 'All Warehouses' },
                  ...warehouses.map(w => ({
                    value: w.id,
                    label: w.name
                  }))
                ]}
                value={options.warehouseId || ''}
                onChange={e => setOptions({ ...options, warehouseId: e.target.value })}
              />

              <Select
                label="Trip Type"
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'one_way', label: 'One Way' },
                  { value: 'two_way', label: 'Two Way' },
                  { value: 'local', label: 'Local Trip' }
                ]}
                value={options.tripType || ''}
                onChange={e => setOptions({ ...options, tripType: e.target.value })}
              />

              <Select
                label="Export Format"
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'xlsx', label: 'Excel (XLSX)' }
                ]}
                value={options.format}
                onChange={e => setOptions({ ...options, format: e.target.value as 'csv' | 'xlsx' })}
              />
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleExport}
              icon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="mr-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportOptionsModal;
