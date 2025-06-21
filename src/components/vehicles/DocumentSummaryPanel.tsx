import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Truck, Calendar, FileText, Shield, Download, Printer as Print, Search, ChevronDown, ChevronUp, Clock, Info, BarChart2, Database, IndianRupee, Bell } from 'lucide-react';
import { Vehicle } from '../../types';
import { getVehicles } from '../../utils/storage';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { format, parseISO, isValid, isWithinInterval, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';

interface DocumentSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Types for document summary panel
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

// Updated MonthlyExpenditure interface to include separate properties for each document type
interface MonthlyExpenditure {
  month: string;
  rc: number;
  insurance: number;
  fitness: number;
  permit: number;
  puc: number;
  tax: number;
  other: number;
}

interface VehicleExpenditure {
  vehicle: string;
  amount: number;
}

// Metrics interface
interface DocumentMetrics {
  thisMonth: {
    totalExpense: number;
    expectedExpense: number; // New field for expected expense
    renewalsCount: number;
    lapsedCount: number;
  };
  thisYear: {
    totalExpense: number;
  };
}

// Define document type colors as requested
const DOC_TYPE_COLORS = {
  rc: '#757575', // Gray
  insurance: '#4B9CD3', // Blue
  fitness: '#A86BA1', // Purple
  permit: '#FFD54F', // Yellow
  puc: '#EF5350', // Red
  tax: '#66BB6A', // Green
  other: '#9E9E9E' // Light Gray
};

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
      return 'bg-error-100 border-error-200 text-error-800';
    case 'expiring':
      return 'bg-warning-100 border-warning-200 text-warning-800';
    case 'valid':
      return 'bg-success-100 border-success-200 text-success-800';
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
};

// Helper function to get the cost field name for a document type
const getCostFieldName = (docType: string): string => {
  switch(docType) {
    case 'insurance': return 'insurance_premium_amount';
    case 'fitness': return 'fitness_cost';
    case 'permit': return 'permit_cost';
    case 'puc': return 'puc_cost';
    case 'tax': return 'tax_amount';
    case 'rc': return 'rc_cost'; // This might not exist, will need a fallback
    default: return '';
  }
};

// Helper function to get the last renewal cost for a document type
const getLastRenewalCost = (vehicle: Vehicle, docType: string): number => {
  const costFieldName = getCostFieldName(docType);
  const cost = vehicle[costFieldName as keyof Vehicle];
  
  // Default costs for types that might not have specific fields
  if (docType === 'rc' && (!cost || typeof cost !== 'number')) return 2000; // Nominal RC cost
  
  return typeof cost === 'number' ? cost : 0;
};

// Helper function to get fleet average cost for a document type
const getFleetAverageCost = (docType: string, vehicles: Vehicle[]): number => {
  const costFieldName = getCostFieldName(docType);
  
  // Default values for each document type if no data is available
  const defaultCosts: Record<string, number> = {
    rc: 2000,
    insurance: 15000,
    fitness: 5000,
    permit: 8000,
    puc: 1000,
    tax: 10000,
    other: 3000
  };
  
  if (!vehicles || vehicles.length === 0) return defaultCosts[docType] || 3000;
  
  // Count vehicles with the specified cost and sum up those costs
  let sum = 0;
  let count = 0;
  
  for (const vehicle of vehicles) {
    const cost = vehicle[costFieldName as keyof Vehicle];
    if (typeof cost === 'number' && cost > 0) {
      sum += cost;
      count++;
    }
  }
  
  // Return the average or default if no vehicles have this cost
  return count > 0 ? sum / count : defaultCosts[docType] || 3000;
};

// Helper function to get inflation rate for document type
const getInflationRateForDocType = (docType: string): number => {
  switch(docType) {
    case 'insurance': return -0.075; // -7.5% (average between -5% and -10%)
    case 'fitness': return 0.05; // +5%
    case 'permit': return 0; // 0% (fixed)
    case 'puc': return 0.05; // +5%
    case 'tax': return 0.075; // +7.5% (average between +5% and +10%)
    case 'rc': return 0.05; // +5% for RC
    case 'other':
    default: return 0.08; // +8% general inflation
  }
};

