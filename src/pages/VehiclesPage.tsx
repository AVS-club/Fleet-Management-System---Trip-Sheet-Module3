import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import Layout from "../components/layout/Layout";
import { Vehicle, Trip, Driver } from "@/types"; // Import the Vehicle interface
import VehicleCardSkeleton from "../components/ui/VehicleCardSkeleton";
import VehicleTagBadges from "../components/vehicles/VehicleTagBadges";
import { cache, CACHE_KEYS } from "../utils/cache";

interface VehicleWithStats extends Vehicle {
  stats: {
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  };
}

import {
  getVehicles,
  getAllVehicleStats,
  createVehicle,
  getTrips,
} from "../utils/storage";
import { getAllDriversIncludingInactive } from "../utils/api/drivers";
import config from "../utils/env";
import { uploadVehicleDocument, getSignedVehiclePhotoUrl } from "../utils/supabaseStorage";
import {
  Truck,
  Calendar,
  PlusCircle,
  FileText,
  AlertTriangle,
  TrendingUp,
  Archive,
  MessageSquare,
  Medal,
  NotebookTabs,
  Route,
  X,
  User,
  Fuel,
  Gauge,
  Search,
} from "lucide-react";
import Button from "../components/ui/Button";
import VehicleForm from "../components/vehicles/VehicleForm";
import { toast } from "react-toastify";
import StatCard from "../components/ui/StatCard";
import DocumentSummaryPanel from "../components/vehicles/DocumentSummaryPanel/DocumentSummaryPanelRefactored";
import VehicleWhatsAppShareModal from "../components/vehicles/VehicleWhatsAppShareModal";
import TopDriversModal from "../components/vehicles/TopDriversModal";
import VehicleActivityLogTable from "../components/admin/VehicleActivityLogTable";
import ReactPaginate from "react-paginate";
import { createLogger } from '../utils/logger';

