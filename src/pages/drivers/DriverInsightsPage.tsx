import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  subMonths,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfMonth,
} from "date-fns";
import {
  ChevronLeft,
  Users,
  Calendar,
  IndianRupee,
  Package,
  Gauge,
  TrendingUp,
  BarChart2,
  BarChart3,
  Filter,
  Search,
  Download,
  RefreshCw,
  User,
  ChevronDown,
  ChevronUp,
  X,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Layout from "../../components/layout/Layout";
import LoadingScreen from "../../components/LoadingScreen";
import Button from "../../components/ui/Button";
import DriverSummaryModal from "../../components/drivers/DriverSummaryModal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { cn } from "../../utils/cn";
import { getTrips, getVehicles } from "../../utils/storage";
import { getDrivers } from "../../utils/api/drivers";
import type { Driver, Trip, Vehicle } from "@/types";
import { createLogger } from '../../utils/logger';

const logger = createLogger('DriverInsightsPage');

// Interface for driver performance metrics
interface DriverPerformance {
  driverId: string;
  name: string;
  totalTrips: number;
  totalDistance: number;
  totalFuel: number;
  avgMileage: number;
  totalExpenses: number;
  costPerKm: number;
  totalGrossWeight: number;
  tripDays: Set<string>;
  avgLoadPerTrip: number;
  driverUtilizationPercentage: number;
  lastTripDate: string | null;
}

const DriverInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<
    "thisWeek" | "thisMonth" | "lastMonth" | "lastThreeMonths" | "lastSixMonths" | "lastYear" | "thisYear" | "allTime" | "custom"
  >("thisMonth");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [tripCountMin, setTripCountMin] = useState<string>("");
  const [tripCountMax, setTripCountMax] = useState<string>("");
  const [driverStatus, setDriverStatus] = useState<"all" | "active" | "inactive">("all");
  const [performanceRating, setPerformanceRating] = useState<"all" | "excellent" | "good" | "average" | "poor">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDriverForModal, setSelectedDriverForModal] = useState<Driver | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);

  // Handle opening driver summary modal
  const handleViewDriverDetails = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      setSelectedDriverForModal(driver);
      setShowDriverModal(true);
    }
  };

  // Helper function to get performance rating based on cost per km
  const getPerformanceRating = (costPerKm: number): "excellent" | "good" | "average" | "poor" => {
    if (costPerKm < 8) return "excellent";
    if (costPerKm < 10) return "good";
    if (costPerKm < 12) return "average";
    return "poor";
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (dateRange !== "thisMonth") count++;
    if (selectedDriver !== "all") count++;
    if (selectedVehicle !== "all") count++;
    if (selectedWarehouse !== "all") count++;
    if (tripCountMin || tripCountMax) count++;
    if (driverStatus !== "all") count++;
    if (performanceRating !== "all") count++;
    if (searchTerm) count++;
    return count;
  }, [dateRange, selectedDriver, selectedVehicle, selectedWarehouse, tripCountMin, tripCountMax, driverStatus, performanceRating, searchTerm]);

  // Reset all filters
  const handleResetFilters = () => {
    setDateRange("thisMonth");
    setCustomDateRange({ start: "", end: "" });
    setSelectedDriver("all");
    setSelectedVehicle("all");
    setSelectedWarehouse("all");
    setTripCountMin("");
    setTripCountMax("");
    setDriverStatus("all");
    setPerformanceRating("all");
    setSearchTerm("");
  };
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [driversData, tripsData, vehiclesData] = await Promise.all([
          getDrivers(),
          getTrips(),
          getVehicles(),
        ]);

        setDrivers(driversData);
        setTrips(tripsData);
        setVehicles(vehiclesData);
      } catch (error) {
        logger.error("Error fetching data:", error);
        toast.error("Failed to load driver analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate date range based on filter
  const effectiveDateRange = useMemo(() => {
    const now = new Date();

    switch (dateRange) {
      case "thisWeek":
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }), // Monday start
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case "thisMonth":
        return {
          start: startOfMonth(now),
          end: now,
        };
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        };
      case "lastThreeMonths":
        return {
          start: subMonths(now, 3),
          end: now,
        };
      case "lastSixMonths":
        return {
          start: subMonths(now, 6),
          end: now,
        };
      case "lastYear":
        return {
          start: subMonths(now, 12),
          end: now,
        };
      case "thisYear":
        return {
          start: startOfYear(now),
          end: now,
        };
      case "custom":
        if (customDateRange.start && customDateRange.end) {
          return {
            start: new Date(customDateRange.start),
            end: new Date(customDateRange.end),
          };
        }
        // Fallback to this month if custom dates not set
        return {
          start: startOfMonth(now),
          end: now,
        };
      case "allTime":
        return {
          start: new Date(0), // January 1, 1970
          end: now,
        };
    }
  }, [dateRange, customDateRange]);
  const effectiveStart = effectiveDateRange.start;
  const effectiveEnd = effectiveDateRange.end;

  // Filter trips based on date range and driver selection
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Filter by date
      const tripDate = parseISO(trip.trip_start_date);
      if (
        !isValid(tripDate) ||
        tripDate < effectiveStart ||
        tripDate > effectiveEnd
      ) {
        return false;
      }

      // Filter by driver if selected
      if (selectedDriver !== "all" && trip.driver_id !== selectedDriver) {
        return false;
      }

      // Filter by vehicle if selected
      if (selectedVehicle !== "all" && trip.vehicle_id !== selectedVehicle) {
        return false;
      }

      return true;
    });
  }, [trips, effectiveStart, effectiveEnd, selectedDriver, selectedVehicle]);

  // Calculate driver performance metrics
  const driverPerformance = useMemo(() => {
    const performanceMap = new Map<string, DriverPerformance>();

    // Initialize with all drivers (even those with no trips)
    drivers.forEach((driver) => {
      performanceMap.set(driver.id || "", {
        driverId: driver.id || "",
        name: driver.name,
        totalTrips: 0,
        totalDistance: 0,
        totalFuel: 0,
        avgMileage: 0,
        totalExpenses: 0,
        costPerKm: 0,
        totalGrossWeight: 0,
        tripDays: new Set<string>(),
        avgLoadPerTrip: 0,
        driverUtilizationPercentage: 0,
        lastTripDate: null,
      });
    });

    // Process filtered trips
    filteredTrips.forEach((trip) => {
      const driverId = trip.driver_id;
      if (!driverId) return;

      const performance = performanceMap.get(driverId) || {
        driverId,
        name: drivers.find((d) => d.id === driverId)?.name || "Unknown",
        totalTrips: 0,
        totalDistance: 0,
        totalFuel: 0,
        avgMileage: 0,
        totalExpenses: 0,
        costPerKm: 0,
        totalGrossWeight: 0,
        tripDays: new Set<string>(),
        avgLoadPerTrip: 0,
        driverUtilizationPercentage: 0,
        lastTripDate: null,
      };

      const distance = trip.end_km - trip.start_km;
      const fuel = trip.fuel_quantity || 0;
      const expenses =
        (trip.total_fuel_cost || 0) + (trip.total_road_expenses || 0);
      const grossWeight = trip.gross_weight || 0;
      const tripStart = trip.trip_start_date
        ? trip.trip_start_date.slice(0, 10)
        : null;

      // Update metrics
      performance.totalTrips++;
      performance.totalDistance += distance;
      performance.totalFuel += fuel;
      performance.totalExpenses += expenses;
      performance.totalGrossWeight += grossWeight;
      if (tripStart) {
        performance.tripDays.add(tripStart);
      }

      // Update last trip date if newer
      const tripDate = trip.trip_end_date;
      if (
        tripDate &&
        (!performance.lastTripDate || tripDate > performance.lastTripDate)
      ) {
        performance.lastTripDate = tripDate;
      }

      performanceMap.set(driverId, performance);
    });

    // Calculate derived metrics
    performanceMap.forEach((performance) => {
      if (performance.totalFuel > 0) {
        performance.avgMileage =
          performance.totalDistance / performance.totalFuel;
      }

      if (performance.totalDistance > 0) {
        performance.costPerKm =
          performance.totalExpenses / performance.totalDistance;
      }

      performance.avgLoadPerTrip =
        performance.totalTrips > 0
          ? performance.totalGrossWeight / performance.totalTrips
          : 0;
      const totalDaysInPeriod =
        differenceInDays(effectiveEnd, effectiveStart) + 1;
      performance.driverUtilizationPercentage =
        totalDaysInPeriod > 0
          ? (performance.tripDays.size / totalDaysInPeriod) * 100
          : 0;
    });

    // Convert to array and apply all filters
    return Array.from(performanceMap.values())
      .filter((performance) => {
        // Filter by search term
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          if (!performance.name.toLowerCase().includes(lowerSearch)) {
            return false;
          }
        }

        // Filter by trip count range
        if (tripCountMin && performance.totalTrips < parseInt(tripCountMin)) {
          return false;
        }
        if (tripCountMax && performance.totalTrips > parseInt(tripCountMax)) {
          return false;
        }

        // Filter by driver status
        if (driverStatus !== "all") {
          const isActive = performance.totalTrips > 0;
          if (driverStatus === "active" && !isActive) return false;
          if (driverStatus === "inactive" && isActive) return false;
        }

        // Filter by performance rating
        if (performanceRating !== "all" && performance.costPerKm > 0) {
          const rating = getPerformanceRating(performance.costPerKm);
          if (rating !== performanceRating) return false;
        }

        return true;
      })
      .sort((a, b) => b.totalTrips - a.totalTrips);
  }, [drivers, filteredTrips, searchTerm, tripCountMin, tripCountMax, driverStatus, performanceRating, effectiveStart, effectiveEnd]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalDrivers = drivers.length;
    const activeDrivers = driverPerformance.filter(
      (p) => p.totalTrips > 0,
    ).length;

    let totalDistance = 0;
    let totalFuel = 0;
    let totalExpenses = 0;
    let avgLoadPerTripSum = 0;
    let utilizationSum = 0;

    driverPerformance.forEach((p) => {
      totalDistance += p.totalDistance;
      totalFuel += p.totalFuel;
      totalExpenses += p.totalExpenses;
      avgLoadPerTripSum += p.avgLoadPerTrip || 0;
      utilizationSum += p.driverUtilizationPercentage || 0;
    });

    const avgKmPerDay =
      totalDistance /
      Math.max(
        1,
        Math.round(
          (effectiveEnd.getTime() -
            effectiveStart.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

    const avgCostPerKm = totalDistance > 0 ? totalExpenses / totalDistance : 0;

    const avgLoadPerTrip =
      driverPerformance.length > 0
        ? avgLoadPerTripSum / driverPerformance.length
        : 0;
    const avgDriverUtilization =
      driverPerformance.length > 0
        ? utilizationSum / driverPerformance.length
        : 0;

    // Find top performing driver
    const topDriver =
      driverPerformance.length > 0
        ? [...driverPerformance]
            .filter((p) => p.totalTrips > 0)
            .sort((a, b) => a.costPerKm - b.costPerKm)[0]
        : null;

    return {
      totalDrivers,
      activeDrivers,
      avgKmPerDay,
      avgCostPerKm,
      avgLoadPerTrip,
      avgDriverUtilization,
      topDriver,
    };
  }, [drivers, driverPerformance, effectiveStart, effectiveEnd]);

  // Monthly performance data for charts
  const monthlyPerformanceData = useMemo(() => {
    const monthlyData: Record<
      string,
      {
        month: string;
        totalDistance: number;
        totalFuel: number;
        driverCount: number;
      }
    > = {};

    filteredTrips.forEach((trip) => {
      const tripDate = parseISO(trip.trip_start_date);
      if (!isValid(tripDate)) return;

      const monthKey = format(tripDate, "MMM yyyy");

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalDistance: 0,
          totalFuel: 0,
          driverCount: 0,
        };
      }

      monthlyData[monthKey].totalDistance += trip.end_km - trip.start_km;
      monthlyData[monthKey].totalFuel += trip.fuel_quantity || 0;

      // Count unique drivers
      const uniqueDrivers = new Set<string>();
      Object.values(monthlyData).forEach((data) => {
        filteredTrips.forEach((trip) => {
          if (trip.driver_id) {
            uniqueDrivers.add(trip.driver_id);
          }
        });
      });
      monthlyData[monthKey].driverCount = uniqueDrivers.size;
    });

    // Convert to array and sort by date
    return Object.values(monthlyData).sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
  }, [filteredTrips]);

  // Export data to Excel
  const handleExport = () => {
    setExportLoading(true);
    try {
      const exportData = driverPerformance.map((driver) => ({
        "Driver Name": driver.name,
        "Total Trips": driver.totalTrips,
        "Total Distance (km)": driver.totalDistance.toFixed(0),
        "Total Fuel (L)": driver.totalFuel.toFixed(2),
        "Avg Mileage (km/L)": driver.avgMileage.toFixed(2),
        "Total Expenses (₹)": driver.totalExpenses.toFixed(2),
        "Cost per KM (₹)": driver.costPerKm.toFixed(2),
        "Last Trip Date": driver.lastTripDate
          ? new Date(driver.lastTripDate).toLocaleDateString()
          : "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Driver Performance");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(
        blob,
        `Driver_Performance_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success("Export successful");
    } catch (error) {
      logger.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <>
      <LoadingScreen isLoading={loading} />
      <Layout>
        {/* Page Header */}
        <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
          <div className="flex items-center group">
            <BarChart3 className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Driver Insights</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-7">Analytics and performance metrics for your drivers</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/drivers")}
              icon={<ChevronLeft className="h-4 w-4" />}
            >
              Back to Drivers
            </Button>

            <Button
              variant="outline"
              onClick={handleExport}
              icon={<Download className="h-4 w-4" />}
              isLoading={exportLoading}
              disabled={driverPerformance.length === 0}
            >
              Export Data
            </Button>
          </div>
        </div>

        <div className={cn('space-y-6', loading && 'opacity-50 pointer-events-none')}>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              title="Total Drivers"
              value={summaryMetrics.totalDrivers}
              icon={<Users className="h-5 w-5 text-primary-600" />}
            />

            <StatCard
              title="Average KM/Day"
              value={Math.round(summaryMetrics.avgKmPerDay)}
              subtitle="km"
              icon={<Calendar className="h-5 w-5 text-primary-600" />}
            />

            <StatCard
              title="Average Cost/KM"
              value={`₹${summaryMetrics.avgCostPerKm.toFixed(2)}`}
              icon={<IndianRupee className="h-5 w-5 text-primary-600" />}
            />

            <StatCard
              title="Avg Load/Trip"
              value={
                summaryMetrics.avgLoadPerTrip
                  ? summaryMetrics.avgLoadPerTrip.toFixed(1)
                  : "0"
              }
              subtitle="tons"
              icon={<Package className="h-5 w-5 text-primary-600" />}
            />

            <StatCard
              title="Driver Utilization"
              value={
                summaryMetrics.avgDriverUtilization
                  ? `${summaryMetrics.avgDriverUtilization.toFixed(1)}%`
                  : "0%"
              }
              icon={<Gauge className="h-5 w-5 text-primary-600" />}
            />

            <StatCard
              title="Top Performing Driver"
              value={summaryMetrics.topDriver?.name || "N/A"}
              subtitle={
                summaryMetrics.topDriver
                  ? `₹${summaryMetrics.topDriver.costPerKm.toFixed(2)}/km`
                  : undefined
              }
              icon={<User className="h-5 w-5 text-primary-600" />}
            />
          </div>

          {/* Driver of the Month Highlight */}
          {summaryMetrics.topDriver && (
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-l-4 border-primary-500 p-4 rounded-lg shadow-sm scale-90 origin-top">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 bg-primary-500 p-2 rounded-full">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Driver of the Month
                    </h3>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      {summaryMetrics.topDriver.name}
                    </p>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                      <span className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-0.5" />
                        {summaryMetrics.topDriver.costPerKm.toFixed(2)}/km
                      </span>
                      <span className="flex items-center">
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                        {summaryMetrics.topDriver.totalTrips} trips
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  inputSize="sm"
                  onClick={() => handleViewDriverDetails(summaryMetrics.topDriver!.driverId)}
                >
                  View Details
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4">
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium text-white flex items-center">
                    <Filter className="h-5 w-5 mr-2" />
                    Filters
                  </h2>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                      {activeFiltersCount} active
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center px-3 py-1.5 border border-white/30 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center px-3 py-1.5 border border-white/30 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                  >
                    {showFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </button>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className="p-4 space-y-4 animate-slide-down">
                {/* Date and Basic Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Time Period</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as any)}
                    >
                      <option value="thisWeek">This Week</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="lastThreeMonths">Last 3 Months</option>
                      <option value="lastSixMonths">Last 6 Months</option>
                      <option value="lastYear">Last 12 Months</option>
                      <option value="thisYear">This Year</option>
                      <option value="allTime">All Time</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Driver</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                    >
                      <option value="all">All Drivers</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id || ""}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Vehicle</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={selectedVehicle}
                      onChange={(e) => setSelectedVehicle(e.target.value)}
                    >
                      <option value="all">All Vehicles</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id || ""}>
                          {vehicle.registration_number}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Warehouse Destination</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                    >
                      <option value="all">All Warehouses</option>
                      <option value="warehouse1">Warehouse 1 - Mumbai</option>
                      <option value="warehouse2">Warehouse 2 - Delhi</option>
                      <option value="warehouse3">Warehouse 3 - Bangalore</option>
                    </select>
                  </div>
                </div>

                {/* Custom Date Range */}
                {dateRange === "custom" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Input
                      label="Start Date"
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                    />
                  </div>
                )}

                {/* Advanced Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Driver Status</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={driverStatus}
                      onChange={(e) => setDriverStatus(e.target.value as any)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Performance Rating</label>
                    <select
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={performanceRating}
                      onChange={(e) => setPerformanceRating(e.target.value as any)}
                    >
                      <option value="all">All Ratings</option>
                      <option value="excellent">Excellent (&lt; ₹8/km)</option>
                      <option value="good">Good (₹8-10/km)</option>
                      <option value="average">Average (₹10-12/km)</option>
                      <option value="poor">Poor (&gt; ₹12/km)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Min Trips</label>
                    <input
                      type="number"
                      placeholder="Min trips"
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={tripCountMin}
                      onChange={(e) => setTripCountMin(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-700 mb-2">Max Trips</label>
                    <input
                      type="number"
                      placeholder="Max trips"
                      className="w-full px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={tripCountMax}
                      onChange={(e) => setTripCountMax(e.target.value)}
                    />
                  </div>
                </div>

                {/* Search */}
                <div className="grid grid-cols-1">
                  <label className="block text-sm font-semibold text-indigo-700 mb-2">Search by Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search drivers by name..."
                      className="w-full pl-10 px-3 py-2 border-2 border-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 transition-all shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Driver Performance Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Driver Performance
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Showing{" "}
                  {driverPerformance.filter((d) => d.totalTrips > 0).length}{" "}
                  of {drivers.length} drivers
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 text-primary-600 font-medium">
                      ({activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active)
                    </span>
                  )}
                </p>
              </div>

              <Button
                variant="outline"
                inputSize="sm"
                onClick={handleResetFilters}
                icon={<RefreshCw className="h-4 w-4" />}
                disabled={activeFiltersCount === 0}
              >
                Reset Filters
              </Button>
            </div>

            <div className="overflow-x-auto">
              {driverPerformance.filter((d) => d.totalTrips > 0).length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Driver
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Total Trips
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Distance
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Fuel
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Mileage
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Total Expenses
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Cost per KM
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Last Trip
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 whitespace-nowrap text-sm text-center"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {driverPerformance
                      .filter((driver) => driver.totalTrips > 0)
                      .map((driver) => (
                        <tr
                          key={driver.driverId}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-400" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {driver.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {driver.driverId.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {driver.totalTrips}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {driver.totalDistance.toLocaleString()} km
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {driver.totalFuel.toFixed(2)} L
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {driver.avgMileage > 0
                              ? `${driver.avgMileage.toFixed(2)} km/L`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            ₹
                            {driver.totalExpenses.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                            <span
                              className={
                                driver.costPerKm < 10
                                  ? "text-green-600"
                                  : driver.costPerKm < 15
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }
                            >
                              ₹{driver.costPerKm.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            {driver.lastTripDate
                              ? format(
                                  new Date(driver.lastTripDate),
                                  "dd MMM yyyy",
                                )
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                            <div className="flex justify-center space-x-2">
                              <Button
                                variant="outline"
                                inputSize="sm"
                                onClick={() => navigate(`/drivers/${driver.driverId}`)}
                              >
                                View Profile
                              </Button>
                              <Button
                                variant="outline"
                                inputSize="sm"
                                onClick={() => handleViewDriverDetails(driver.driverId)}
                              >
                                View Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16 bg-gray-50">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">
                    No driver activity found
                  </h3>
                  <p className="mt-2 text-gray-500">
                    {searchTerm
                      ? `No drivers matching "${searchTerm}" have recorded trips.`
                      : "No drivers have recorded trips in the selected time period."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-l-2 border-blue-500 pl-2">
                Distance Trend
              </h3>
              <div className="h-80">
                {monthlyPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyPerformanceData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ angle: -45, textAnchor: "end", fontSize: 12 }}
                        height={60}
                        tickMargin={10}
                      />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(value) =>
                          `${value.toLocaleString()} km`
                        }
                      />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalDistance"
                        name="Distance"
                        stroke="#4CAF50"
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <TrendingUp className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-l-2 border-blue-500 pl-2">
                Driver Performance Comparison
              </h3>
              <div className="h-80">
                {driverPerformance.filter((d) => d.totalTrips > 0).length >
                0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={driverPerformance
                        .filter((d) => d.totalTrips > 0)
                        .slice(0, 10)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          `₹${value.toFixed(2)}`,
                          "Cost per KM",
                        ]}
                        labelFormatter={(label) => `Driver: ${label}`}
                      />
                      <Bar
                        dataKey="costPerKm"
                        name="Cost per KM"
                        fill="#8884d8"
                        minPointSize={2}
                        label={{
                          position: "right",
                          formatter: (value: number) => `₹${value.toFixed(2)}`,
                        }}
                      >
                        {driverPerformance
                          .filter((d) => d.totalTrips > 0)
                          .slice(0, 10)
                          .map((driver, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                driver.costPerKm < 10
                                  ? "#4CAF50"
                                  : driver.costPerKm < 15
                                    ? "#FFC107"
                                    : "#EF5350"
                              }
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <BarChart2 className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">No data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
      
      {/* Driver Summary Modal */}
      {showDriverModal && selectedDriverForModal && (
        <DriverSummaryModal
          isOpen={showDriverModal}
          onClose={() => {
            setShowDriverModal(false);
            setSelectedDriverForModal(null);
          }}
          driver={selectedDriverForModal}
          trips={trips}
          vehicles={vehicles}
          maintenanceTasks={[]} // Add maintenance tasks if available
        />
      )}
    </>
  );
};

export default DriverInsightsPage;

