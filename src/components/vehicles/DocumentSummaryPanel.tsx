import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Truck, Calendar, FileText, Shield, Download, Printer as Print, Search, ChevronDown, ChevronUp, Clock, Info, BarChart2, Database, IndianRupee, Bell, FileCheck, AlertCircle, ArrowLeft, ArrowRight, RefreshCw, RotateCcw, CheckCircle, FileSpreadsheet, FileText as FileTextIcon, MinusCircle, AlertTriangle } from 'lucide-react';
// Import react-window with fallback
let FixedSizeList: any = null;
try {
  const reactWindow = require('react-window');
  FixedSizeList = reactWindow.FixedSizeList;
} catch (error) {
  console.warn('react-window not available, using fallback table rendering');
}
import { Vehicle } from '@/types';
import { getVehicles } from '../../utils/storage';
import { updateVehicle } from '../../utils/api/vehicles';
import { supabase } from '../../utils/supabaseClient';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useChallanInfo } from '../../hooks/useChallanInfo';
import { ChallanInfoModal } from '../ChallanInfoModal';
import { format, parseISO, isValid, isWithinInterval, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, differenceInMonths } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

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
  registrationDate: string | null;
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
};

// Smart caching for RC expiry calculation
const getCachedRCExpiry = (vehicleId: string, registrationDate: string | null): string | null => {
  if (!registrationDate) return null;
  
  const cacheKey = `rc_expiry_${vehicleId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const cachedDate = new Date(cached);
      if (!isNaN(cachedDate.getTime())) {
        return cachedDate.toISOString().split('T')[0];
      }
    } catch (error) {
      // Invalid cached data, recalculate
    }
  }
  
  const regDate = new Date(registrationDate);
  regDate.setFullYear(regDate.getFullYear() + 15);
  const expiryDate = regDate.toISOString().split('T')[0];
  
  // Cache the result
  localStorage.setItem(cacheKey, expiryDate);
  return expiryDate;
};

// Function to calculate RC Expiry (15 years from registration date) - now with caching
const calculateRCExpiry = (vehicleId: string, registrationDate: string | null): string | null => {
  return getCachedRCExpiry(vehicleId, registrationDate);
};

// Compact status icons
const StatusIcon = ({ status }: { status: string }) => {
  switch(status) {
    case 'valid': return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'expiring': return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    case 'expired': return <X className="w-3 h-3 text-red-500" />;
    default: return <MinusCircle className="w-3 h-3 text-gray-400" />;
  }
};

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

// Format short date for compact display
const formatShortDate = (dateString: string | null) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
  } catch (error) {
    return '—';
  }
};

// Hook for responsive column visibility
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
};

// Helper function to get the cost field name for a document type
const getCostFieldName = (docType: string): string => {
  switch(docType) {
    case 'insurance': return 'insurance_premium_amount';
    case 'fitness': return 'fitness_cost';
    case 'permit': return 'permit_cost';
    case 'puc': return 'puc_cost';
    case 'tax': return 'tax_amount';
    default: return '';
  }
};

// Helper function to get the last renewal cost for a document type
const getLastRenewalCost = (vehicle: Vehicle, docType: string): number => {
  const costFieldName = getCostFieldName(docType);
  
  if (!costFieldName) {
    // Handle RC and other types without specific cost fields
    if (docType === 'rc') return 2000; // Default RC cost
    return 3000; // Default other cost
  }
  
  const cost = vehicle[costFieldName as keyof Vehicle];
  
  if (!cost || typeof cost !== 'number' || cost <= 0) {
    // Default costs if no data available
    const defaults: Record<string, number> = {
      insurance: 15000,
      fitness: 5000,
      permit: 8000,
      puc: 1000,
      tax: 10000,
      rc: 2000
    };
    return defaults[docType] || 3000;
  }
  
  return cost;
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
  
  if (!vehicles || vehicles.length === 0) {
    return defaultCosts[docType] || 3000;
  }
  
  // If no cost field for this doc type, return default
  if (!costFieldName) {
    return defaultCosts[docType] || 3000;
  }

  // Count vehicles with the specified cost and sum up those costs
  let sum = 0;
  let count = 0;
  
  for (const vehicle of vehicles) {
    const cost = vehicle[costFieldName as keyof Vehicle];
    if (typeof cost === 'number' && !isNaN(cost) && cost > 0) {
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
  const [dateRange, setDateRange] = useState<'allTime' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'>('allTime');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');
  const contentRef = useRef<HTMLDivElement>(null);

  // Refresh functionality state
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{[key: string]: 'pending' | 'processing' | 'success' | 'error'}>({});
  
  // Challan functionality state
  const { fetchChallanInfo, loading: challanLoading } = useChallanInfo();
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [currentChallanData, setCurrentChallanData] = useState(null);
  const [challanRefreshProgress, setChallanRefreshProgress] = useState(0);
  const [isBulkChallanLoading, setIsBulkChallanLoading] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    charts: true
  });
  
  // Responsive column visibility
  const isSmallScreen = useMediaQuery('(max-width: 1024px)');
  const visibleColumns = isSmallScreen 
    ? ['vehicle', 'insurance', 'puc', 'rc_expiry']
    : ['vehicle', 'insurance', 'fitness', 'permit', 'puc', 'tax', 'rc_expiry'];
  
  // Toggle section visibility
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper function for individual vehicle refresh
  const refreshVehicleData = async (vehicle: Vehicle) => {
    try {
      // Set status to processing
      setRefreshProgress(prev => ({ ...prev, [vehicle.id!]: 'processing' }));

      const { data: result, error } = await supabase.functions.invoke('fetch-rc-details', {
        body: {
          registration_number: vehicle.registration_number,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch details');
      }

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch vehicle details');
      }

      // Extract the RC data from the response
      const rcData = result.data?.response || result.data || {};
      
      // Helper function to check if date is valid
      const isValidDate = (dateStr: string | undefined): boolean => {
        return dateStr !== undefined && dateStr !== '1900-01-01' && dateStr !== '';
      };

      // Prepare update payload with only the expiry dates - FIXED FIELD MAPPINGS
      const updatePayload: Partial<Vehicle> = {
        insurance_expiry_date: isValidDate(rcData.insurance_expiry) ? rcData.insurance_expiry : vehicle.insurance_expiry_date,
        tax_paid_upto: rcData.tax_upto === 'LTT' ? '2099-12-31' : (isValidDate(rcData.tax_upto) ? rcData.tax_upto : vehicle.tax_paid_upto),
        permit_expiry_date: isValidDate(rcData.permit_valid_upto) ? rcData.permit_valid_upto : vehicle.permit_expiry_date,
        puc_expiry_date: isValidDate(rcData.pucc_upto) ? rcData.pucc_upto : vehicle.puc_expiry_date,
        rc_expiry_date: isValidDate(rcData.rc_expiry) ? rcData.rc_expiry : vehicle.rc_expiry_date,
        fitness_expiry_date: isValidDate(rcData.fitness_upto) ? rcData.fitness_upto : vehicle.fitness_expiry_date,
        vahan_last_fetched_at: new Date().toISOString(),
      };

      // Update the vehicle in the database
      const updatedVehicle = await updateVehicle(vehicle.id!, updatePayload);

      // Update local state immediately for UI refresh
      if (updatedVehicle) {
        setVehicles(prevVehicles => 
          prevVehicles.map(v => 
            v.id === vehicle.id ? { ...v, ...updatePayload } : v
          )
        );
      }

      // Set status to success
      setRefreshProgress(prev => ({ ...prev, [vehicle.id!]: 'success' }));
      
      return true;
    } catch (error: any) {
      console.error(`Error refreshing vehicle ${vehicle.registration_number}:`, error);
      setRefreshProgress(prev => ({ ...prev, [vehicle.id!]: 'error' }));
      return false;
    }
  };

  // Batch refresh with rate limiting
  const batchRefreshDocuments = async (vehicleIds: string[]) => {
    const BATCH_SIZE = 5;
    const results = [];
    
    for (let i = 0; i < vehicleIds.length; i += BATCH_SIZE) {
      const batch = vehicleIds.slice(i, i + BATCH_SIZE);
      const promises = batch.map(id => {
        const vehicle = vehicles.find(v => v.id === id);
        return vehicle ? refreshVehicleData(vehicle) : Promise.resolve(false);
      });
      results.push(...await Promise.all(promises));
      
      // Rate limit to avoid overload
      if (i + BATCH_SIZE < vehicleIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return results;
  };

  // Bulk refresh handler with improved batch processing
  const handleBulkRefresh = async () => {
    setIsBulkRefreshing(true);
    setRefreshProgress({});
    
    let successCount = 0;
    let failureCount = 0;

    // Initialize all vehicles as pending
    const initialProgress = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id!] = 'pending';
      return acc;
    }, {} as {[key: string]: 'pending' | 'processing' | 'success' | 'error'});
    setRefreshProgress(initialProgress);

    // Process vehicles in batches
    const vehicleIds = vehicles.map(v => v.id!);
    const results = await batchRefreshDocuments(vehicleIds);
    
    successCount = results.filter(r => r === true).length;
    failureCount = results.filter(r => r === false).length;

    setIsBulkRefreshing(false);
    
    // Show completion message
    if (successCount > 0) {
      toast.success(`✅ ${successCount} vehicles updated successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}!`);
    } else {
      toast.error(`❌ All ${failureCount} vehicles failed to update`);
    }

    // Clear progress after 3 seconds
    setTimeout(() => {
      setRefreshProgress({});
    }, 3000);

    // Refresh the vehicle list
    const refreshedVehicles = await getVehicles();
    setVehicles(refreshedVehicles);
  };

  // Individual refresh handler for single vehicles
  const handleIndividualRefresh = async (vehicle: Vehicle) => {
    if (refreshProgress[vehicle.id!] === 'processing') return;

    const success = await refreshVehicleData(vehicle);
    
    if (success) {
      toast.success(`✅ ${vehicle.registration_number} updated successfully!`);
      // Refresh the vehicle list to show updated data
      const refreshedVehicles = await getVehicles();
      setVehicles(refreshedVehicles);
    } else {
      toast.error(`❌ Failed to update ${vehicle.registration_number}`);
    }

    // Clear individual progress after 2 seconds
    setTimeout(() => {
      setRefreshProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[vehicle.id!];
        return newProgress;
      });
    }, 2000);
  };

  // Challan functionality
  const handleChallanRefresh = async () => {
    const vehiclesToCheck = vehicles.map(v => ({
      registration_number: v.registration_number,
      chassis_no: v.chassis_no,
      engine_no: v.engine_no
    }));
    
    setIsBulkChallanLoading(true);
    setChallanRefreshProgress(0);
    const results = [];
    
    for (let i = 0; i < vehiclesToCheck.length; i++) {
      const result = await fetchChallanInfo(
        vehiclesToCheck[i].registration_number,
        vehiclesToCheck[i].chassis_no,
        vehiclesToCheck[i].engine_no
      );
      
      if (result) {
        results.push(result);
      }
      
      setChallanRefreshProgress(((i + 1) / vehiclesToCheck.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Combine all challans
    const allChallans = {
      vehicleId: 'All Vehicles',
      total: results.reduce((sum, r) => sum + r.total, 0),
      challans: results.flatMap(r => r.challans)
    };
    
    setCurrentChallanData(allChallans);
    setShowChallanModal(true);
    setIsBulkChallanLoading(false);
    setChallanRefreshProgress(0);
  };

  const handleIndividualChallan = async (vehicle: Vehicle) => {
    const result = await fetchChallanInfo(
      vehicle.registration_number,
      vehicle.chassis_no,
      vehicle.engine_no
    );
    
    if (result) {
      setCurrentChallanData(result);
      setShowChallanModal(true);
    }
  };

  // Initialize date ranges
  useEffect(() => {
    const today = new Date();
    setCustomStartDate('2020-01-01');
    setCustomEndDate(today.toISOString().split('T')[0]);
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
      case 'allTime':
        return {
          start: new Date('2020-01-01'),
          end: now
        };
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
  
  // Filter vehicles based on user selections
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Search filter
      if (searchTerm && vehicle.registration_number) {
        const searchLower = searchTerm.toLowerCase();
        if (!vehicle.registration_number.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Vehicle filter
      if (vehicleFilter !== 'all' && vehicle.id !== vehicleFilter) {
        return false;
      }

      return true;
    });
  }, [vehicles, vehicleFilter, searchTerm]);

  // Generate document matrix data from filtered vehicles
  const documentMatrix = useMemo((): VehicleDocuments[] => {
    return filteredVehicles.map(vehicle => {
      const calculatedRCExpiry = calculateRCExpiry(vehicle.id!, vehicle.registration_date);
      return {
        id: vehicle.id,
        registration: vehicle.registration_number,
        registrationDate: vehicle.registration_date,
        documents: {
          rc: {
            date: calculatedRCExpiry,
            status: getExpiryStatus(calculatedRCExpiry)
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
      };
    });
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

    // Calculate actual monthly expenses based on renewal dates
    const currentMonth = new Date();
    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);
    const yearStart = startOfYear(currentMonth);
    
    let monthlyExpense = 0;
    let yearlyExpense = 0;
    
    filteredVehicles.forEach(vehicle => {
      // Calculate monthly expense for documents expiring this month
      if (vehicle.insurance_expiry_date && isWithinInterval(new Date(vehicle.insurance_expiry_date), { start: currentMonthStart, end: currentMonthEnd })) {
        monthlyExpense += vehicle.insurance_premium_amount || 0;
      }
      if (vehicle.fitness_expiry_date && isWithinInterval(new Date(vehicle.fitness_expiry_date), { start: currentMonthStart, end: currentMonthEnd })) {
        monthlyExpense += vehicle.fitness_cost || 0;
      }
      if (vehicle.permit_expiry_date && isWithinInterval(new Date(vehicle.permit_expiry_date), { start: currentMonthStart, end: currentMonthEnd })) {
        monthlyExpense += vehicle.permit_cost || 0;
      }
      if (vehicle.puc_expiry_date && isWithinInterval(new Date(vehicle.puc_expiry_date), { start: currentMonthStart, end: currentMonthEnd })) {
        monthlyExpense += vehicle.puc_cost || 0;
      }
      if (vehicle.tax_paid_upto && isWithinInterval(new Date(vehicle.tax_paid_upto), { start: currentMonthStart, end: currentMonthEnd })) {
        monthlyExpense += vehicle.tax_amount || 0;
      }
      
      // Calculate yearly expense (actual renewals within this year)
      if (vehicle.insurance_expiry_date && isWithinInterval(new Date(vehicle.insurance_expiry_date), { start: yearStart, end: currentMonth })) {
        yearlyExpense += vehicle.insurance_premium_amount || 0;
      }
      if (vehicle.fitness_expiry_date && isWithinInterval(new Date(vehicle.fitness_expiry_date), { start: yearStart, end: currentMonth })) {
        yearlyExpense += vehicle.fitness_cost || 0;
      }
      if (vehicle.permit_expiry_date && isWithinInterval(new Date(vehicle.permit_expiry_date), { start: yearStart, end: currentMonth })) {
        yearlyExpense += vehicle.permit_cost || 0;
      }
      if (vehicle.puc_expiry_date && isWithinInterval(new Date(vehicle.puc_expiry_date), { start: yearStart, end: currentMonth })) {
        yearlyExpense += vehicle.puc_cost || 0;
      }
      if (vehicle.tax_paid_upto && isWithinInterval(new Date(vehicle.tax_paid_upto), { start: yearStart, end: currentMonth })) {
        yearlyExpense += vehicle.tax_amount || 0;
      }
    });
    
    result.thisMonth.totalExpense = monthlyExpense;
    result.thisYear.totalExpense = yearlyExpense;

    // Calculate expected expense for filtered vehicles within date range
    const today = new Date();
    const expiringDocsInRange = filteredVehicles.flatMap(vehicle => {
      const expiring = [];
      
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      // Check if document expiry dates fall within the next 30 days (more realistic for "this month")
      if (vehicle.insurance_expiry_date) {
        const expiryDate = new Date(vehicle.insurance_expiry_date);
        if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
          expiring.push({ vehicleId: vehicle.id, type: 'insurance', vehicle });
        }
      }
      
      if (vehicle.fitness_expiry_date) {
        const expiryDate = new Date(vehicle.fitness_expiry_date);
        if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
          expiring.push({ vehicleId: vehicle.id, type: 'fitness', vehicle });
        }
      }
      
      if (vehicle.permit_expiry_date) {
        const expiryDate = new Date(vehicle.permit_expiry_date);
        if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
          expiring.push({ vehicleId: vehicle.id, type: 'permit', vehicle });
        }
      }
      
      if (vehicle.puc_expiry_date) {
        const expiryDate = new Date(vehicle.puc_expiry_date);
        if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
          expiring.push({ vehicleId: vehicle.id, type: 'puc', vehicle });
        }
      }
      
      if (vehicle.tax_paid_upto) {
        const expiryDate = new Date(vehicle.tax_paid_upto);
        if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
          expiring.push({ vehicleId: vehicle.id, type: 'tax', vehicle });
        }
      }
      
      if (vehicle.rc_expiry_date) {
        const expiryDate = new Date(vehicle.rc_expiry_date);
        if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
          expiring.push({ vehicleId: vehicle.id, type: 'rc', vehicle });
        }
      }
      
      return expiring;
    });
    
    const expectedExpense = expiringDocsInRange.reduce((total, doc) => {
      let previousCost = getLastRenewalCost(doc.vehicle, doc.type);
      
      // If no specific cost found, use fleet average
      if (!previousCost || previousCost === 0) {
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

  // Generate monthly expenditure data for filtered vehicles based on actual renewal dates
  const monthlyExpenditure = useMemo((): MonthlyExpenditure[] => {
    const today = new Date();
    const months: MonthlyExpenditure[] = [];
    
    // Generate data for the last 12 months for better visibility
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(today, i);
      const monthName = format(month, 'MMM');
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      // Initialize monthly costs
      const monthData: MonthlyExpenditure = {
        month: monthName,
        rc: 0,
        insurance: 0,
        fitness: 0,
        permit: 0,
        puc: 0,
        tax: 0,
        other: 0
      };
      
      // Calculate actual costs based on document expiry dates
      filteredVehicles.forEach(vehicle => {
        // Check RC renewal
        if (vehicle.rc_expiry_date && isWithinInterval(new Date(vehicle.rc_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.rc += getLastRenewalCost(vehicle, 'rc');
        }
        
        // Check Insurance renewal
        if (vehicle.insurance_expiry_date && isWithinInterval(new Date(vehicle.insurance_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.insurance += vehicle.insurance_premium_amount || getFleetAverageCost('insurance', vehicles);
        }
        
        // Check Fitness renewal
        if (vehicle.fitness_expiry_date && isWithinInterval(new Date(vehicle.fitness_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.fitness += vehicle.fitness_cost || getFleetAverageCost('fitness', vehicles);
        }
        
        // Check Permit renewal
        if (vehicle.permit_expiry_date && isWithinInterval(new Date(vehicle.permit_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.permit += vehicle.permit_cost || getFleetAverageCost('permit', vehicles);
        }
        
        // Check PUC renewal (PUC is typically renewed every 6 months)
        if (vehicle.puc_expiry_date && isWithinInterval(new Date(vehicle.puc_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.puc += vehicle.puc_cost || getFleetAverageCost('puc', vehicles);
        }
        
        // Check Tax payment
        if (vehicle.tax_paid_upto && isWithinInterval(new Date(vehicle.tax_paid_upto), { start: monthStart, end: monthEnd })) {
          monthData.tax += vehicle.tax_amount || getFleetAverageCost('tax', vehicles);
        }
      });
      
      // Apply inflation adjustments for future months
      if (month > today) {
        const monthsInFuture = differenceInMonths(month, today);
        Object.keys(monthData).forEach(key => {
          if (key !== 'month') {
            const inflationRate = getInflationRateForDocType(key);
            monthData[key as keyof MonthlyExpenditure] *= Math.pow(1 + inflationRate/12, monthsInFuture);
          }
        });
      }
      
      months.push(monthData);
    }
    
    return months;
  }, [filteredVehicles, vehicles]);

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
        amount: totalAmount
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

  // Print functionality
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: 'Vehicle Document Summary',
    removeAfterPrint: true,
    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        #printable-content, #printable-content * {
          visibility: visible;
        }
        #printable-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
      }
    `
  });

  // Handle print button click with loading check
  const handlePrintClick = () => {
    if (loading) {
      alert('Please wait for the data to load before printing.');
      return;
    }
    
    if (!contentRef.current) {
      alert('Content is not ready for printing. Please try again in a moment.');
      return;
    }
    
    handlePrint();
  };

  // Download as PDF functionality
  const handleDownload = async () => {
    if (loading) {
      alert('Please wait for the data to load before downloading.');
      return;
    }
    
    if (!contentRef.current) return;
    
    try {
      const content = contentRef.current;
      const canvas = await html2canvas(content, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add subsequent pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('Vehicle_Document_Summary.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Export to Excel with all data
  const exportToExcel = () => {
    if (loading) {
      alert('Please wait for the data to load before exporting.');
      return;
    }

    try {
      const exportData = documentMatrix.map(vehicle => ({
        'Vehicle Number': vehicle.registration,
        'Registration Date': formatDate(vehicle.registrationDate),
        'Insurance Status': vehicle.documents.insurance.status,
        'Insurance Expiry': formatDate(vehicle.documents.insurance.date),
        'Fitness Status': vehicle.documents.fitness.status,
        'Fitness Expiry': formatDate(vehicle.documents.fitness.date),
        'Permit Status': vehicle.documents.permit.status,
        'Permit Expiry': formatDate(vehicle.documents.permit.date),
        'PUC Status': vehicle.documents.puc.status,
        'PUC Expiry': formatDate(vehicle.documents.puc.date),
        'Tax Status': vehicle.documents.tax.status,
        'Tax Expiry': formatDate(vehicle.documents.tax.date),
        'RC Expiry': formatDate(vehicle.documents.rc.date),
        'RC Status': vehicle.documents.rc.status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Documents');
      
      // Auto-size columns
      const cols = Object.keys(exportData[0]).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key]).length)) + 2
      }));
      ws['!cols'] = cols;
      
      XLSX.writeFile(wb, `Vehicle_Documents_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel file exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (loading) {
      alert('Please wait for the data to load before exporting.');
      return;
    }

    try {
      const headers = ['Vehicle Number', 'Registration Date', 'Insurance Status', 'Insurance Expiry', 
                      'Fitness Status', 'Fitness Expiry', 'Permit Status', 'Permit Expiry',
                      'PUC Status', 'PUC Expiry', 'Tax Status', 'Tax Expiry', 'RC Expiry', 'RC Status'];
      
      const rows = documentMatrix.map(vehicle => [
        vehicle.registration,
        formatDate(vehicle.registrationDate),
        vehicle.documents.insurance.status,
        formatDate(vehicle.documents.insurance.date),
        vehicle.documents.fitness.status,
        formatDate(vehicle.documents.fitness.date),
        vehicle.documents.permit.status,
        formatDate(vehicle.documents.permit.date),
        vehicle.documents.puc.status,
        formatDate(vehicle.documents.puc.date),
        vehicle.documents.tax.status,
        formatDate(vehicle.documents.tax.date),
        formatDate(vehicle.documents.rc.date),
        vehicle.documents.rc.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vehicle_Documents_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('CSV file exported successfully!');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export CSV file');
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
            {/* Challan Check Button */}
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handleChallanRefresh}
              disabled={isBulkChallanLoading || vehicles.length === 0}
              icon={<AlertTriangle className={`h-4 w-4 ${isBulkChallanLoading ? 'animate-spin' : ''}`} />}
              title="Check challans for all vehicles"
            >
              {isBulkChallanLoading ? `Checking... ${Math.round(challanRefreshProgress)}%` : 'Check Challans'}
              {vehicles.length > 0 && !isBulkChallanLoading && (
                <span className="ml-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                  {vehicles.length}
                </span>
              )}
            </Button>
            {/* Bulk Refresh Button - This is where your cursor pointed! */}
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handleBulkRefresh}
              disabled={isBulkRefreshing || vehicles.length === 0}
              icon={<RefreshCw className={`h-4 w-4 ${isBulkRefreshing ? 'animate-spin' : ''}`} />}
              title="Refresh all vehicle expiry data"
            >
              {isBulkRefreshing ? `Updating... ${Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length}/${vehicles.length}` : 'Refresh All Data'}
              {vehicles.length > 0 && !isBulkRefreshing && (
                <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {vehicles.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handlePrintClick}
              icon={<Print className="h-4 w-4" />}
              title="Print Report"
              disabled={loading || isBulkRefreshing}
            />
            <Button
              variant="outline"
              inputSize="sm"
              onClick={handleDownload}
              icon={<FileTextIcon className="h-4 w-4" />}
              title="Export as PDF"
              disabled={loading || isBulkRefreshing}
            />
            <Button
              variant="outline"
              inputSize="sm"
              onClick={exportToExcel}
              icon={<FileSpreadsheet className="h-4 w-4" />}
              title="Export as Excel"
              disabled={loading || isBulkRefreshing}
            />
            <Button
              variant="outline"
              inputSize="sm"
              onClick={exportToCSV}
              icon={<FileText className="h-4 w-4" />}
              title="Export as CSV"
              disabled={loading || isBulkRefreshing}
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

        {/* Bulk Refresh Progress Indicator */}
        {isBulkRefreshing && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-blue-800">
                    Refreshing Vehicle Data
                  </h3>
                  <div className="text-sm text-blue-600">
                    {Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length} of {vehicles.length} processed
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.round((Object.values(refreshProgress).filter(s => s === 'success' || s === 'error').length / vehicles.length) * 100)}%` 
                    }}
                  ></div>
                </div>
                
                <div className="mt-2 text-xs text-blue-700">
                  ✅ {Object.values(refreshProgress).filter(s => s === 'success').length} successful • 
                  ❌ {Object.values(refreshProgress).filter(s => s === 'error').length} failed • 
                  🔄 {Object.values(refreshProgress).filter(s => s === 'processing').length} processing • 
                  ⏳ {Object.values(refreshProgress).filter(s => s === 'pending').length} waiting
                </div>
                
                <p className="mt-1 text-xs text-blue-600">
                  You can close this panel and the refresh will continue in the background.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Challan Check Progress Indicator */}
        {isBulkChallanLoading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400 animate-spin" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Checking Challans
                  </h3>
                  <div className="text-sm text-yellow-600">
                    {Math.round(challanRefreshProgress)}% complete
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2 w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${challanRefreshProgress}%` 
                    }}
                  ></div>
                </div>
                
                <p className="mt-1 text-xs text-yellow-600">
                  Checking challan information for all vehicles. This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6" ref={contentRef} id="printable-content">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="ml-2 text-gray-600">Loading document data...</p>
            </div>
          ) : (
            <>
              {/* Date Range Filter - Made Sticky */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 sticky top-0 z-10 no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Select
                      label="Date Range"
                      options={[
                        { value: 'allTime', label: 'All Time' },
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

              {/* Compact Metrics Bar - Space Optimized */}
              <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex gap-6 text-sm">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4 text-primary-600" />
                    Monthly: <b>₹{metrics.thisMonth.expectedExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-primary-600" />
                    Yearly: <b>₹{metrics.thisYear.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</b>
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <FileCheck className="h-4 w-4" />
                    Renewals: <b>{metrics.thisMonth.renewalsCount}</b>
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Expired: <b>{metrics.thisMonth.lapsedCount}</b>
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSection('stats')}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title={expandedSections.stats ? 'Hide stats' : 'Show stats'}
                  >
                    {expandedSections.stats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Matrix Table - Document Status */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-medium text-gray-700 border-l-2 border-blue-500 pl-2">Document Status Matrix</h3>
                  <div className="flex items-center gap-3 no-print">
                    <Input
                      placeholder="Search vehicles..."
                      icon={<Search className="h-4 w-4" />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-60"
                      inputSize="sm"
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
                      inputSize="sm"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  {documentMatrix.length > 50 && FixedSizeList ? (
                    // Virtual scrolling for large datasets
                    <div className="h-96">
                      <FixedSizeList
                        height={384}
                        itemCount={documentMatrix.length}
                        itemSize={48}
                        width="100%"
                      >
                        {({ index, style }) => {
                          const vehicle = documentMatrix[index];
                          return (
                            <div style={style} className="flex items-center border-b border-gray-200 hover:bg-gray-50">
                              <div className="px-3 py-2 w-40 flex-shrink-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {vehicle.registration}
                                </div>
                                {vehicles.find(v => v.id === vehicle.id)?.vahan_last_fetched_at && (
                                  <div className="text-xs text-blue-600">
                                    {format(parseISO(vehicles.find(v => v.id === vehicle.id)!.vahan_last_fetched_at!), 'MMM d, HH:mm')}
                                  </div>
                                )}
                              </div>
                              
                              {visibleColumns.includes('insurance') && (documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                                <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.insurance.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.insurance.date)}>
                                      {formatShortDate(vehicle.documents.insurance.date)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {visibleColumns.includes('fitness') && (documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                                <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.fitness.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.fitness.date)}>
                                      {formatShortDate(vehicle.documents.fitness.date)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {visibleColumns.includes('permit') && (documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                                <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.permit.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.permit.date)}>
                                      {formatShortDate(vehicle.documents.permit.date)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {visibleColumns.includes('puc') && (documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                                <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.puc.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.puc.date)}>
                                      {formatShortDate(vehicle.documents.puc.date)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {visibleColumns.includes('tax') && (documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                                <div className="px-2 py-2 w-24 flex-shrink-0 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.tax.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.tax.date)}>
                                      {formatShortDate(vehicle.documents.tax.date)}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {visibleColumns.includes('rc_expiry') && (documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                                <div className="px-2 py-2 w-24 flex-shrink-0 text-center bg-blue-50">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.rc.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.rc.date)}>
                                      {formatShortDate(vehicle.documents.rc.date)}
                                    </span>
                                  </div>
                                  {vehicle.registrationDate && (
                                    <div className="text-xs text-gray-400">
                                      (15y)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      </FixedSizeList>
                    </div>
                  ) : (
                    // Regular table for smaller datasets
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] sticky left-0 bg-gray-50 z-10">
                            Vehicle Number
                          </th>
                          {visibleColumns.includes('insurance') && (documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                              Insurance
                            </th>
                          )}
                          {visibleColumns.includes('fitness') && (documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                              Fitness
                            </th>
                          )}
                          {visibleColumns.includes('permit') && (documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                              Permit
                            </th>
                          )}
                          {visibleColumns.includes('puc') && (documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                              PUC
                            </th>
                          )}
                          {visibleColumns.includes('tax') && (documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                              Tax
                            </th>
                          )}
                          {visibleColumns.includes('rc_expiry') && (documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-blue-50">
                              RC Expiry
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {documentMatrix.length > 0 ? (
                          documentMatrix.map((vehicle) => (
                            <tr key={vehicle.id} className="hover:bg-gray-50">
                              {/* Enhanced Vehicle Number Cell with Refresh Button */}
                              <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100">
                                <div className="flex items-center justify-between group">
                                  {/* Vehicle Info */}
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {vehicle.registration}
                                    </div>
                                    {/* Show last updated info if available */}
                                    {vehicles.find(v => v.id === vehicle.id)?.vahan_last_fetched_at && (
                                      <div className="text-xs text-blue-600 mt-1">
                                        Updated: {format(parseISO(vehicles.find(v => v.id === vehicle.id)!.vahan_last_fetched_at!), 'MMM d, HH:mm')}
                                      </div>
                                    )}
                                    
                                    {/* Show refresh status */}
                                    {refreshProgress[vehicle.id] && (
                                      <div className={`text-xs mt-1 ${
                                        refreshProgress[vehicle.id] === 'success' ? 'text-green-600' :
                                        refreshProgress[vehicle.id] === 'error' ? 'text-red-600' :
                                        refreshProgress[vehicle.id] === 'processing' ? 'text-blue-600' :
                                        'text-gray-500'
                                      }`}>
                                        {refreshProgress[vehicle.id] === 'pending' && '⏳ Queued'}
                                        {refreshProgress[vehicle.id] === 'processing' && '🔄 Updating...'}
                                        {refreshProgress[vehicle.id] === 'success' && '✅ Updated'}
                                        {refreshProgress[vehicle.id] === 'error' && '❌ Failed'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-1">
                                    {/* Individual Challan Check Button */}
                                    <button
                                      onClick={() => handleIndividualChallan(vehicles.find(v => v.id === vehicle.id)!)}
                                      disabled={isBulkChallanLoading || challanLoading}
                                      className="
                                        p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100
                                        focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1
                                        hover:bg-yellow-50 text-gray-500 hover:text-yellow-600
                                        disabled:cursor-not-allowed disabled:opacity-50
                                      "
                                      title={`Check challans for ${vehicle.registration}`}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                    </button>
                                    
                                    {/* Individual Refresh Button */}
                                    <button
                                      onClick={() => handleIndividualRefresh(vehicles.find(v => v.id === vehicle.id)!)}
                                      disabled={isBulkRefreshing || refreshProgress[vehicle.id] === 'processing'}
                                      className={`
                                        p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100
                                        focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                                        ${refreshProgress[vehicle.id] === 'processing' ? 'opacity-100' : ''}
                                        ${refreshProgress[vehicle.id] === 'success' ? 'bg-green-50 text-green-600 opacity-100' :
                                          refreshProgress[vehicle.id] === 'error' ? 'bg-red-50 text-red-600 opacity-100' :
                                          'hover:bg-gray-100 text-gray-500 hover:text-blue-600'}
                                        ${isBulkRefreshing || refreshProgress[vehicle.id] === 'processing' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                      `}
                                      title={`Refresh ${vehicle.registration} data`}
                                    >
                                      {refreshProgress[vehicle.id] === 'processing' ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : refreshProgress[vehicle.id] === 'success' ? (
                                        <CheckCircle className="h-3 w-3" />
                                      ) : refreshProgress[vehicle.id] === 'error' ? (
                                        <AlertCircle className="h-3 w-3" />
                                      ) : (
                                        <RotateCcw className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </td>
                              
                              {visibleColumns.includes('insurance') && (documentTypeFilter === 'all' || documentTypeFilter === 'insurance') && (
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.insurance.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.insurance.date)}>
                                      {formatShortDate(vehicle.documents.insurance.date)}
                                    </span>
                                  </div>
                                </td>
                              )}
                              
                              {visibleColumns.includes('fitness') && (documentTypeFilter === 'all' || documentTypeFilter === 'fitness') && (
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.fitness.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.fitness.date)}>
                                      {formatShortDate(vehicle.documents.fitness.date)}
                                    </span>
                                  </div>
                                </td>
                              )}
                              
                              {visibleColumns.includes('permit') && (documentTypeFilter === 'all' || documentTypeFilter === 'permit') && (
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.permit.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.permit.date)}>
                                      {formatShortDate(vehicle.documents.permit.date)}
                                    </span>
                                  </div>
                                </td>
                              )}
                              
                              {visibleColumns.includes('puc') && (documentTypeFilter === 'all' || documentTypeFilter === 'puc') && (
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.puc.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.puc.date)}>
                                      {formatShortDate(vehicle.documents.puc.date)}
                                    </span>
                                  </div>
                                </td>
                              )}
                              
                              {visibleColumns.includes('tax') && (documentTypeFilter === 'all' || documentTypeFilter === 'tax') && (
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.tax.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.tax.date)}>
                                      {formatShortDate(vehicle.documents.tax.date)}
                                    </span>
                                  </div>
                                </td>
                              )}
                              
                              {visibleColumns.includes('rc_expiry') && (documentTypeFilter === 'all' || documentTypeFilter === 'rc') && (
                                <td className="px-2 py-2 text-center bg-blue-50">
                                  <div className="flex items-center justify-center gap-1">
                                    <StatusIcon status={vehicle.documents.rc.status} />
                                    <span className="text-xs" title={formatDate(vehicle.documents.rc.date)}>
                                      {formatShortDate(vehicle.documents.rc.date)}
                                    </span>
                                  </div>
                                  {vehicle.registrationDate && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      (15y)
                                    </div>
                                  )}
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
                  )}
                </div>
              </div>
              
              {/* Expenditure Over Time Chart - Collapsible */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-lg">Documentation Expenditure Over Time</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2 no-print">
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
                    </div>
                    <button
                      onClick={() => toggleSection('charts')}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      title={expandedSections.charts ? 'Hide charts' : 'Show charts'}
                    >
                      {expandedSections.charts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                {expandedSections.charts && (
                  <div className="p-6">
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyExpenditure}
                      margin={{ top: 20, right: 30, left: 50, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tickFormatter={(value) => {
                          if (value === 0) return '₹0';
                          if (value >= 100000) return `₹${(value/100000).toFixed(1)}L`;
                          if (value >= 1000) return `₹${(value/1000).toFixed(0)}k`;
                          return `₹${value}`;
                        }} 
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          const formattedValue = Number(value).toLocaleString('en-IN', { 
                            style: 'currency', 
                            currency: 'INR',
                            maximumFractionDigits: 0 
                          });
                          return [formattedValue, name];
                        }}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '0.5rem',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                      />
                      <Bar dataKey="rc" stackId="a" fill={DOC_TYPE_COLORS.rc} name="RC" />
                      <Bar dataKey="insurance" stackId="a" fill={DOC_TYPE_COLORS.insurance} name="Insurance" />
                      <Bar dataKey="fitness" stackId="a" fill={DOC_TYPE_COLORS.fitness} name="Fitness" />
                      <Bar dataKey="permit" stackId="a" fill={DOC_TYPE_COLORS.permit} name="Permit" />
                      <Bar dataKey="puc" stackId="a" fill={DOC_TYPE_COLORS.puc} name="PUC" />
                      <Bar dataKey="tax" stackId="a" fill={DOC_TYPE_COLORS.tax} name="Tax" />
                      <Bar dataKey="other" stackId="a" fill={DOC_TYPE_COLORS.other} name="Other" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Summary Stats for the Chart */}
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Total (12 months)</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{monthlyExpenditure.reduce((sum, month) => 
                        sum + month.rc + month.insurance + month.fitness + month.permit + month.puc + month.tax + month.other, 0
                      ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Average/Month</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{(monthlyExpenditure.reduce((sum, month) => 
                        sum + month.rc + month.insurance + month.fitness + month.permit + month.puc + month.tax + month.other, 0
                      ) / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Peak Month</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const maxMonth = monthlyExpenditure.reduce((max, month) => {
                          const monthTotal = month.rc + month.insurance + month.fitness + month.permit + month.puc + month.tax + month.other;
                          const maxTotal = max.rc + max.insurance + max.fitness + max.permit + max.puc + max.tax + max.other;
                          return monthTotal > maxTotal ? month : max;
                        });
                        return maxMonth.month;
                      })()}
                    </p>
                  </div>
                </div>
                  </div>
                )}
              </div>

              {/* Expenditure by Vehicle Chart */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg">Documentation Cost by Vehicle</h3>
                </div>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={vehicleExpenditure}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                      <XAxis
                        type="number" 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="category" 
                        dataKey="vehicle" 
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tick={{ fontSize: 10 }}
                      />
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
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 border-l-2 border-blue-500 pl-2">
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

      {/* Challan Info Modal */}
      <ChallanInfoModal
        isOpen={showChallanModal}
        onClose={() => setShowChallanModal(false)}
        challanData={currentChallanData}
      />
    </div>
  );
};

export default DocumentSummaryPanel;