const logger = createLogger('VehiclesPage');

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const searchParams = new URLSearchParams(window.location.search);
  const [vehicles, setVehicles] = useState<VehicleWithStats[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isAddingVehicle, setIsAddingVehicle] = useState(searchParams.get('action') === 'new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTopDriversModal, setShowTopDriversModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] =
    useState<Vehicle | null>(null);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [selectedVehicleForLog, setSelectedVehicleForLog] = useState<Vehicle | null>(null);
  const [topDriverLogic, setTopDriverLogic] = useState<'cost_per_km' | 'mileage' | 'trips'>('mileage');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 9;

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [shouldSearch, setShouldSearch] = useState(false);

  // Handle URL parameter changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsAddingVehicle(true);
    }
  }, [window.location.search]);

  // Create a drivers lookup map for efficient driver assignment display
  const driversById = useMemo(() => {
    const map: Record<string, Driver> = {};
    if (Array.isArray(drivers)) {
      drivers.forEach(driver => {
        if (driver.id) {
          map[driver.id] = driver;
        }
      });
    }
    return map;
  }, [drivers]);

  // Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [isCalculatingStats, setIsCalculatingStats] = useState(false);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [vehiclesZeroTrips, setVehiclesZeroTrips] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Performance monitoring
      const startTime = performance.now();
      performance.mark('vehicles-load-start');

      setLoading(true);
      setStatsLoading(true);
      try {
        // Check cache first
        const cachedVehicles = cache.get<Vehicle[]>(CACHE_KEYS.VEHICLES);
        const cachedDrivers = cache.get<Driver[]>(CACHE_KEYS.DRIVERS);

        let vehiclesData: Vehicle[];
        let driversData: Driver[];

        if (cachedVehicles && cachedDrivers) {
          // Use cached data for immediate display
          vehiclesData = cachedVehicles;
          driversData = cachedDrivers;
        } else {
          // Phase 1: Load essential data first (vehicles and drivers only)
          const [vehiclesResult, driversResult] = await Promise.all([
            getVehicles(),
            getAllDriversIncludingInactive(),
          ]);

          vehiclesData = Array.isArray(vehiclesResult) ? vehiclesResult : [];
          driversData = Array.isArray(driversResult) ? driversResult : [];

          // Cache the data
          cache.set(CACHE_KEYS.VEHICLES, vehiclesData);
          cache.set(CACHE_KEYS.DRIVERS, driversData);
        }

        // Debug: Log driver count and any missing assignments
        if (config.isDev) logger.debug('Fetched drivers count:', driversData.length);
        const vehiclesWithDriverIds = vehiclesData.filter(v => v.primary_driver_id);
        const missingDriverAssignments = vehiclesWithDriverIds.filter(v =>
          !driversData.find(d => d.id === v.primary_driver_id)
        );
        if (missingDriverAssignments.length > 0) {
          if (config.isDev) logger.warn('Vehicles with missing driver assignments:', missingDriverAssignments.map(v => ({
            vehicle: v.registration_number,
            primary_driver_id: v.primary_driver_id
          })));
        }
        setDrivers(driversData);

        // Generate signed URLs for all vehicle photos
        logger.debug('📸 Generating signed URLs for vehicle photos...');
        const vehiclesWithPhotos = await Promise.all(
          vehiclesData.map(async (vehicle) => {
            if (vehicle.vehicle_photo_url) {
              logger.debug(`📸 Vehicle ${vehicle.registration_number} has photo:`, vehicle.vehicle_photo_url);
              const signedPhotoUrl = await getSignedVehiclePhotoUrl(vehicle.vehicle_photo_url);
              logger.debug(`📸 Generated signed URL for ${vehicle.registration_number}:`, signedPhotoUrl ? 'SUCCESS' : 'FAILED');
              if (signedPhotoUrl) {
                return { ...vehicle, photo_url: signedPhotoUrl };
              }
            }
            return vehicle;
          })
        );
        logger.debug('📸 Total vehicles with photos:', vehiclesWithPhotos.filter(v => v.photo_url).length);

        // Set vehicles with default stats first for immediate display
        const vehiclesWithDefaultStats = vehiclesWithPhotos.map((vehicle) => ({
          ...vehicle,
          stats: {
            totalTrips: 0,
            totalDistance: 0,
            averageKmpl: undefined,
          },
          selected: false,
        }));

        setVehicles(vehiclesWithDefaultStats);

        // Performance logging for initial load
        const initialLoadTime = performance.now() - startTime;
        logger.debug(`🚀 Vehicles loaded in ${initialLoadTime.toFixed(2)}ms`);

        setLoading(false); // Show vehicles immediately

        // Phase 2: Load trips and calculate stats in background
        setIsCalculatingStats(true);
        const cachedTrips = cache.get<Trip[]>(CACHE_KEYS.TRIPS);
        let tripsData: Trip[];

        if (cachedTrips) {
          tripsData = cachedTrips;
        } else {
          tripsData = await getTrips();
          cache.set(CACHE_KEYS.TRIPS, tripsData);
        }

        const tripsArray = Array.isArray(tripsData) ? tripsData : [];
        setTrips(tripsArray);

        // Calculate and update stats
        const statsMap = await getAllVehicleStats(tripsArray);
        const vehiclesWithStats = vehiclesWithPhotos.map((vehicle) => ({
          ...vehicle,
          stats:
            statsMap[vehicle.id] ?? {
              totalTrips: 0,
              totalDistance: 0,
              averageKmpl: undefined,
            },
          selected: false,
        }));

        // Smooth transition to stats - use setTimeout to prevent layout shift
        setTimeout(() => {
          setVehicles(vehiclesWithStats);
          setIsCalculatingStats(false);

          // Performance logging for complete load
          const totalLoadTime = performance.now() - startTime;
          performance.mark('vehicles-load-end');
          performance.measure('vehicles-complete-load', 'vehicles-load-start', 'vehicles-load-end');
          logger.debug(`📊 Complete vehicles load with stats in ${totalLoadTime.toFixed(2)}ms`);
        }, 150); // Small delay to prevent glitchy updates

        // Calculate statistics
        const activeVehicles = vehiclesData.filter(
          (v) => v.status !== "archived"
        );
        setTotalVehicles(activeVehicles.length);

        // Calculate vehicles with zero trips
        const vehiclesWithTrips = new Set();
        if (Array.isArray(tripsData)) {
          tripsData.forEach((trip) => {
            if (trip.vehicle_id) {
              vehiclesWithTrips.add(trip.vehicle_id);
            }
          });
        }

        const zeroTripsCount = activeVehicles.filter(
          (vehicle) => !vehiclesWithTrips.has(vehicle.id)
        ).length;
        setVehiclesZeroTrips(zeroTripsCount);



        setStatsLoading(false);
      } catch (error) {
        logger.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles");
        setStatsLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(0);
  }, [showArchived]);

  // Search logic - trigger search after 4 characters, then every 2 characters
  useEffect(() => {
    const length = searchTerm.length;

    if (length === 0) {
      // Reset to show all vehicles
      setShouldSearch(false);
      setActiveSearch('');
    } else if (length >= 4) {
      // Search after 4 characters, then every 2 characters (4, 6, 8, 10...)
      if (length === 4 || (length > 4 && (length - 4) % 2 === 0)) {
        setShouldSearch(true);
        setActiveSearch(searchTerm);
      }
    }
  }, [searchTerm]);

  // Calculate Average Distance This Month
  const averageDistanceThisMonth = useMemo(() => {
    if (!Array.isArray(trips)) return 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter trips for the current month
    const tripsThisMonth = trips.filter((trip) => {
      const tripDate = new Date(trip.trip_start_date);
      return (
        tripDate.getMonth() === currentMonth &&
        tripDate.getFullYear() === currentYear
      );
    });

    if (tripsThisMonth.length === 0) return 0;

    // Calculate total distance
    const totalDistance = tripsThisMonth.reduce(
      (sum, trip) => sum + (trip.end_km - trip.start_km),
      0
    );

    // Get unique vehicles that had trips this month
    const uniqueVehicles = new Set(tripsThisMonth.map((t) => t.vehicle_id));

    // Calculate average
    return totalDistance / uniqueVehicles.size;
  }, [trips]);

  // Calculate Top Driver This Month
  const topDriversThisMonth = useMemo(() => {
    if (!Array.isArray(trips) || !Array.isArray(drivers)) return [];

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Filter trips for the current month with refueling data (for mileage calculation)
    const tripsThisMonth = trips.filter((trip) => {
      const tripDate = new Date(trip.trip_start_date);
      return (
        tripDate.getMonth() === currentMonth &&
        tripDate.getFullYear() === currentYear &&
        trip.calculated_kmpl !== undefined &&
        trip.calculated_kmpl > 0
      );
    });

    if (tripsThisMonth.length === 0) return [];

    // Group trips by driver and calculate average mileage for each
    const driverPerformance = tripsThisMonth.reduce((acc, trip) => {
      if (!trip.driver_id || !trip.calculated_kmpl) return acc;

      if (!acc[trip.driver_id]) {
        acc[trip.driver_id] = {
          tripCount: 0,
          totalMileage: 0,
        };
      }

      acc[trip.driver_id].tripCount += 1;
      acc[trip.driver_id].totalMileage += trip.calculated_kmpl;

      return acc;
    }, {} as Record<string, { tripCount: number; totalMileage: number }>);

    // Calculate average mileage for each driver
    const driverMileages = Object.entries(driverPerformance).map(
      ([driverId, data]) => {
        const driver = drivers.find((d) => d.id === driverId);
        return {
          id: driverId,
          name: driver?.name || "Driver Not Found",
          mileage: data.tripCount > 0 ? data.totalMileage / data.tripCount : 0,
        };
      }
    );

    // Sort by mileage (highest first) and take top 5
    return driverMileages.sort((a, b) => b.mileage - a.mileage).slice(0, 5);
  }, [trips, drivers]);

  // Get the top driver (if any)
  const topDriver =
    topDriversThisMonth.length > 0 ? topDriversThisMonth[0] : null;

  // Comprehensive cache invalidation utility
  const invalidateVehicleCache = () => {
    cache.delete(CACHE_KEYS.VEHICLES);
    cache.delete(CACHE_KEYS.DRIVERS);
    cache.delete(CACHE_KEYS.TRIPS);
    cache.delete(CACHE_KEYS.VEHICLE_STATS);
  };

  const handleAddVehicle = async (data: Omit<Vehicle, "id">) => {
    setIsSubmitting(true);
    try {
      // Check if vehicle with same registration number already exists
      const existingVehicles = await getVehicles();
      const duplicateVehicle = existingVehicles.find(
        vehicle => vehicle.registration_number.toLowerCase() === data.registration_number.toLowerCase()
      );

      if (duplicateVehicle) {
        toast.error(`A vehicle with registration number "${data.registration_number}" already exists.`);
        setIsSubmitting(false);
        return;
      }

      const uploadMap = {
        rc_copy_file: { urlField: "rc_document_url", docType: "rc" },
        insurance_document_file: {
          urlField: "insurance_document_url",
          docType: "insurance",
        },
        fitness_document_file: {
          urlField: "fitness_document_url",
          docType: "fitness",
        },
        tax_receipt_document_file: {
          urlField: "tax_document_url",
          docType: "tax",
        },
        permit_document_file: {
          urlField: "permit_document_url",
          docType: "permit",
        },
        puc_document_file: { urlField: "puc_document_url", docType: "puc" },
      } as const;

      const payload: any = { ...data };

      for (const [fileField, { urlField, docType }] of Object.entries(uploadMap)) {
        const files = payload[fileField] as File[] | undefined;
        if (files && files.length > 0) {
          try {
            const filePath = await uploadVehicleDocument(
              files[0],
              payload.registration_number,
              docType
            );
            payload[urlField] = [filePath]; // Ensure it's wrapped in an array
          } catch (err) {
            logger.error(`Failed to upload ${docType} document:`, err);
            toast.error(`Failed to upload ${docType} document`);
          }
        }
        delete payload[fileField];
      }

      const newVehicle = await createVehicle(payload);
      if (newVehicle) {
        const conformingStats = {
          totalTrips: 0,
          totalDistance: 0,
          averageKmpl: undefined,
        };
        const vehicleWithStats: VehicleWithStats = {
          ...newVehicle,
          stats: conformingStats,
        };
        setVehicles((prev) =>
          Array.isArray(prev) ? [...prev, vehicleWithStats] : [vehicleWithStats]
        );
        setTotalVehicles((prev) => prev + 1);
        setIsAddingVehicle(false);
        toast.success("Vehicle added successfully");

        // Clear cache to ensure fresh data on next load
        invalidateVehicleCache();
      } else {
        toast.error("Failed to add vehicle");
      }
    } catch (error) {
      logger.error("Error adding vehicle:", error);
      toast.error(
        "Error adding vehicle: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to validate document paths
  const isValidPath = (path: string): boolean => {
    return path &&
           typeof path === 'string' &&
           path.trim() !== '' &&
           path !== 'null' &&
           path !== 'undefined';
  };

  // Helper function to count uploaded documents - updated to check for actual file paths
  const countDocuments = (
    vehicle: Vehicle
  ): { uploaded: number; total: number; status: 'none' | 'partial' | 'complete' } => {
    const documentFields: (keyof Vehicle)[] = [
      'rc_document_url',
      'insurance_document_url',
      'fitness_document_url',
      'tax_document_url',
      'permit_document_url',
      'puc_document_url',
    ];

    const normalizePath = (value: string) => value.split('?')[0].split('#')[0].trim();

    const isValidFile = (value: unknown) => {
      if (typeof value !== 'string') return false;
      const normalized = normalizePath(value);
      if (!normalized) return false;
      return /\.(pdf|png|jpe?g)$/i.test(normalized);
    };

    const looksLikeDocument = (value: unknown) => {
      if (typeof value !== 'string') return false;
      const normalized = normalizePath(value);
      if (!normalized) return false;
      return /\.[a-z0-9]{2,5}$/i.test(normalized);
    };

    const extractFileStrings = (value: unknown): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.flatMap((item) => extractFileStrings(item));
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))
        ) {
          try {
            const parsed = JSON.parse(trimmed);
            return extractFileStrings(parsed);
          } catch {
            return [trimmed];
          }
        }
        return [trimmed];
      }
      if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const candidateKeys = [
          'file_path',
          'file',
          'url',
          'path',
          'signedUrl',
          'signed_url',
          'document_path',
          'documentUrl',
          'document_url',
        ];
        const matches = candidateKeys
          .map((key) => record[key])
          .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim() !== '');
        if (matches.length > 0) {
          return matches.map((candidate) => candidate.trim());
        }
        return Object.values(record).flatMap((item) => extractFileStrings(item));
      }
      return [];
    };

    const ensureArray = <T,>(value: unknown): T[] => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value as T[];
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))
        ) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed as T[];
            }
            if (parsed && typeof parsed === 'object') {
              return Object.values(parsed) as T[];
            }
          } catch {
            return [trimmed as unknown as T];
          }
        }
        return [trimmed as unknown as T];
      }
      if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const entries = Object.entries(record);
        const isIndexedObject = entries.every(([key]) => /^\d+$/.test(key));
        if (isIndexedObject) {
          return entries
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([, entry]) => entry as T);
        }
      }
      return [];
    };

    let total = documentFields.length;

    let uploaded = documentFields.reduce((count, field) => {
      const entries = extractFileStrings((vehicle as Record<string, unknown>)[field]);
      return count + (entries.filter(path => isValidPath(path)).some(isValidFile) ? 1 : 0);
    }, 0);

    const otherDocuments = ensureArray<Record<string, unknown>>(vehicle.other_documents);

    if (otherDocuments.length > 0) {
      total += otherDocuments.length;
      otherDocuments.forEach((doc) => {
        const entries = extractFileStrings(doc);
        if (entries.some(isValidFile)) {
          uploaded += 1;
        }
      });
    }

    const otherInfoDocuments = ensureArray<unknown>(vehicle.other_info_documents);

    if (otherInfoDocuments.length > 0) {
      otherInfoDocuments.forEach((entry) => {
        const entries = extractFileStrings(entry);
        const hasDocumentShape = entries.some((item) => looksLikeDocument(item));
        if (!hasDocumentShape) {
          return;
        }
        total += 1;
        if (entries.some(isValidFile)) {
          uploaded += 1;
        }
      });
    }

    const status: 'none' | 'partial' | 'complete' =
      uploaded === 0
        ? 'none'
        : uploaded >= total
        ? 'complete'
        : 'partial';

    return { uploaded, total, status };
  };

  // Open WhatsApp share modal
  const handleOpenShareModal = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
  };

  // Open activity log modal
  const handleOpenLog = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicleForLog(vehicle);
    setShowActivityLogModal(true);
  };

  // Handle add trip with vehicle preselected
  const handleAddTrip = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/trips', { state: { preselectedVehicle: vehicle.id } });
  };



  // Search functionality - filter vehicles by registration number
  const searchFilteredVehicles = useMemo(() => {
    if (!activeSearch || !shouldSearch) {
      return vehicles;
    }

    return vehicles.filter(vehicle =>
      vehicle.registration_number.toLowerCase().includes(activeSearch.toLowerCase())
    );
  }, [vehicles, activeSearch, shouldSearch]);

  // Filter vehicles based on archived status and search
  const filteredVehicles = searchFilteredVehicles.filter((v) =>
    showArchived ? v.status === "archived" : v.status !== "archived"
  );

  const pageCount = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehicles, currentPage]);
  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Truck className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">{t('vehicles.title')}</h1>
          {isCalculatingStats && (
            <div className="ml-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">Updating stats...</span>
            </div>
          )}
        </div>
        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">{t('vehicles.manageFleet', 'Manage your fleet vehicles')}</p>
        {!isAddingVehicle && (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <Button
              variant="outline"
              onClick={() => setShowDocumentPanel(true)}
              icon={<FileText className="h-4 w-4" />}
              size="sm"
              title="Vehicle Document Summary (Legacy)"
            >
{t('vehicles.documentSummary', 'Document Summary')}
            </Button>

            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search vehicle (min 4 chars)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setActiveSearch('');
                      setShouldSearch(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchTerm && searchTerm.length < 4 && (
                <div className="absolute left-0 top-full mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Type {4 - searchTerm.length} more character{4 - searchTerm.length !== 1 ? 's' : ''} to search
                </div>
              )}
            </div>

            <Button
              onClick={() => setIsAddingVehicle(true)}
              icon={<PlusCircle className="h-4 w-4" />}
            >
{t('vehicles.addVehicle')}
            </Button>
          </div>
        )}
      </div>

      {isAddingVehicle ? (
        <div className="bg-white dark:bg-gray-900 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-primary-500" />
              New Vehicle
            </h2>

            <Button variant="outline" onClick={() => setIsAddingVehicle(false)}>
              Cancel
            </Button>
          </div>

          <VehicleForm
            onSubmit={handleAddVehicle}
            isSubmitting={isSubmitting}
            onCancel={() => setIsAddingVehicle(false)}
          />
        </div>
      ) : (
        <>
          {/* Vehicle Stats Section */}
          {!showArchived && (
            <>
              {statsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 animate-pulse"
                    >
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatCard
                    title="Total Vehicles"
                    value={totalVehicles}
                    icon={<Truck className="h-5 w-5 text-primary-600" />}
                  />

                  <StatCard
                    title="Vehicles with 0 Trips"
                    value={vehiclesZeroTrips}
                    icon={<Calendar className="h-5 w-5 text-warning-600" />}
                    warning={vehiclesZeroTrips > 0}
                  />

                  <StatCard
                    title="Top Driver (This Month)"
                    value={
                      topDriver ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold">
                              {topDriver.name.split(" ")[0]}
                            </span>
                            <select
                              value={topDriverLogic}
                              onChange={(e) => setTopDriverLogic(e.target.value as 'cost_per_km' | 'mileage' | 'trips')}
                              className="text-xs border-0 bg-transparent focus:ring-0 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="mileage">Best Mileage</option>
                              <option value="cost_per_km">Best Cost/KM</option>
                              <option value="trips">Most Trips</option>
                            </select>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            {topDriverLogic === 'mileage' && `${topDriver.mileage.toFixed(1)} km/L`}
                            {topDriverLogic === 'cost_per_km' && `₹0.00/km`}
                            {topDriverLogic === 'trips' && `0 trips`}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-yellow-600 italic text-sm">No data yet</span>
                          <select
                            value={topDriverLogic}
                            onChange={(e) => setTopDriverLogic(e.target.value as 'cost_per_km' | 'mileage' | 'trips')}
                            className="text-xs border-0 bg-transparent focus:ring-0 p-0 text-gray-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="mileage">Best Mileage</option>
                            <option value="cost_per_km">Best Cost/KM</option>
                            <option value="trips">Most Trips</option>
                          </select>
                        </div>
                      )
                    }
                    icon={<Medal className="h-5 w-5 text-yellow-500" />}
                    onClick={() =>
                      topDriversThisMonth.length > 0 &&
                      setShowTopDriversModal(true)
                    }
                    className={
                      topDriversThisMonth.length > 0 ? "cursor-pointer" : ""
                    }
                  />

                  <StatCard
                    title="Average Distance This Month"
                    value={Math.round(
                      averageDistanceThisMonth
                    ).toLocaleString()}
                    subtitle="km"
                    icon={<TrendingUp className="h-5 w-5 text-primary-600" />}
                  />
                </div>
              )}
            </>
          )}

          {showArchived && (
            <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-warning-500 p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-6 w-6 text-warning-500 mr-2" />
                <div>
                  <h3 className="text-lg font-display font-medium tracking-tight-plus text-gray-900 dark:text-gray-100">
                    Viewing Archived Vehicles
                  </h3>
                  <p className="font-sans text-warning-700 dark:text-warning-400">
                    You are currently viewing archived vehicles. These vehicles
                    are hidden from other parts of the system.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Info */}
          {activeSearch && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Showing {filteredVehicles.length} result{filteredVehicles.length !== 1 ? 's' : ''} for "<strong>{activeSearch}</strong>"
                {filteredVehicles.length === 0 && " - No vehicles found"}
              </p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <VehicleCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="font-sans text-gray-500 dark:text-gray-400">
                {showArchived
                  ? "No archived vehicles found."
                  : "No vehicles found. Add your first vehicle to get started."}
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedVehicles.map((vehicle) => {
                // Count documents using actual document paths
                const { uploaded, total, status: uploadStatus } = countDocuments(vehicle);

                // Get the assigned driver using the driversById lookup
                const assignedDriver = vehicle.primary_driver_id
                  ? driversById[vehicle.primary_driver_id]
                  : undefined;

                const statusPillClasses =
                  vehicle.status === "active"
                    ? "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300"
                    : vehicle.status === "maintenance"
                    ? "bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300"
                    : vehicle.status === "archived"
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";

                const photoRingClasses =
                  vehicle.status === "active"
                    ? "ring-2 ring-success-400 ring-offset-2"
                    : "";

                const metaItems: { icon: React.ReactNode; label: string }[] = [];

                const totalTrips =
                  typeof vehicle.stats.totalTrips === "number"
                    ? vehicle.stats.totalTrips
                    : 0;

                const totalDistanceRaw =
                  typeof vehicle.stats.totalDistance === "number"
                    ? vehicle.stats.totalDistance
                    : 0;

                const averageKmplRaw =
                  typeof vehicle.stats.averageKmpl === "number"
                    ? vehicle.stats.averageKmpl
                    : Number.NaN;

                const displayTotalDistance =
                  totalDistanceRaw > 0 ? totalDistanceRaw.toLocaleString() : "0";

                const displayAverageKmpl =
                  totalTrips > 0 && Number.isFinite(averageKmplRaw)
                    ? averageKmplRaw.toFixed(1)
                    : "0";

                const normalizedType =
                  typeof vehicle.type === "string"
                    ? vehicle.type.replace(/_/g, " ")
                    : "";

                if (normalizedType) {
                  const readableType =
                    normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
                  metaItems.push({
                    icon: <Truck className="h-3 w-3 text-gray-400" />,
                    label: readableType,
                  });
                }

                if (typeof vehicle.owner_name === "string" && vehicle.owner_name.trim()) {
                  metaItems.push({
                    icon: <User className="h-3 w-3 text-gray-400" />,
                    label: vehicle.owner_name.trim(),
                  });
                }

                if (typeof vehicle.current_odometer === "number") {
                  metaItems.push({
                    icon: <Gauge className="h-3 w-3 text-gray-400" />,
                    label: `${vehicle.current_odometer.toLocaleString()} km`,
                  });
                }

                return (
                  <div
                    key={vehicle.id}
                    className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative cursor-pointer ${
                      vehicle.status === "archived" ? "opacity-75" : ""
                    }`}
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                  >
                    {/* Header: Registration, Status, Action Buttons */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-display font-bold tracking-tight-plus text-gray-900 dark:text-gray-100 truncate pr-20"
                            title={`${vehicle.registration_number} - Current Odometer: ${vehicle.current_odometer?.toLocaleString()} km`}>
                          {vehicle.registration_number}
                        </h3>
                        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 truncate" title={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}>
                          {vehicle.make} {vehicle.model}
                          {vehicle.tax_scope &&
                           (vehicle.tax_scope.toLowerCase().includes('ltt') ||
                            vehicle.tax_scope.toLowerCase().includes('lifetime')) && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-sans font-medium rounded-full dark:bg-green-900/30 dark:text-green-300" title="This vehicle has lifetime tax paid">
                              Lifetime Tax
                            </span>
                          )}
                        </p>
                        {metaItems.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-sans text-gray-500 dark:text-gray-400">
                            {metaItems.map((item, index) => (
                              <span
                                key={`vehicle-meta-${vehicle.id}-${index}`}
                                className="flex items-center gap-1 text-gray-600 dark:text-gray-400"
                              >
                                {item.icon}
                                <span className="max-w-[8rem] truncate">{item.label}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-sans font-medium rounded-full capitalize flex items-center gap-2 z-10 ${statusPillClasses}`}
                        >
                          {vehicle.status === "active" && (
                            <span
                              className="inline-block h-2 w-2 rounded-full bg-success-500"
                              aria-hidden="true"
                            />
                          )}
                          {vehicle.status}
                        </span>
                        <div
                          className={`relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${photoRingClasses}`}
                        >
                          {vehicle.photo_url ? (
                            <img
                              src={vehicle.photo_url}
                              alt={`${vehicle.registration_number} photo`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Truck className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          {vehicle.status === "active" && (
                            <span
                              className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 bg-success-500"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pills Row: Year + Fuel */}
                    <div className="flex gap-1 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-sans font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        <Calendar className="h-3 w-3 mr-1" />
                        {vehicle.year}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-sans font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 capitalize">
                        <Fuel className="h-3 w-3 mr-1" />
                        {vehicle.fuel_type}
                      </span>
                    </div>

                    {/* Driver Assignment */}
                    <div className="mb-2">
                      <div className="flex items-center text-sm">
                        {assignedDriver ? (
                          <>
                            <span className="mr-1" role="img" aria-label="Driver">{"\u{1F464}"}</span>
                            <span className="font-sans text-gray-700 dark:text-gray-300 truncate">{assignedDriver.name}</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-sans text-gray-400">Unassigned</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Vehicle Tags */}
                    {vehicle.tags && vehicle.tags.length > 0 && (
                      <div className="mb-2">
                        <VehicleTagBadges
                          tags={vehicle.tags}
                          readOnly
                          size="sm"
                          maxDisplay={2}
                          compactMode={true}
                        />
                      </div>
                    )}

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center">
                          <span className="text-xs font-sans text-gray-500 dark:text-gray-400 block">
                            Trips
                          </span>
                          <p className="font-display font-bold tracking-tight-plus text-sm text-gray-900 dark:text-gray-100">{vehicle.stats.totalTrips}</p>
                        </div>

                        <div className="text-center">
                          <span className="text-xs font-sans text-gray-500 dark:text-gray-400 block">
                            Distance
                          </span>
                          <p className="font-display font-bold tracking-tight-plus text-sm text-gray-900 dark:text-gray-100">
                            {displayTotalDistance}
                          </p>
                        </div>

                        <div className="text-center">
                          <span className="text-xs font-sans text-gray-500 dark:text-gray-400 block">
                            Avg KMPL
                          </span>
                          <p className="font-display font-bold tracking-tight-plus text-sm text-gray-900 dark:text-gray-100">
                            {displayAverageKmpl}
                          </p>
                        </div>
                    </div>

                    {/* Documents Status */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center">
                        <FileText className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs font-sans text-gray-500 dark:text-gray-400">Docs:</span>
                        <span
                          className={`ml-1 text-xs font-sans font-medium px-1.5 py-0.5 rounded-full ${
                            uploadStatus === 'complete'
                              ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300'
                              : uploadStatus === 'none'
                              ? 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300'
                              : 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300'
                          }`}
                        >
                          {uploaded}/{total}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          onClick={(e) => handleOpenLog(vehicle, e)}
                          aria-label="View activity log"
                          title="View activity log"
                        >
                          <NotebookTabs className="h-4 w-4" />
                        </button>

                        <button
                          className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          onClick={(e) => handleAddTrip(vehicle, e)}
                          aria-label="Add trip with this vehicle"
                          title="Add trip with this vehicle"
                        >
                          <Route className="h-4 w-4" />
                        </button>

                        <button
                          className="p-1.5 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                          onClick={(e) => handleOpenShareModal(vehicle, e)}
                          aria-label="Share vehicle via WhatsApp"
                          title="Share vehicle via WhatsApp"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pageCount > 1 && (
              <ReactPaginate
                pageCount={pageCount}
                onPageChange={handlePageClick}
                forcePage={currentPage}
                className="flex justify-center mt-6 gap-2"
                pageLinkClassName="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                previousLinkClassName="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                nextLinkClassName="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                activeLinkClassName="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300"
                disabledLinkClassName="opacity-50"
                previousLabel="<"
                nextLabel=">"
              />
            )}
            </>
          )}
        </>
      )}

      {/* Document Summary Panel */}
      <DocumentSummaryPanel
        isOpen={showDocumentPanel}
        onClose={() => setShowDocumentPanel(false)}
      />


      {/* WhatsApp Share Modal */}
      {showShareModal && selectedVehicleForShare && (
        <VehicleWhatsAppShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          vehicle={selectedVehicleForShare}
        />
      )}

      {/* Top Drivers Modal */}
      <TopDriversModal
        isOpen={showTopDriversModal}
        onClose={() => setShowTopDriversModal(false)}
        topDrivers={topDriversThisMonth}
      />

      {/* Activity Log Modal */}
      {showActivityLogModal && selectedVehicleForLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-display font-medium tracking-tight-plus text-gray-900 dark:text-gray-100">
                Activity Log - {selectedVehicleForLog.registration_number}
              </h3>
              <button
                onClick={() => {
                  setShowActivityLogModal(false);
                  setSelectedVehicleForLog(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <VehicleActivityLogTable vehicleId={selectedVehicleForLog.id} />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default VehiclesPage;
