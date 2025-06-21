import React, { useState, useEffect } from 'react';
import { X, Calendar, IndianRupee, AlertCircle, FileCheck, ArrowLeft, ArrowRight, Download, Printer, Search } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Types for document summary panel
interface DocumentSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock data for the document summary panel
const mockMetricsData = {
  thisMonth: {
    totalExpense: 36810,
    renewalsCount: 5,
    lapsedCount: 2
  },
  thisYear: {
    totalExpense: 2549365
  }
};

const mockMonthlyExpenditure = [
  { month: 'Jan', rc: 12500, insurance: 45000, fitness: 6000, permit: 8500, puc: 2000 },
  { month: 'Feb', rc: 0, insurance: 35000, fitness: 4500, permit: 12000, puc: 1500 },
  { month: 'Mar', rc: 8500, insurance: 32000, fitness: 8000, permit: 7500, puc: 3000 },
  { month: 'Apr', rc: 0, insurance: 40000, fitness: 5500, permit: 0, puc: 2500 },
  { month: 'May', rc: 10000, insurance: 38000, fitness: 7000, permit: 15000, puc: 1000 },
  { month: 'Jun', rc: 6000, insurance: 42000, fitness: 4000, permit: 9000, puc: 2000 },
  { month: 'Jul', rc: 0, insurance: 39000, fitness: 5000, permit: 0, puc: 2500 },
  { month: 'Aug', rc: 15000, insurance: 50000, fitness: 7500, permit: 11000, puc: 1500 }
];

const mockVehicleExpenditure = [
  { vehicle: 'GJ03BW8184', amount: 125000 },
  { vehicle: 'MH04KL5678', amount: 98000 },
  { vehicle: 'MP09KV1123', amount: 86500 },
  { vehicle: 'MH12AB1234', amount: 67800 },
  { vehicle: 'GJ01CD5678', amount: 54200 },
  { vehicle: 'MP04EF9101', amount: 32100 },
  { vehicle: 'HR03GH1121', amount: 28700 }
];

// Mock data for the document matrix
const mockVehicles = [
  { 
    id: '1', 
    registration: 'GJ03BW8184', 
    documents: { 
      rc: { date: '2024-12-15', status: 'valid' },
      insurance: { date: '2024-09-03', status: 'expiring' },
      fitness: { date: '2024-07-30', status: 'expiring' },
      permit: { date: '2025-04-20', status: 'valid' },
      puc: { date: '2023-12-10', status: 'expired' }
    } 
  },
  { 
    id: '2', 
    registration: 'MH04KL5678', 
    documents: { 
      rc: { date: '2025-01-20', status: 'valid' },
      insurance: { date: '2024-11-25', status: 'valid' },
      fitness: { date: '2024-10-05', status: 'valid' },
      permit: { date: '2024-08-12', status: 'expiring' },
      puc: { date: '2024-07-18', status: 'expiring' }
    } 
  },
  { 
    id: '3', 
    registration: 'MP09KV1123', 
    documents: { 
      rc: { date: '2024-12-30', status: 'valid' },
      insurance: { date: '2023-11-02', status: 'expired' },
      fitness: { date: '2024-09-15', status: 'valid' },
      permit: { date: '2025-03-22', status: 'valid' },
      puc: { date: '2024-08-05', status: 'expiring' }
    } 
  },
  { 
    id: '4', 
    registration: 'MH12AB1234', 
    documents: { 
      rc: { date: '2025-02-18', status: 'valid' },
      insurance: { date: '2024-07-12', status: 'expired' },
      fitness: { date: '2024-08-30', status: 'expiring' },
      permit: { date: '2024-06-22', status: 'expired' },
      puc: { date: '2024-10-11', status: 'valid' }
    } 
  },
  { 
    id: '5', 
    registration: 'GJ01CD5678', 
    documents: { 
      rc: { date: '2024-11-05', status: 'valid' },
      insurance: { date: '2025-01-20', status: 'valid' },
      fitness: { date: '2024-08-14', status: 'expiring' },
      permit: { date: '2024-12-25', status: 'valid' },
      puc: { date: '2024-09-30', status: 'valid' }
    } 
  },
  { 
    id: '6', 
    registration: 'MP04EF9101', 
    documents: { 
      rc: { date: '2025-03-10', status: 'valid' },
      insurance: { date: '2024-08-05', status: 'expiring' },
      fitness: { date: '2024-07-22', status: 'expired' },
      permit: { date: '2025-02-15', status: 'valid' },
      puc: { date: '2024-07-18', status: 'expired' }
    } 
  },
  { 
    id: '7', 
    registration: 'HR03GH1121', 
    documents: { 
      rc: { date: '2024-10-12', status: 'valid' },
      insurance: { date: '2024-12-30', status: 'valid' },
      fitness: { date: '2024-11-18', status: 'valid' },
      permit: { date: '2025-04-05', status: 'valid' },
      puc: { date: '2024-08-22', status: 'expiring' }
    } 
  }
];