// Check if a date is within the current month
const isWithinThisMonth = (dateString: string | null): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    
    return isWithinInterval(date, { start: startOfThisMonth, end: endOfThisMonth });
  } catch (error) {
    return false;
  }
};

const isWithinDateRange = (dateString: string | null, dateRange: { start: Date, end: Date }): boolean => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return isWithinInterval(date, dateRange);
  } catch (error) {
    return false;
  }
};

const DocumentSummaryPanel: React.FC<DocumentSummaryPanelProps> = ({ isOpen, onClose }) => {
  // State variables
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'>('thisMonth');
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
          const data = await getVehicles();
          setVehicles(Array.isArray(data) ? data : []);
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
          start: startOfYear(now),
          end: now
        };
      case 'lastYear': {
        const lastYear = subYears(now, 1);
        return {
          start: startOfYear(lastYear),
          end: endOfYear(lastYear)
        };
      }
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

  // Filter vehicles based on vehicle filter and search term
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Filter by vehicle id if selected
      if (vehicleFilter !== 'all' && vehicle.id !== vehicleFilter) {
        return false;
      }

      // Filter by search term if provided
      if (searchTerm && !vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [vehicles, vehicleFilter, searchTerm]);

  // Generate document matrix data from filtered vehicles
  const documentMatrix = useMemo((): VehicleDocuments[] => {
    return filteredVehicles.map(vehicle => ({
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
  }, [filteredVehicles]);

  // Generate metrics data based on filtered vehicles and date range
  const metrics = useMemo((): DocumentMetrics => {
    const result = {
      thisMonth: {
        totalExpense: 0,
        expectedExpense: 0,
        renewalsCount: 0,
        lapsedCount: 0
      },
      thisYear: {
        totalExpense: 0
      }
    };

    // Simulating document expenses (in a real app, this would come from the database)
    const monthlyExpense = (
      filteredVehicles.reduce((sum, vehicle) => {
        return sum + 
          (vehicle.insurance_premium_amount || 0) / 12 + 
          (vehicle.fitness_cost || 0) / 12 + 
          (vehicle.permit_cost || 0) / 12 + 
          (vehicle.puc_cost || 0) / 12 +
          (vehicle.tax_amount || 0) / 12;
      }, 0)
    );
    
    result.thisMonth.totalExpense = monthlyExpense;
    result.thisYear.totalExpense = monthlyExpense * 12;

    // Calculate expected expense for filtered vehicles within date range
    const today = new Date();
    const expiringDocsInRange = filteredVehicles.flatMap(vehicle => {
      const expiring = [];
      
      // Check if document expiry dates fall within the selected date range
      if (vehicle.insurance_expiry_date && isWithinDateRange(vehicle.insurance_expiry_date, effectiveDateRange)) {
        expiring.push({
          vehicleId: vehicle.id, 
          type: 'insurance',
          vehicle
        });
      }
      
      if (vehicle.fitness_expiry_date && isWithinDateRange(vehicle.fitness_expiry_date, effectiveDateRange)) {
        expiring.push({
          vehicleId: vehicle.id, 
          type: 'fitness',
          vehicle
        });
      }
      
      if (vehicle.permit_expiry_date && isWithinDateRange(vehicle.permit_expiry_date, effectiveDateRange)) {
        expiring.push({
          vehicleId: vehicle.id, 
          type: 'permit',
          vehicle
        });
      }
      
      if (vehicle.puc_expiry_date && isWithinDateRange(vehicle.puc_expiry_date, effectiveDateRange)) {
        expiring.push({
          vehicleId: vehicle.id, 
          type: 'puc',
          vehicle
        });
      }
      
      if (vehicle.tax_paid_upto && isWithinDateRange(vehicle.tax_paid_upto, effectiveDateRange)) {
        expiring.push({
          vehicleId: vehicle.id, 
          type: 'tax',
          vehicle
        });
      }
      
      if (vehicle.rc_expiry_date && isWithinDateRange(vehicle.rc_expiry_date, effectiveDateRange)) {
        expiring.push({
          vehicleId: vehicle.id, 
          type: 'rc',
          vehicle
        });
      }
      
      return expiring;
    });
    
    const expectedExpense = expiringDocsInRange.reduce((total, doc) => {
      let previousCost = getLastRenewalCost(doc.vehicle, doc.type);
      
      // If no specific cost found, use fleet average
      if (!previousCost) {
        previousCost = getFleetAverageCost(doc.type, filteredVehicles);
      }
      
      const inflationRate = getInflationRateForDocType(doc.type);
      const projectedCost = previousCost * (1 + inflationRate);
      
      return total + projectedCost;
    }, 0);
    
    result.thisMonth.expectedExpense = Math.round(expectedExpense);
    result.thisMonth.renewalsCount = expiringDocsInRange.length;
    
    // Count lapsed/expired documents for filtered vehicles
    const lapsedDocs = filteredVehicles.flatMap(vehicle => {
      const lapsed = [];
      
      const checkLapsed = (dateField: string | null, type: string) => {
        if (dateField && getExpiryStatus(dateField) === 'expired') {
          lapsed.push({ vehicleId: vehicle.id, type });
        }
      };
      
      checkLapsed(vehicle.rc_expiry_date, 'rc');
      checkLapsed(vehicle.insurance_expiry_date, 'insurance');
      checkLapsed(vehicle.fitness_expiry_date, 'fitness');
      checkLapsed(vehicle.permit_expiry_date, 'permit');
      checkLapsed(vehicle.puc_expiry_date, 'puc');
      checkLapsed(vehicle.tax_paid_upto, 'tax');
      
      return lapsed;
    });
    
    result.thisMonth.lapsedCount = lapsedDocs.length;

    return result;
  }, [filteredVehicles, effectiveDateRange]);

  // Generate monthly expenditure data for filtered vehicles
  const monthlyExpenditure = useMemo((): MonthlyExpenditure[] => {
    // In a real app, this data would come from the database with actual costs
    // For now, we'll generate data based on filtered vehicles
    
    const today = new Date();
    const months: MonthlyExpenditure[] = [];
    
    // Generate data for the last 8 months
    for (let i = 7; i >= 0; i--) {
      const month = subMonths(today, i);
      const monthName = format(month, 'MMM');
      
      // Simulate costs for this month based on filtered vehicles
      const baseMultiplier = filteredVehicles.length / Math.max(vehicles.length, 1);
      const randomFactor = 0.7 + Math.random() * 0.6; // Between 0.7 and 1.3
      
      // Create monthly data with randomized but realistic values for each document type
      const monthData: MonthlyExpenditure = {
        month: monthName,
        rc: Math.floor((Math.random() * 5000) + 1000) * baseMultiplier * randomFactor, 
        insurance: Math.floor((Math.random() * 30000) + 30000) * baseMultiplier * randomFactor,
        fitness: Math.floor((Math.random() * 5000) + 4000) * baseMultiplier * randomFactor,
        permit: Math.floor((Math.random() * 10000) + 5000) * baseMultiplier * randomFactor,
        puc: Math.floor((Math.random() * 2000) + 1000) * baseMultiplier * randomFactor,
        tax: Math.floor((Math.random() * 8000) + 2000) * baseMultiplier * randomFactor,
        other: Math.floor((Math.random() * 5000) + 1000) * baseMultiplier * randomFactor
      };
      
      months.push(monthData);
    }
    
    return months;
  }, [filteredVehicles, vehicles.length]);

  // Generate vehicle expenditure data for filtered vehicles
  const vehicleExpenditure = useMemo((): VehicleExpenditure[] => {
    return filteredVehicles.map(vehicle => {
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
  }, [filteredVehicles]);

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
              icon={<Print className="h-4 w-4" />}
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
              {/* Date Range Filter - Made Sticky */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 sticky top-0 z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Select
                      label="Date Range"
                      options={[
                        { value: 'thisMonth', label: 'This Month' },
                        { value: 'lastMonth', label: 'Last Month' },
                        { value: 'thisYear', label: 'This Year' },
                        { value: 'lastYear', label: 'Last Year' },
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
                      <p className="text-sm text-gray-500">Expected Doc Expense (Month)</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900" title="Based on expiring documents this month and their last renewal cost (adjusted for inflation)">
                        ₹{metrics.thisMonth.expectedExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Based on upcoming renewals with inflation
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
                      <p className="mt-1 text-2xl font-semibold text-success-600">
                        {metrics.thisMonth.renewalsCount}
                      </p>
                    </div>
                    <div className="bg-success-50 p-2 rounded-md">
                      <FileCheck className="h-5 w-5 text-success-600" />
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
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] sticky left-0 bg-gray-50 z-10">
                          Vehicle Number
                        </th>
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            RC Expiry
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Insurance
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Fitness Certificate
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Permit
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            PUC
                          </th>
                        )}
                        {(documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Tax
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documentMatrix.length > 0 ? (
                        documentMatrix.map((vehicle) => (
                          <tr key={vehicle.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100">
                              {vehicle.registration}
                            </td>
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                              <td className={`px-3 py-2 text-center ${getStatusColorClass(vehicle.documents.rc.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.rc.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.rc.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                              <td className={`px-3 py-2 text-center ${getStatusColorClass(vehicle.documents.insurance.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.insurance.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.insurance.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                              <td className={`px-3 py-2 text-center ${getStatusColorClass(vehicle.documents.fitness.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.fitness.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.fitness.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                              <td className={`px-3 py-2 text-center ${getStatusColorClass(vehicle.documents.permit.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.permit.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.permit.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                              <td className={`px-3 py-2 text-center ${getStatusColorClass(vehicle.documents.puc.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.puc.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.puc.status}</div>
                              </td>
                            )}
                            
                            {(documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                              <td className={`px-3 py-2 text-center ${getStatusColorClass(vehicle.documents.tax.status)}`}>
                                <div className="text-sm font-medium">{formatDate(vehicle.documents.tax.date)}</div>
                                <div className="text-xs mt-1 capitalize">{vehicle.documents.tax.status}</div>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
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
                    <AreaChart
                      data={monthlyExpenditure}
                      margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                      <defs>
                        <linearGradient id="rcGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.rc} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.rc} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="insuranceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.insurance} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.insurance} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="fitnessGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.fitness} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.fitness} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="permitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.permit} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.permit} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="pucGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.puc} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.puc} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="taxGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.tax} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.tax} stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="otherGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={DOC_TYPE_COLORS.other} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={DOC_TYPE_COLORS.other} stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`₹${value.toLocaleString('en-IN')}`, name]}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      />
                      <Area type="monotone" dataKey="rc" stackId="1" stroke={DOC_TYPE_COLORS.rc} fill="url(#rcGradient)" name="RC" />
                      <Area type="monotone" dataKey="insurance" stackId="1" stroke={DOC_TYPE_COLORS.insurance} fill="url(#insuranceGradient)" name="Insurance" />
                      <Area type="monotone" dataKey="fitness" stackId="1" stroke={DOC_TYPE_COLORS.fitness} fill="url(#fitnessGradient)" name="Fitness" />
                      <Area type="monotone" dataKey="permit" stackId="1" stroke={DOC_TYPE_COLORS.permit} fill="url(#permitGradient)" name="Permit" />
                      <Area type="monotone" dataKey="puc" stackId="1" stroke={DOC_TYPE_COLORS.puc} fill="url(#pucGradient)" name="PUC" />
                      <Area type="monotone" dataKey="tax" stackId="1" stroke={DOC_TYPE_COLORS.tax} fill="url(#taxGradient)" name="Tax" />
                      <Area type="monotone" dataKey="other" stackId="1" stroke={DOC_TYPE_COLORS.other} fill="url(#otherGradient)" name="Other" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend for document types */}
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.rc }}></span>
                    <span className="text-xs">RC</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.insurance }}></span>
                    <span className="text-xs">Insurance</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.fitness }}></span>
                    <span className="text-xs">Fitness</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.permit }}></span>
                    <span className="text-xs">Permit</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.puc }}></span>
                    <span className="text-xs">PUC</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.tax }}></span>
                    <span className="text-xs">Tax</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: DOC_TYPE_COLORS.other }}></span>
                    <span className="text-xs">Other</span>
                  </div>
                </div>
              </div>

              {/* Expenditure by Vehicle Chart */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-700">Expenditure by Vehicle</h3>
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