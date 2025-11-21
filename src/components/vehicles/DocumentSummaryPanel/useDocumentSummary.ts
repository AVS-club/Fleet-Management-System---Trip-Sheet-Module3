/**
 * useDocumentSummary - State management hook for DocumentSummaryPanel
 *
 * Manages:
 * - Vehicle data fetching
 * - Filtering and sorting
 * - Bulk refresh operations
 * - Challan information
 * - Date range selection
 * - UI state (collapsible sections, loading, etc.)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Vehicle } from '@/types';
import { getVehicles } from '../../../utils/storage';
import { updateVehicle } from '../../../utils/api/vehicles';
import { supabase } from '../../../utils/supabaseClient';
import { useChallanInfo } from '../../../hooks/useChallanInfo';
import { toast } from 'react-toastify';
import { createLogger } from '../../../utils/logger';
import { rowUrgency, daysTo, docScore, type DocKey } from '../../../utils/urgency';
import {
  calculateRCExpiry,
  getExpiryStatus,
  getLastRenewalCost,
  getFleetAverageCost,
  getInflationRateForDocType,
  isWithinThisMonth,
  isWithinDateRange
} from './utils';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  isWithinInterval,
  differenceInMonths,
  format
} from 'date-fns';

const logger = createLogger('useDocumentSummary');

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
  __urg: {
    score: number;
    meta: {
      expired: number;
      minDTX: number | null;
      missing: number;
    };
  };
}

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

interface DocumentMetrics {
  thisMonth: {
    totalExpense: number;
    expectedExpense: number;
    renewalsCount: number;
    lapsedCount: number;
  };
  thisYear: {
    totalExpense: number;
  };
}

type SortMode =
  | { kind: "urgency" }
  | { kind: "expiringSoon" }
  | { kind: "missing" }
  | { kind: "legalPriority" }
  | { kind: "column"; column: DocKey; dir: "asc" | "desc" };

export const useDocumentSummary = (isOpen: boolean) => {
  // Vehicle data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [dateRange, setDateRange] = useState<'allTime' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'>('allTime');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // UI state
  const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    charts: true
  });
  const [sort, setSort] = useState<SortMode>({ kind: "urgency" });
  const contentRef = useRef<HTMLDivElement>(null);

  // Refresh state
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{[key: string]: 'pending' | 'processing' | 'success' | 'error'}>({});

  // Challan state
  const { fetchChallanInfo, loading: challanLoading } = useChallanInfo();
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [currentChallanData, setCurrentChallanData] = useState(null);
  const [challanRefreshProgress, setChallanRefreshProgress] = useState(0);
  const [isBulkChallanLoading, setIsBulkChallanLoading] = useState(false);

  // Responsive column visibility
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const visibleColumns = isSmallScreen
    ? ['vehicle', 'insurance', 'puc', 'rc_expiry']
    : ['vehicle', 'insurance', 'fitness', 'permit', 'puc', 'tax', 'rc_expiry'];

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
          logger.error('Error fetching vehicles:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchVehicles();
    }
  }, [isOpen]);

  // Toggle section visibility
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Column sorting handler
  const handleColumnSort = (column: DocKey) => {
    const isCurrentColumn = sort.kind === "column" && sort.column === column;
    const newDir = isCurrentColumn && sort.dir === "asc" ? "desc" : "asc";
    setSort({ kind: "column", column, dir: newDir });
  };

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

  // Generate document matrix data from filtered vehicles with urgency scores
  const documentMatrix = useMemo((): VehicleDocuments[] => {
    return filteredVehicles.map(vehicle => {
      const calculatedRCExpiry = calculateRCExpiry(vehicle.registration_date);
      return {
        id: vehicle.id!,
        registration: vehicle.registration_number!,
        registrationDate: vehicle.registration_date || null,
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
        },
        __urg: rowUrgency(vehicle)
      };
    });
  }, [filteredVehicles]);

  // Apply sorting to the document matrix
  const sortedDocumentMatrix = useMemo(() => {
    const arr = [...documentMatrix];
    switch (sort.kind) {
      case "urgency":
        return arr.sort((a, b) => b.__urg.score - a.__urg.score
          || b.__urg.meta.expired - a.__urg.meta.expired
          || (a.__urg.meta.minDTX ?? 9999) - (b.__urg.meta.minDTX ?? 9999)
          || a.registration.localeCompare(b.registration));

      case "expiringSoon":
        return arr.filter(r => {
          const d = r.__urg.meta.minDTX;
          return d !== null && d >= 0 && d <= 30;
        }).sort((a, b) => (a.__urg.meta.minDTX ?? 9999) - (b.__urg.meta.minDTX ?? 9999));

      case "missing":
        return arr.filter(r => r.__urg.meta.missing > 0)
          .sort((a, b) => b.__urg.meta.missing - a.__urg.meta.missing);

      case "legalPriority": {
        const lp = (r: VehicleDocuments) => {
          const S = (k: DocKey) =>
            docScore(k, r.documents[k].date, !!r.documents[k].date);
          return S("rc") + S("insurance") + S("permit");
        };
        return arr.sort((a, b) => lp(b) - lp(a));
      }

      case "column": {
        const { column, dir } = sort;
        const val = (r: VehicleDocuments) => daysTo(r.documents[column].date);
        const cmp = (x: number | null, y: number | null) =>
          (x === null ? 9999 : x) - (y === null ? 9999 : y);
        return arr.sort((a, b) => dir === "asc" ? cmp(val(a), val(b)) : cmp(val(b), val(a)));
      }
      default:
        return arr;
    }
  }, [documentMatrix, sort]);

  // Generate metrics data based on filtered vehicles
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

    // Calculate expected expense for documents expiring in next 30 days
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiringDocsInRange = filteredVehicles.flatMap(vehicle => {
      const expiring = [];

      const checkExpiry = (date: string | null, type: string) => {
        if (date) {
          const expiryDate = new Date(date);
          if (expiryDate >= today && expiryDate <= thirtyDaysFromNow) {
            expiring.push({ vehicleId: vehicle.id, type, vehicle });
          }
        }
      };

      checkExpiry(vehicle.insurance_expiry_date, 'insurance');
      checkExpiry(vehicle.fitness_expiry_date, 'fitness');
      checkExpiry(vehicle.permit_expiry_date, 'permit');
      checkExpiry(vehicle.puc_expiry_date, 'puc');
      checkExpiry(vehicle.tax_paid_upto, 'tax');
      checkExpiry(vehicle.rc_expiry_date, 'rc');

      return expiring;
    });

    const expectedExpense = expiringDocsInRange.reduce((total, doc) => {
      let previousCost = getLastRenewalCost(doc.vehicle, doc.type);

      if (!previousCost || previousCost === 0) {
        previousCost = getFleetAverageCost(doc.type, filteredVehicles);
      }

      const inflationRate = getInflationRateForDocType(doc.type);
      const projectedCost = previousCost * (1 + inflationRate);

      return total + projectedCost;
    }, 0);

    result.thisMonth.expectedExpense = Math.round(expectedExpense);
    result.thisMonth.renewalsCount = expiringDocsInRange.length;

    // Count lapsed/expired documents
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
  }, [filteredVehicles]);

  // Generate monthly expenditure data
  const monthlyExpenditure = useMemo((): MonthlyExpenditure[] => {
    const today = new Date();
    const months: MonthlyExpenditure[] = [];

    for (let i = 11; i >= 0; i--) {
      const month = subMonths(today, i);
      const monthName = format(month, 'MMM');
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

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

      filteredVehicles.forEach(vehicle => {
        if (vehicle.rc_expiry_date && isWithinInterval(new Date(vehicle.rc_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.rc += getLastRenewalCost(vehicle, 'rc');
        }
        if (vehicle.insurance_expiry_date && isWithinInterval(new Date(vehicle.insurance_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.insurance += vehicle.insurance_premium_amount || getFleetAverageCost('insurance', vehicles);
        }
        if (vehicle.fitness_expiry_date && isWithinInterval(new Date(vehicle.fitness_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.fitness += vehicle.fitness_cost || getFleetAverageCost('fitness', vehicles);
        }
        if (vehicle.permit_expiry_date && isWithinInterval(new Date(vehicle.permit_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.permit += vehicle.permit_cost || getFleetAverageCost('permit', vehicles);
        }
        if (vehicle.puc_expiry_date && isWithinInterval(new Date(vehicle.puc_expiry_date), { start: monthStart, end: monthEnd })) {
          monthData.puc += vehicle.puc_cost || getFleetAverageCost('puc', vehicles);
        }
        if (vehicle.tax_paid_upto && isWithinInterval(new Date(vehicle.tax_paid_upto), { start: monthStart, end: monthEnd })) {
          monthData.tax += vehicle.tax_amount || getFleetAverageCost('tax', vehicles);
        }
      });

      if (month > today) {
        const monthsInFuture = differenceInMonths(month, today);
        Object.keys(monthData).forEach(key => {
          if (key !== 'month') {
            const inflationRate = getInflationRateForDocType(key);
            (monthData as any)[key] *= Math.pow(1 + inflationRate / 12, monthsInFuture);
          }
        });
      }

      months.push(monthData);
    }

    return months;
  }, [filteredVehicles, vehicles]);

  // Generate vehicle expenditure data
  const vehicleExpenditure = useMemo((): VehicleExpenditure[] => {
    return filteredVehicles.map(vehicle => {
      const totalAmount = (
        (vehicle.insurance_premium_amount || 0) +
        (vehicle.fitness_cost || 0) +
        (vehicle.permit_cost || 0) +
        (vehicle.puc_cost || 0) +
        (vehicle.tax_amount || 0)
      );

      return {
        vehicle: vehicle.registration_number!,
        amount: totalAmount
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredVehicles]);

  // Individual vehicle refresh
  const refreshVehicleData = async (vehicle: Vehicle) => {
    try {
      setRefreshProgress(prev => ({ ...prev, [vehicle.id!]: 'processing' }));

      // Use proxy server to avoid IP whitelisting issues
      // In production, uses Netlify Functions; in development, uses local proxy
      const isProduction = import.meta.env.PROD;
      const proxyUrl = isProduction 
        ? '/api/fetch-rc-details'  // Netlify Function endpoint
        : (import.meta.env.VITE_RC_PROXY_URL || 'http://localhost:3001/api/fetch-rc-details');
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_number: vehicle.registration_number
        }),
      });
      
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to fetch vehicle details');
      }

      const rcData = result.data?.response || result.data || {};

      const isValidDate = (dateStr: string | undefined): boolean => {
        return dateStr !== undefined && dateStr !== '1900-01-01' && dateStr !== '';
      };

      const updatePayload: Partial<Vehicle> = {
        insurance_expiry_date: isValidDate(rcData.insurance_expiry) ? rcData.insurance_expiry : vehicle.insurance_expiry_date,
        tax_paid_upto: rcData.tax_upto === 'LTT' ? '2099-12-31' : (isValidDate(rcData.tax_upto) ? rcData.tax_upto : vehicle.tax_paid_upto),
        permit_expiry_date: isValidDate(rcData.permit_valid_upto) ? rcData.permit_valid_upto : vehicle.permit_expiry_date,
        puc_expiry_date: isValidDate(rcData.pucc_upto) ? rcData.pucc_upto : vehicle.puc_expiry_date,
        rc_expiry_date: isValidDate(rcData.rc_expiry) ? rcData.rc_expiry : vehicle.rc_expiry_date,
        fitness_expiry_date: isValidDate(rcData.fitness_upto) ? rcData.fitness_upto : vehicle.fitness_expiry_date,
        vahan_last_fetched_at: new Date().toISOString(),
      };

      const updatedVehicle = await updateVehicle(vehicle.id!, updatePayload);

      if (updatedVehicle) {
        setVehicles(prevVehicles =>
          prevVehicles.map(v =>
            v.id === vehicle.id ? { ...v, ...updatePayload } : v
          )
        );
      }

      setRefreshProgress(prev => ({ ...prev, [vehicle.id!]: 'success' }));

      return true;
    } catch (error: any) {
      logger.error(`Error refreshing vehicle ${vehicle.registration_number}:`, error);
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

      if (i + BATCH_SIZE < vehicleIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return results;
  };

  // Bulk refresh handler
  const handleBulkRefresh = async () => {
    setIsBulkRefreshing(true);
    setRefreshProgress({});

    let successCount = 0;
    let failureCount = 0;

    const initialProgress = vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id!] = 'pending';
      return acc;
    }, {} as { [key: string]: 'pending' | 'processing' | 'success' | 'error' });
    setRefreshProgress(initialProgress);

    const vehicleIds = vehicles.map(v => v.id!);
    const results = await batchRefreshDocuments(vehicleIds);

    successCount = results.filter(r => r === true).length;
    failureCount = results.filter(r => r === false).length;

    setIsBulkRefreshing(false);

    if (successCount > 0) {
      toast.success(`✅ ${successCount} vehicles updated successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}!`);
    } else {
      toast.error(`❌ All ${failureCount} vehicles failed to update`);
    }

    setTimeout(() => {
      setRefreshProgress({});
    }, 3000);

    const refreshedVehicles = await getVehicles();
    setVehicles(refreshedVehicles);
  };

  // Individual refresh handler
  const handleIndividualRefresh = async (vehicle: Vehicle) => {
    if (refreshProgress[vehicle.id!] === 'processing') return;

    const success = await refreshVehicleData(vehicle);

    if (success) {
      toast.success(`✅ ${vehicle.registration_number} updated successfully!`);
      const refreshedVehicles = await getVehicles();
      setVehicles(refreshedVehicles);
    } else {
      toast.error(`❌ Failed to update ${vehicle.registration_number}`);
    }

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
      registration_number: v.registration_number?.replace(/\s/g, '').toUpperCase(),
      chassis_number: v.chassis_number?.replace(/\s/g, '').toUpperCase(),
      engine_number: v.engine_number?.replace(/\s/g, '').toUpperCase()
    }));

    const validVehicles = vehiclesToCheck.filter(v =>
      v.registration_number && v.chassis_number && v.engine_number
    );

    if (validVehicles.length === 0) {
      toast.error('No vehicles have complete chassis and engine information for challan check');
      return;
    }

    if (validVehicles.length < vehiclesToCheck.length) {
      toast.warning(`${vehiclesToCheck.length - validVehicles.length} vehicles skipped due to missing chassis/engine info`);
    }

    setIsBulkChallanLoading(true);
    setChallanRefreshProgress(0);
    const results = [];

    for (let i = 0; i < validVehicles.length; i++) {
      const result = await fetchChallanInfo(
        validVehicles[i].registration_number!,
        validVehicles[i].chassis_number!,
        validVehicles[i].engine_number!
      );

      if (result) {
        results.push(result);
      }

      setChallanRefreshProgress(((i + 1) / validVehicles.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const allChallans = {
      vehicleId: 'All Vehicles',
      total: results.reduce((sum, r) => sum + r.total, 0),
      challans: results.flatMap(r => r.challans)
    };

    setCurrentChallanData(allChallans as any);
    setShowChallanModal(true);
    setIsBulkChallanLoading(false);
    setChallanRefreshProgress(0);
  };

  const handleIndividualChallan = async (vehicle: Vehicle) => {
    const cleanedData = {
      vehicleId: vehicle.registration_number?.replace(/\s/g, '').toUpperCase(),
      chassis: vehicle.chassis_number?.replace(/\s/g, '').toUpperCase(),
      engine: vehicle.engine_number?.replace(/\s/g, '').toUpperCase()
    };

    if (!cleanedData.chassis || !cleanedData.engine) {
      toast.error(`Cannot check challans: Missing chassis or engine number for ${vehicle.registration_number}`);
      return;
    }

    const result = await fetchChallanInfo(
      cleanedData.vehicleId!,
      cleanedData.chassis,
      cleanedData.engine
    );

    if (result) {
      setCurrentChallanData(result as any);
      setShowChallanModal(true);
    }
  };

  return {
    // Data
    vehicles,
    filteredVehicles,
    documentMatrix,
    sortedDocumentMatrix,
    metrics,
    monthlyExpenditure,
    vehicleExpenditure,

    // UI State
    loading,
    contentRef,
    visibleColumns,
    expandedSections,
    sort,
    chartView,

    // Filter State
    dateRange,
    customStartDate,
    customEndDate,
    vehicleFilter,
    documentTypeFilter,
    searchTerm,

    // Refresh State
    isBulkRefreshing,
    refreshProgress,

    // Challan State
    challanLoading,
    showChallanModal,
    currentChallanData,
    challanRefreshProgress,
    isBulkChallanLoading,

    // Actions
    setDateRange,
    setCustomStartDate,
    setCustomEndDate,
    setVehicleFilter,
    setDocumentTypeFilter,
    setSearchTerm,
    setChartView,
    setSort,
    toggleSection,
    handleColumnSort,
    handleBulkRefresh,
    handleIndividualRefresh,
    handleChallanRefresh,
    handleIndividualChallan,
    setShowChallanModal
  };
};