const DocumentSummaryPanel: React.FC<DocumentSummaryProps> = ({ isOpen, onClose }) => {
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');

  // Set initial custom date range
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setCustomStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setCustomEndDate(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

  // Filter vehicles based on search term
  const filteredVehicles = mockVehicles.filter(vehicle => 
    vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the status color class for document cells
  const getStatusColorClass = (status: string) => {
    switch(status) {
      case 'expired':
        return 'bg-error-100 text-error-800 border-error-200';
      case 'expiring':
        return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'valid':
        return 'bg-success-100 text-success-800 border-success-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Get bar color for expenditure charts
  const getBarColor = (docType: string) => {
    switch(docType) {
      case 'rc': return '#4CAF50';
      case 'insurance': return '#2196F3';
      case 'fitness': return '#FFC107';
      case 'permit': return '#9C27B0';
      case 'puc': return '#F44336';
      default: return '#607D8B';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 flex">
      <div className="relative w-full max-w-7xl mx-auto bg-white shadow-xl rounded-lg flex flex-col h-[calc(100vh-40px)] my-5">
        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileCheck className="mr-2 h-5 w-5 text-primary-600" />
            Vehicle Document Summary
          </h2>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              icon={<Printer className="h-4 w-4" />}
              title="Print Report"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              icon={<Download className="h-4 w-4" />}
              title="Export Data"
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Date Range Filter */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Select
                  label="Date Range"
                  options={[
                    { value: 'thisMonth', label: 'This Month' },
                    { value: 'lastMonth', label: 'Last Month' },
                    { value: 'thisYear', label: 'This Year' },
                    { value: 'custom', label: 'Custom Range' }
                  ]}
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                />
              </div>
              
              {dateRange === 'custom' && (
                <>
                  <div>
                    <Input
                      type="date"
                      label="Start Date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      label="End Date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <Select
                  label="Vehicle"
                  options={[
                    { value: 'all', label: 'All Vehicles' },
                    ...mockVehicles.map(v => ({ value: v.id, label: v.registration }))
                  ]}
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Doc Expense (Month)</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    ₹{mockMetricsData.thisMonth.totalExpense.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-primary-50 p-2 rounded-md">
                  <IndianRupee className="h-5 w-5 text-primary-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Doc Expense (Year)</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    ₹{mockMetricsData.thisYear.totalExpense.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-primary-50 p-2 rounded-md">
                  <Calendar className="h-5 w-5 text-primary-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Renewals This Month</p>
                  <p className="mt-1 text-2xl font-semibold text-primary-600">
                    {mockMetricsData.thisMonth.renewalsCount}
                  </p>
                </div>
                <div className="bg-primary-50 p-2 rounded-md">
                  <FileCheck className="h-5 w-5 text-primary-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Expired/Lapsed Docs</p>
                  <p className="mt-1 text-2xl font-semibold text-error-600">
                    {mockMetricsData.thisMonth.lapsedCount}
                  </p>
                </div>
                <div className="bg-error-50 p-2 rounded-md">
                  <AlertCircle className="h-5 w-5 text-error-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Matrix Table - Document Status */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-medium text-gray-700">Document Status Matrix</h3>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search vehicles..."
                  icon={<Search className="h-4 w-4" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-60"
                  size="sm"
                />
                <Select
                  options={[
                    { value: 'all', label: 'All Documents' },
                    { value: 'rc', label: 'RC Only' },
                    { value: 'insurance', label: 'Insurance Only' },
                    { value: 'fitness', label: 'Fitness Only' },
                    { value: 'permit', label: 'Permit Only' },
                    { value: 'puc', label: 'PUC Only' }
                  ]}
                  value={documentTypeFilter}
                  onChange={(e) => setDocumentTypeFilter(e.target.value)}
                  className="w-40"
                  size="sm"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] sticky left-0 bg-gray-50 z-10">
                      Vehicle Number
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                      RC Expiry
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                      Insurance
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                      Fitness Certificate
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                      Permit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                      PUC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                        {vehicle.registration}
                      </td>
                      <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.rc.status)}`}>
                        <div className="text-sm font-medium">{formatDate(vehicle.documents.rc.date)}</div>
                        <div className="text-xs mt-1 capitalize">{vehicle.documents.rc.status}</div>
                      </td>
                      <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.insurance.status)}`}>
                        <div className="text-sm font-medium">{formatDate(vehicle.documents.insurance.date)}</div>
                        <div className="text-xs mt-1 capitalize">{vehicle.documents.insurance.status}</div>
                      </td>
                      <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.fitness.status)}`}>
                        <div className="text-sm font-medium">{formatDate(vehicle.documents.fitness.date)}</div>
                        <div className="text-xs mt-1 capitalize">{vehicle.documents.fitness.status}</div>
                      </td>
                      <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.permit.status)}`}>
                        <div className="text-sm font-medium">{formatDate(vehicle.documents.permit.date)}</div>
                        <div className="text-xs mt-1 capitalize">{vehicle.documents.permit.status}</div>
                      </td>
                      <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.puc.status)}`}>
                        <div className="text-sm font-medium">{formatDate(vehicle.documents.puc.date)}</div>
                        <div className="text-xs mt-1 capitalize">{vehicle.documents.puc.status}</div>
                      </td>
                    </tr>
                  ))}

                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        No vehicles found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Expenditure Over Time Chart */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-700">Documentation Expenditure Over Time</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1 text-xs rounded-md ${
                    chartView === 'monthly' 
                      ? 'bg-primary-100 text-primary-700 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setChartView('yearly')}
                  className={`px-3 py-1 text-xs rounded-md ${
                    chartView === 'yearly' 
                      ? 'bg-primary-100 text-primary-700 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Yearly
                </button>
                <div className="flex">
                  <button className="p-1 rounded-l border border-gray-300 text-gray-600 hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button className="p-1 rounded-r border-t border-r border-b border-gray-300 text-gray-600 hover:bg-gray-100">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockMonthlyExpenditure}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip 
                    formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, '']}
                    itemSorter={(item: any) => -item.value}
                  />
                  <Bar dataKey="rc" stackId="a" name="RC" fill={getBarColor('rc')} />
                  <Bar dataKey="insurance" stackId="a" name="Insurance" fill={getBarColor('insurance')} />
                  <Bar dataKey="fitness" stackId="a" name="Fitness" fill={getBarColor('fitness')} />
                  <Bar dataKey="permit" stackId="a" name="Permit" fill={getBarColor('permit')} />
                  <Bar dataKey="puc" stackId="a" name="PUC" fill={getBarColor('puc')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenditure by Vehicle Chart */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-700">Documentation Expenditure by Vehicle</h3>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockVehicleExpenditure}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(value) => `₹${value/1000}k`} />
                  <YAxis type="category" dataKey="vehicle" width={100} />
                  <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Total Expense']} />
                  <Bar dataKey="amount" name="Amount">
                    {mockVehicleExpenditure.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSummaryPanel;