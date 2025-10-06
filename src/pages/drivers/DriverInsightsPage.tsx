import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  subMonths,
  differenceInDays,
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
    "thisMonth" | "lastThreeMonths" | "lastSixMonths" | "lastYear" | "allTime"
  >("allTime");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState(true);
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
        console.error("Error fetching data:", error);
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
      case "thisMonth":
        return {
          start: startOfMonth(now),
          end: now,
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
      case "allTime":
        return {
          start: new Date(0), // January 1, 1970
          end: now,
        };
    }
  }, [dateRange]);
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

      return true;
    });
  }, [trips, effectiveStart, effectiveEnd, selectedDriver]);

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

    // Convert to array and filter by search term
    return Array.from(performanceMap.values())
      .filter((performance) => {
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return performance.name.toLowerCase().includes(lowerSearch);
      })
      .sort((a, b) => b.totalTrips - a.totalTrips);
  }, [drivers, filteredTrips, searchTerm, effectiveStart, effectiveEnd]);

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
      console.error("Export error:", error);
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

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex flex-wrap gap-4 justify-between">
              <div className="flex items-center border-l-2 border-blue-500 pl-2">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Filter className="h-5 w-5 mr-2 text-primary-500" />
                  Filters
                </h2>
              </div>

              <Button
                variant="outline"
                inputSize="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Time Period"
                  options={[
                    { value: "thisMonth", label: "This Month" },
                    { value: "lastThreeMonths", label: "Last 3 Months" },
                    { value: "lastSixMonths", label: "Last 6 Months" },
                    { value: "lastYear", label: "Last 12 Months" },
                    { value: "allTime", label: "All Time" },
                  ]}
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                />

                <Select
                  label="Driver"
                  options={[
                    { value: "all", label: "All Drivers" },
                    ...drivers.map((driver) => ({
                      value: driver.id || "",
                      label: driver.name,
                    })),
                  ]}
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                />

                <Input
                  label="Search"
                  placeholder="Search drivers..."
                  icon={<Search className="h-4 w-4" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                  active drivers
                </p>
              </div>

              <Button
                variant="outline"
                inputSize="sm"
                onClick={() => {
                  setDateRange("allTime");
                  setSelectedDriver("all");
                  setSearchTerm("");
                }}
                icon={<RefreshCw className="h-4 w-4" />}
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

          {/* Driver of the Month */}
          {summaryMetrics.topDriver && (
            <div className="fixed bottom-6 right-6 bg-white p-4 rounded-lg shadow-lg border-l-4 border-primary-500 max-w-xs animate-slide-up z-10">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-primary-100 p-2 rounded-full">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    Driver of the Month
                  </h3>
                  <p className="text-lg font-bold text-primary-600">
                    {summaryMetrics.topDriver.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{summaryMetrics.topDriver.costPerKm.toFixed(2)}/km •{" "}
                    {summaryMetrics.topDriver.totalTrips} trips
                  </p>
                </div>
              </div>
            </div>
          )}
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

