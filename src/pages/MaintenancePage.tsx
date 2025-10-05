import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { MaintenanceTask, Vehicle } from "@/types";
import {
  getDateRangeForFilter,
  getMaintenanceMetricsWithComparison,
} from "../utils/maintenanceAnalytics";
import { getTasks } from "../utils/maintenanceStorage";
import { getVehicles } from "../utils/storage";
import { PlusCircle, BarChart3, Wrench, Calendar } from "lucide-react";
import Button from "../components/ui/Button";
import KPIPanel from "../components/maintenance/KPIPanel";
import MaintenanceCalendar from "../components/maintenance/MaintenanceCalendar";
import MaintenanceTaskList from "../components/maintenance/MaintenanceTaskList";
import { useQuery } from "@tanstack/react-query";
const MaintenancePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [dateRangeFilter] = useState("allTime");
  const [customDateRange, setCustomDateRange] = useState({
    start: "",
    end: "",
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [metrics, setMetrics] = useState<any>({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasksThisMonth: 0,
    averageCompletionTime: 0,
    averageCost: 0,
    totalExpenditure: 0,
    monthlyExpenditure: [],
    expenditureByVehicle: [],
    expenditureByVendor: [],
    taskTypeDistribution: [],
    vehicleDowntime: [],
    kmBetweenMaintenance: [],
    previousPeriodComparison: {
      totalTasks: 0,
      totalExpenditure: 0,
      percentChange: 0,
    },
  });
  // Initialize custom date range values and handle action=new
  useEffect(() => {
    const today = new Date();
    setCustomDateRange({
      start: "2020-01-01",
      end: today.toISOString().split("T")[0],
    });
    // Check query parameters for action=new
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get("action");
    if (action === "new") {
      // Navigate to new maintenance task page
      navigate("/maintenance/new");
      // Clear query params
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location.search, navigate]);
  // Use React Query to fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["maintenanceTasks"],
    queryFn: getTasks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // Use React Query to fetch vehicles
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // Calculate metrics whenever date range changes or data is loaded
  useEffect(() => {
    if (!tasksLoading && !vehiclesLoading && tasks && vehicles) {
      calculateMetrics(tasks, vehicles, dateRangeFilter);
    }
  }, [
    dateRangeFilter,
    customDateRange,
    tasks,
    vehicles,
    tasksLoading,
    vehiclesLoading,
  ]);
  const calculateMetrics = async (
    tasksData: MaintenanceTask[],
    vehiclesData: Vehicle[],
    filter: string,
  ) => {
    try {
      const dateRange = getDateRangeForFilter(
        filter,
        customDateRange.start,
        customDateRange.end,
      );
      // Get metrics with comparison to previous period
      const metricsData = await getMaintenanceMetricsWithComparison(
        dateRange,
        tasksData,
        vehiclesData,
      );
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error calculating maintenance metrics:", error);
    }
  };
  const loading = tasksLoading || vehiclesLoading;
  return (
    <Layout>
      {/* Page Header */}
      <div className="rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6">
        <div className="flex items-center group">
          <Wrench className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 transition" />
          <h1 className="text-2xl font-display font-semibold tracking-tight-plus text-gray-900 dark:text-gray-100">
            {t("maintenance.title")}
          </h1>
        </div>
        <p className="text-sm font-sans text-gray-500 dark:text-gray-400 mt-1 ml-7">
          {t("maintenance.description")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => navigate("/maintenance/new")}
            icon={<PlusCircle className="h-4 w-4" />}
            inputSize="sm"
          >
            {t("maintenance.newTask")}
          </Button>
          <Button
            onClick={() => navigate("/parts-health-analytics")}
            icon={<BarChart3 className="h-4 w-4" />}
            variant="outline"
            inputSize="sm"
          >
            {t("maintenance.partsHealthAnalytics")}
          </Button>
          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <Button
              onClick={() => setViewMode("calendar")}
              variant={viewMode === "calendar" ? "default" : "outline"}
              inputSize="sm"
              icon={<Calendar className="h-4 w-4" />}
              className="rounded-none border-0"
            >
              {t("maintenance.calendar")}
            </Button>
            <Button
              onClick={() => setViewMode("list")}
              variant={viewMode === "list" ? "default" : "outline"}
              inputSize="sm"
              icon={<Wrench className="h-4 w-4" />}
              className="rounded-none border-0"
            >
              Task List
            </Button>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="ml-3 font-sans text-gray-600">
            Loading maintenance analytics...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Panel */}
          <KPIPanel
            totalTasks={metrics.totalTasks}
            pendingTasks={metrics.pendingTasks}
            averageCompletionTime={metrics.averageCompletionTime}
            completedTasksThisMonth={metrics.completedTasksThisMonth}
            averageCost={metrics.averageCost}
            totalExpenditure={metrics.totalExpenditure}
            previousPeriodComparison={metrics.previousPeriodComparison}
          />
          
          {/* View Content */}
          {viewMode === "calendar" ? (
            <MaintenanceCalendar
              tasks={tasks || []}
              vehicles={vehicles || []}
            />
          ) : (
            <MaintenanceTaskList
              tasks={tasks || []}
              vehicles={vehicles || []}
              onViewTask={(task) => {
                // Navigate to task details or open modal
                console.log('View task:', task);
              }}
              onEditTask={(task) => {
                // Navigate to edit task
                navigate(`/maintenance/edit/${task.id}`);
              }}
            />
          )}
        </div>
      )}
    </Layout>
  );
};
export default MaintenancePage;
