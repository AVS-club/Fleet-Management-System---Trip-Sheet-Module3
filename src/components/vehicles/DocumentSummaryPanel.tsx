import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, IndianRupee, AlertCircle, FileCheck, ArrowLeft, ArrowRight, Download, Printer, Search } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../utils/supabaseClient';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Vehicle } from '../../types';

// Types for document summary panel
interface DocumentSummaryProps {
  isOpen: boolean;
  onClose: () => void;
}

// Document matrix interface
interface DocumentInfo {
  date: string | null;
  status: 'expired' | 'expiring' | 'valid' | 'missing';
}

interface VehicleDocuments {
  id: string;
  registration: string;
  documents: {
    rc: DocumentInfo;
    insurance: DocumentInfo;
    fitness: DocumentInfo;
    permit: DocumentInfo;
    puc: DocumentInfo;
    tax: DocumentInfo;
  };
}

// Expenditure interfaces
interface MonthlyExpenditure {
  month: string;
  rc: number;
  insurance: number;
  fitness: number;
  permit: number;
  puc: number;
  tax: number;
}

interface VehicleExpenditure {
  vehicle: string;
  amount: number;
}

// Metrics interface
interface DocumentMetrics {
  thisMonth: {
    totalExpense: number;
    renewalsCount: number;
    lapsedCount: number;
  };
  thisYear: {
    totalExpense: number;
  };
}

// Function to determine document status based on expiry date
const getExpiryStatus = (expiryDate: string | null): 'expired' | 'expiring' | 'valid' | 'missing' => {
  if (!expiryDate) return 'missing';
  
  const today = new Date();
  const expDate = new Date(expiryDate);
  const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'valid';
}

// Function to get color class based on document status
const getStatusColorClass = (status: string) => {
  switch(status) {
    case 'expired':
      return 'bg-error-100 text-error-800 border border-error-200';
    case 'expiring':
      return 'bg-warning-100 text-warning-800 border border-warning-200';
    case 'valid':
      return 'bg-success-100 text-success-800 border border-success-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

// Function to get bar color for expenditure charts
const getBarColor = (docType: string) => {
  switch(docType) {
    case 'rc': return '#4CAF50';
    case 'insurance': return '#2196F3';
    case 'fitness': return '#FFC107';
    case 'permit': return '#9C27B0';
    case 'puc': return '#F44336';
    case 'tax': return '#607D8B';
    default: return '#607D8B';
  }
};

const DocumentSummaryPanel: React.FC<DocumentSummaryProps> = ({ isOpen, onClose }) => {
  // State variables
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');

  // Initialize date ranges
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setCustomStartDate(firstDayOfMonth.toISOString().split('T')[0]);
    setCustomEndDate(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

  // Fetch vehicle data when the panel opens
  useEffect(() => {
    if (isOpen) {
      const fetchVehicles = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('registration_number');
            
          if (error) {
            throw error;
          }
          
          setVehicles(data || []);
        } catch (error) {
          console.error('Error fetching vehicles:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchVehicles();
    }
  }, [isOpen]);

  // Get effective date range based on the filter
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    
    switch (dateRange) {
      case 'thisMonth':
        return {
          start: startOfMonth(now),
          end: now
        };
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      }
      case 'thisYear':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: now
        };
      case 'custom':
        return {
          start: new Date(customStartDate || new Date().toISOString().split('T')[0]),
          end: new Date(customEndDate || new Date().toISOString().split('T')[0])
        };
      default:
        return {
          start: startOfMonth(now),
          end: now
        };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Generate document matrix data from vehicles
  const documentMatrix = useMemo((): VehicleDocuments[] => {
    return vehicles.filter(vehicle => 
      !searchTerm || 
      vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(vehicle => ({
      id: vehicle.id,
      registration: vehicle.registration_number,
      documents: {
        rc: {
          date: vehicle.rc_expiry_date || null,
          status: getExpiryStatus(vehicle.rc_expiry_date || null)
        },
        insurance: {
          date: vehicle.insurance_expiry_date || null,
          status: getExpiryStatus(vehicle.insurance_expiry_date || null)
        },
        fitness: {
          date: vehicle.fitness_expiry_date || null,
          status: getExpiryStatus(vehicle.fitness_expiry_date || null)
        },
        permit: {
          date: vehicle.permit_expiry_date || null,
          status: getExpiryStatus(vehicle.permit_expiry_date || null)
        },
        puc: {
          date: vehicle.puc_expiry_date || null,
          status: getExpiryStatus(vehicle.puc_expiry_date || null)
        },
        tax: {
          date: vehicle.tax_paid_upto || null,
          status: getExpiryStatus(vehicle.tax_paid_upto || null)
        }
      }
    }));
  }, [vehicles, searchTerm]);

  // Generate metrics data
  const metrics = useMemo((): DocumentMetrics => {
    const result = {
      thisMonth: {
        totalExpense: 0,
        renewalsCount: 0,
        lapsedCount: 0
      },
      thisYear: {
        totalExpense: 0
      }
    };

    // Simulating document expenses (in a real app, this would come from the database)
    vehicles.forEach(vehicle => {
      // Calculate this month's document expenses
      const monthlyExpense = (
        (vehicle.insurance_premium_amount || 0) + 
        (vehicle.fitness_cost || 0) + 
        (vehicle.permit_cost || 0) + 
        (vehicle.puc_cost || 0) +
        (vehicle.tax_amount || 0)
      ) / 12; // Rough monthly amortization
      
      result.thisMonth.totalExpense += monthlyExpense;
      result.thisYear.totalExpense += monthlyExpense * 12;

      // Count renewals (documents expiring in the current month)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      [
        vehicle.rc_expiry_date,
        vehicle.insurance_expiry_date,
        vehicle.fitness_expiry_date,
        vehicle.permit_expiry_date,
        vehicle.puc_expiry_date,
        vehicle.tax_paid_upto
      ].forEach(date => {
        if (date) {
          const expiryDate = new Date(date);
          if (expiryDate.getMonth() === currentMonth && expiryDate.getFullYear() === currentYear) {
            result.thisMonth.renewalsCount++;
          }
        }
      });

      // Count lapsed documents (already expired)
      [
        { date: vehicle.rc_expiry_date, status: getExpiryStatus(vehicle.rc_expiry_date || null) },
        { date: vehicle.insurance_expiry_date, status: getExpiryStatus(vehicle.insurance_expiry_date || null) },
        { date: vehicle.fitness_expiry_date, status: getExpiryStatus(vehicle.fitness_expiry_date || null) },
        { date: vehicle.permit_expiry_date, status: getExpiryStatus(vehicle.permit_expiry_date || null) },
        { date: vehicle.puc_expiry_date, status: getExpiryStatus(vehicle.puc_expiry_date || null) },
        { date: vehicle.tax_paid_upto, status: getExpiryStatus(vehicle.tax_paid_upto || null) }
      ].forEach(doc => {
        if (doc.status === 'expired') {
          result.thisMonth.lapsedCount++;
        }
      });
    });

    return result;
  }, [vehicles]);

  // Generate monthly expenditure data
  const monthlyExpenditure = useMemo((): MonthlyExpenditure[] => {
    // In a real app, this data would come from the database with actual costs
    // For now, we'll generate mock data based on the current date
    
    const today = new Date();
    const months: MonthlyExpenditure[] = [];
    
    // Generate data for the last 8 months
    for (let i = 7; i >= 0; i--) {
      const month = subMonths(today, i);
      const monthName = format(month, 'MMM');
      
      // Create monthly data with randomized but realistic values
      const monthData: MonthlyExpenditure = {
        month: monthName,
        rc: Math.floor(Math.random() * 15000),
        insurance: Math.floor(Math.random() * 30000) + 30000,
        fitness: Math.floor(Math.random() * 5000) + 4000,
        permit: Math.floor(Math.random() * 10000) + 5000,
        puc: Math.floor(Math.random() * 2000) + 1000,
        tax: Math.floor(Math.random() * 8000) + 2000
      };
      
      months.push(monthData);
    }
    
    return months;
  }, []);

  // Generate vehicle expenditure data
  const vehicleExpenditure = useMemo((): VehicleExpenditure[] => {
    return vehicles.map(vehicle => {
      // Calculate total document expenses for this vehicle
      const totalAmount = (
        (vehicle.insurance_premium_amount || 0) + 
        (vehicle.fitness_cost || 0) + 
        (vehicle.permit_cost || 0) + 
        (vehicle.puc_cost || 0) +
        (vehicle.tax_amount || 0)
      );
      
      return {
        vehicle: vehicle.registration_number,
        amount: totalAmount || Math.floor(Math.random() * 80000) + 20000 // Fallback to random amount if no data
      };
    }).sort((a, b) => b.amount - a.amount); // Sort by highest amount first
  }, [vehicles]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (error) {
      return '—';
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
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="ml-2 text-gray-600">Loading document data...</p>
            </div>
          ) : (
            <>
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
                        ...vehicles.map(v => ({ value: v.id, label: v.registration_number }))
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
                        ₹{metrics.thisMonth.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
                        ₹{metrics.thisYear.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
                        {metrics.thisMonth.renewalsCount}
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
                        {metrics.thisMonth.lapsedCount}
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
                        { value: 'puc', label: 'PUC Only' },
                        { value: 'tax', label: 'Tax Only' }
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
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            RC Expiry
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Insurance
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Fitness Certificate
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Permit
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            PUC
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Tax
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documentMatrix.length > 0 ? (
                        documentMatrix.map((vehicle) => (
                          <tr key={vehicle.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                              {vehicle.registration}
                            </td>
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                              <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.rc.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.rc.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.rc.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                              <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.insurance.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.insurance.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.insurance.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                              <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.fitness.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.fitness.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.fitness.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                              <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.permit.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.permit.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.permit.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                              <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.puc.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.puc.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.puc.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                              <td className={`px-4 py-3 text-center ${getStatusColorClass(vehicle.documents.tax.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.tax.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.tax.status}</div>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                            {searchTerm ? 'No vehicles found matching your search criteria' : 'No vehicle documents found'}
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
                      data={monthlyExpenditure}
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
                      <Bar dataKey="tax" stackId="a" name="Tax" fill={getBarColor('tax')} />
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
                      data={vehicleExpenditure}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `₹${value/1000}k`} />
                      <YAxis type="category" dataKey="vehicle" width={100} />
                      <Tooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Total Expense']} />
                      <Bar dataKey="amount" name="Amount">
                        {vehicleExpenditure.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 40}, 70%, 50%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend for document status */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="font-medium text-gray-700 mb-3">Document Status Legend</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-success-100 border border-success-200 mr-2"></div>
                    <span className="text-sm text-gray-600">Valid</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-warning-100 border border-warning-200 mr-2"></div>
                    <span className="text-sm text-gray-600">Expiring Soon (within 30 days)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-error-100 border border-error-200 mr-2"></div>
                    <span className="text-sm text-gray-600">Expired</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200 mr-2"></div>
                    <span className="text-sm text-gray-600">Missing/Not Available</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSummaryPanel;