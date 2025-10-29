import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Users,
  Truck,
  DollarSign,
  Package,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  FileText,
  Fuel,
  MapPin,
  Clock,
  Wrench,
  BarChart3,
  PieChart as PieChartIcon,
  FileSpreadsheet,
  Eye,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Layout from '../../components/layout/Layout';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CompleteFixedReportingDashboard');

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportMetrics {
  totalRevenue: number;
  totalTrips: number;
  activeVehicles: number;
  activeDrivers: number;
  avgTripDistance: number;
  avgFuelEfficiency: number;
  maintenanceCosts: number;
  pendingMaintenance: number;
}

const CompleteFixedReportingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalTrips: 0,
    activeVehicles: 0,
    activeDrivers: 0,
    avgTripDistance: 0,
    avgFuelEfficiency: 0,
    maintenanceCosts: 0,
    pendingMaintenance: 0
  });
  const [chartData, setChartData] = useState<any>({
    tripTrends: [],
    vehicleUtilization: [],
    driverPerformance: [],
    expenseBreakdown: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [selectedDateRange, setSelectedDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);

  const updateDateRange = useCallback((rangeType: string) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (rangeType) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'thisWeek':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        end = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'last30Days':
        start = subDays(now, 30);
        end = now;
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : startOfMonth(now);
        end = customEndDate ? new Date(customEndDate) : endOfMonth(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    setDateRange({ startDate: start, endDate: end });
    setSelectedDateRange(rangeType);
  }, [customStartDate, customEndDate]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [metricsData, trends, utilization, performance, expenses] = await Promise.all([
        fetchMetrics(),
        fetchTripTrends(),
        fetchVehicleUtilization(),
        fetchDriverPerformance(),
        fetchExpenseBreakdown()
      ]);
      logger.debug('Dashboard data fetched successfully');
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchTripTrends, fetchVehicleUtilization, fetchDriverPerformance, fetchExpenseBreakdown]);

  // Initialize date range properly
  useEffect(() => {
    updateDateRange(selectedDateRange);
  }, [updateDateRange, selectedDateRange]);

  // Fetch data when date range changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [dateRange, activeTab, fetchDashboardData]);

  const fetchMetrics = useCallback(async () => {
    try {
      // Get trips for the selected period
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (tripsError) {
        logger.error('Error fetching trips:', tripsError);
      }

      // Calculate revenue (using a simple formula - adjust based on your business logic)
      const totalRevenue = trips?.reduce((sum, trip) => {
        const distance = (trip.end_km || 0) - (trip.start_km || 0);
        return sum + (distance * 10); // Example: ₹10 per km
      }, 0) || 0;

      const totalDistance = trips?.reduce((sum, trip) => 
        sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0;
      const avgDistance = trips?.length ? totalDistance / trips.length : 0;

      // Get active vehicles
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get active drivers
      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get maintenance data
      const { data: maintenance } = await supabase
        .from('maintenance_tasks')
        .select('actual_cost, status')
        .gte('start_date', dateRange.startDate.toISOString())
        .lte('start_date', dateRange.endDate.toISOString());

      const maintenanceCosts = maintenance?.reduce((sum, m) => sum + (m.actual_cost || 0), 0) || 0;
      const pendingMaintenance = maintenance?.filter(m => m.status === 'open').length || 0;

      setMetrics({
        totalRevenue: Math.round(totalRevenue),
        totalTrips: trips?.length || 0,
        activeVehicles: vehicleCount || 0,
        activeDrivers: driverCount || 0,
        avgTripDistance: Math.round(avgDistance),
        avgFuelEfficiency: 8.5,
        maintenanceCosts: Math.round(maintenanceCosts),
        pendingMaintenance
      });

      return true;
    } catch (error) {
      logger.error('Error in fetchMetrics:', error);
      return false;
    }
  }, [dateRange]);

  const fetchTripTrends = useCallback(async () => {
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('created_at, start_km, end_km')
        .gte('created_at', subMonths(dateRange.endDate, 6).toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .order('created_at');

      if (error) {
        logger.error('Error fetching trip trends:', error);
        return;
      }

      // Group by date
      const grouped = trips?.reduce((acc: any, trip) => {
        const date = format(new Date(trip.created_at), 'MMM dd');
        if (!acc[date]) {
          acc[date] = { date, trips: 0, revenue: 0 };
        }
        acc[date].trips++;
        const distance = (trip.end_km || 0) - (trip.start_km || 0);
        acc[date].revenue += distance * 10;
        return acc;
      }, {}) || {};

      const trendData = Object.values(grouped).slice(-7); // Last 7 days
      setChartData((prev: any) => ({ ...prev, tripTrends: trendData }));
      return true;
    } catch (error) {
      logger.error('Error in fetchTripTrends:', error);
      return false;
    }
  }, [dateRange]);

  const fetchVehicleUtilization = useCallback(async () => {
    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, registration_number')
        .eq('status', 'active')
        .limit(5);

      if (error) {
        logger.error('Error fetching vehicles:', error);
        return;
      }

      const utilizationData = await Promise.all(
        (vehicles || []).map(async (vehicle) => {
          const { count } = await supabase
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .eq('vehicle_id', vehicle.id)
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString());

          const utilization = Math.min(((count || 0) / 30) * 100, 100);
          return {
            vehicle: vehicle.registration_number.slice(0, 10),
            trips: count || 0,
            utilization: Math.round(utilization)
          };
        })
      );

      setChartData((prev: any) => ({ ...prev, vehicleUtilization: utilizationData }));
      return true;
    } catch (error) {
      logger.error('Error in fetchVehicleUtilization:', error);
      return false;
    }
  }, [dateRange]);

  const fetchDriverPerformance = useCallback(async () => {
    try {
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select('id, name')
        .eq('status', 'active')
        .limit(5);

      if (error) {
        logger.error('Error fetching drivers:', error);
        return;
      }

      const performanceData = await Promise.all(
        (drivers || []).map(async (driver) => {
          const { data: trips } = await supabase
            .from('trips')
            .select('start_km, end_km, total_fuel_cost')
            .eq('driver_id', driver.id)
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString());

          const totalDistance = trips?.reduce((sum, trip) => 
            sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0;
          const efficiency = trips?.length ? totalDistance / trips.length : 0;

          return {
            driver: driver.name?.split(' ')[0] || 'Unknown',
            trips: trips?.length || 0,
            efficiency: Math.round(efficiency)
          };
        })
      );

      setChartData((prev: any) => ({ ...prev, driverPerformance: performanceData }));
      return true;
    } catch (error) {
      logger.error('Error in fetchDriverPerformance:', error);
      return false;
    }
  }, [dateRange]);

  const fetchExpenseBreakdown = useCallback(async () => {
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('total_fuel_cost, total_road_expenses, driver_expense, breakdown_expense')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        logger.error('Error fetching expenses:', error);
        return;
      }

      const expenses = {
        Fuel: 0,
        Road: 0,
        Driver: 0,
        Breakdown: 0,
        Maintenance: metrics.maintenanceCosts
      };

      trips?.forEach(trip => {
        expenses.Fuel += trip.total_fuel_cost || 0;
        expenses.Road += trip.total_road_expenses || 0;
        expenses.Driver += trip.driver_expense || 0;
        expenses.Breakdown += trip.breakdown_expense || 0;
      });

      const expenseData = Object.entries(expenses)
        .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
        .filter(item => item.amount > 0);

      setChartData((prev: any) => ({ ...prev, expenseBreakdown: expenseData }));
      return true;
    } catch (error) {
      logger.error('Error in fetchExpenseBreakdown:', error);
      return false;
    }
  }, [dateRange, metrics.maintenanceCosts]);

  const generatePDFReport = async (reportType: string) => {
    setGeneratingReport(reportType);
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add colorful header with gradient effect
      pdf.setFillColor(59, 130, 246); // Blue background
      pdf.rect(0, 0, pageWidth, 50, 'F');
      
      // White text on blue background
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AVS Fleet Management', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Intelligent Fleet Solutions', pageWidth / 2, 30, { align: 'center' });
      
      // Report type with accent color
      pdf.setFillColor(16, 185, 129); // Green accent
      pdf.rect(0, 50, pageWidth, 20, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(reportType.replace(/-/g, ' ').toUpperCase(), pageWidth / 2, 62, { align: 'center' });
      
      // Date and period info with subtle background
      pdf.setFillColor(249, 250, 251); // Light gray
      pdf.rect(0, 70, pageWidth, 25, 'F');
      
      pdf.setTextColor(75, 85, 99);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, pageWidth / 2, 82, { align: 'center' });
      pdf.text(`Period: ${format(dateRange.startDate, 'dd/MM/yyyy')} to ${format(dateRange.endDate, 'dd/MM/yyyy')}`, pageWidth / 2, 90, { align: 'center' });
      
      let yPosition = 110;

      // Key Metrics Section with colored cards
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('📊 Key Performance Indicators', 14, yPosition);
      yPosition += 15;

      // Create colored metric cards
      const metricCards = [
        { label: 'Total Revenue', value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`, color: [34, 197, 94] }, // Green
        { label: 'Total Trips', value: metrics.totalTrips.toString(), color: [59, 130, 246] }, // Blue
        { label: 'Active Vehicles', value: metrics.activeVehicles.toString(), color: [168, 85, 247] }, // Purple
        { label: 'Active Drivers', value: metrics.activeDrivers.toString(), color: [245, 158, 11] } // Orange
      ];

      metricCards.forEach((metric, index) => {
        const x = 14 + (index % 2) * 90;
        const y = yPosition + Math.floor(index / 2) * 25;
        
        // Colored background
        pdf.setFillColor(...metric.color);
        pdf.roundedRect(x, y, 80, 20, 3, 3, 'F');
        
        // White text
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(metric.label, x + 5, y + 8);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(metric.value, x + 5, y + 16);
      });

      yPosition += 60;

      // Executive Summary Section
      pdf.setFillColor(239, 246, 255); // Light blue background
      pdf.rect(14, yPosition, pageWidth - 28, 40, 'F');
      
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📋 Executive Summary', 20, yPosition + 12);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      
      const summaryText = [
        `This comprehensive ${reportType.replace(/-/g, ' ')} report provides detailed insights into your fleet operations.`,
        `During the selected period, your fleet generated ₹${metrics.totalRevenue.toLocaleString('en-IN')} in revenue through ${metrics.totalTrips} completed trips.`,
        `With ${metrics.activeVehicles} active vehicles and ${metrics.activeDrivers} drivers, your fleet utilization shows strong operational efficiency.`,
        `The data presented below is sourced directly from your Supabase database and reflects real-time operational metrics.`
      ];
      
      summaryText.forEach((text, index) => {
        pdf.text(text, 20, yPosition + 20 + (index * 5));
      });

      yPosition += 50;

      // Detailed Analysis Section
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('📈 Detailed Analysis', 14, yPosition);
      yPosition += 15;

      // Add specific report content based on type
      switch (reportType) {
        case 'trip-summary':
          await addTripSummaryContent(pdf, yPosition, dateRange);
          break;
        case 'week-comparison':
        case 'month-comparison':
          await addComparisonContent(pdf, yPosition, reportType, dateRange);
          break;
        case 'fuel-analysis':
          await addFuelAnalysisContent(pdf, yPosition, dateRange);
          break;
        case 'expense-report':
          await addExpenseReportContent(pdf, yPosition, dateRange);
          break;
        default:
          await addGenericReportContent(pdf, yPosition, reportType, dateRange);
      }

      // Add footer with company branding
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Footer background
        pdf.setFillColor(31, 41, 55);
        pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Footer text
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        pdf.text('© 2024 AVS - Auto Vital Solution | Intelligent Fleet Management', 14, pageHeight - 8);
        pdf.text('Generated by AVS Fleet Management System', pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      // Save the PDF
      pdf.save(`AVS-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      // Show success message
      alert('Enhanced report generated successfully!');
      
    } catch (error) {
      logger.error('Error generating PDF:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGeneratingReport(null);
    }
  };

  // Helper function to add trip summary content
  const addTripSummaryContent = async (pdf: any, yPosition: number, dateRange: any) => {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(registration_number),
          driver:drivers(name)
        `)
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .limit(50);

      if (trips && trips.length > 0) {
        // Summary statistics
        const totalDistance = trips.reduce((sum, trip) => 
          sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0);
        const totalFuel = trips.reduce((sum, trip) => 
          sum + (trip.total_fuel_cost || 0), 0);
        const avgDistance = trips.length ? totalDistance / trips.length : 0;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Trip Summary Statistics', 14, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`• Total Distance Covered: ${totalDistance.toFixed(0)} km`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Total Fuel Cost: ₹${totalFuel.toFixed(2)}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Average Distance per Trip: ${avgDistance.toFixed(1)} km`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Fuel Efficiency: ${totalDistance > 0 ? (totalDistance / totalFuel).toFixed(2) : 0} km/₹`, 20, yPosition);
        yPosition += 15;

        // Trip details table
        const tableData = trips.slice(0, 20).map(trip => [
          format(new Date(trip.created_at), 'dd/MM/yy'),
          trip.vehicle?.registration_number || 'N/A',
          trip.driver?.name || 'N/A',
          `${trip.from_location || 'N/A'} → ${trip.to_location || 'N/A'}`,
          `${((trip.end_km || 0) - (trip.start_km || 0)).toFixed(0)} km`,
          `₹${(trip.total_fuel_cost || 0).toFixed(2)}`
        ]);

        if (tableData.length > 0) {
          pdf.autoTable({
            head: [['Date', 'Vehicle', 'Driver', 'Route', 'Distance', 'Fuel Cost']],
            body: tableData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { 
              fillColor: [59, 130, 246],
              textColor: [255, 255, 255],
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [249, 250, 251] }
          });
        }
      } else {
        pdf.setFontSize(10);
        pdf.setTextColor(239, 68, 68);
        pdf.text('No trip data available for the selected period.', 14, yPosition);
      }
    } catch (error) {
      logger.error('Error adding trip summary:', error);
    }
  };

  // Helper function to add comparison content
  const addComparisonContent = async (pdf: any, yPosition: number, reportType: string, dateRange: any) => {
    try {
      let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;
      
      if (reportType === 'week-comparison') {
        currentPeriodStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        currentPeriodEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        previousPeriodStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
        previousPeriodEnd = endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
      } else {
        currentPeriodStart = startOfMonth(new Date());
        currentPeriodEnd = endOfMonth(new Date());
        previousPeriodStart = startOfMonth(subMonths(new Date(), 1));
        previousPeriodEnd = endOfMonth(subMonths(new Date(), 1));
      }

      const { data: currentTrips } = await supabase
        .from('trips')
        .select('*')
        .gte('created_at', currentPeriodStart.toISOString())
        .lte('created_at', currentPeriodEnd.toISOString());

      const { data: previousTrips } = await supabase
        .from('trips')
        .select('*')
        .gte('created_at', previousPeriodStart.toISOString())
        .lte('created_at', previousPeriodEnd.toISOString());

      const calculateMetrics = (trips: any[]) => {
        return {
          trips: trips?.length || 0,
          distance: trips?.reduce((sum, trip) => sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0) || 0,
          fuel: trips?.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0) || 0,
          revenue: trips?.reduce((sum, trip) => sum + ((trip.end_km || 0) - (trip.start_km || 0)) * 10, 0) || 0
        };
      };

      const current = calculateMetrics(currentTrips || []);
      const previous = calculateMetrics(previousTrips || []);

      const calculatePercentChange = (old: number, newVal: number) => {
        if (old === 0) return newVal > 0 ? 100 : 0;
        return ((newVal - old) / old) * 100;
      };

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text('Period-over-Period Comparison', 14, yPosition);
      yPosition += 15;

      const comparisonData = [
        ['Metric', reportType === 'week-comparison' ? 'This Week' : 'This Month', 
         reportType === 'week-comparison' ? 'Last Week' : 'Last Month', 'Change', '% Change'],
        ['Total Trips', current.trips.toString(), previous.trips.toString(), 
         (current.trips - previous.trips).toString(),
         `${calculatePercentChange(previous.trips, current.trips).toFixed(1)}%`],
        ['Distance (km)', current.distance.toFixed(0), previous.distance.toFixed(0),
         (current.distance - previous.distance).toFixed(0),
         `${calculatePercentChange(previous.distance, current.distance).toFixed(1)}%`],
        ['Revenue (₹)', current.revenue.toFixed(0), previous.revenue.toFixed(0),
         (current.revenue - previous.revenue).toFixed(0),
         `${calculatePercentChange(previous.revenue, current.revenue).toFixed(1)}%`],
        ['Fuel Cost (₹)', current.fuel.toFixed(2), previous.fuel.toFixed(2),
         (current.fuel - previous.fuel).toFixed(2),
         `${calculatePercentChange(previous.fuel, current.fuel).toFixed(1)}%`]
      ];

      pdf.autoTable({
        head: [comparisonData[0]],
        body: comparisonData.slice(1),
        startY: yPosition,
        theme: 'striped',
        headStyles: { 
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontSize: 9
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });
    } catch (error) {
      logger.error('Error adding comparison content:', error);
    }
  };

  // Helper function to add fuel analysis content
  const addFuelAnalysisContent = async (pdf: any, yPosition: number, dateRange: any) => {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select('total_fuel_cost, start_km, end_km, vehicle_id')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (trips && trips.length > 0) {
        const totalFuel = trips.reduce((sum, trip) => sum + (trip.total_fuel_cost || 0), 0);
        const totalDistance = trips.reduce((sum, trip) => 
          sum + ((trip.end_km || 0) - (trip.start_km || 0)), 0);
        const avgFuelCost = trips.length ? totalFuel / trips.length : 0;
        const fuelEfficiency = totalFuel > 0 ? totalDistance / totalFuel : 0;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Fuel Analysis Summary', 14, yPosition);
        yPosition += 15;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`• Total Fuel Expenditure: ₹${totalFuel.toFixed(2)}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Average Fuel Cost per Trip: ₹${avgFuelCost.toFixed(2)}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Fuel Efficiency: ${fuelEfficiency.toFixed(2)} km/₹`, 20, yPosition);
        yPosition += 6;
        pdf.text(`• Total Distance Covered: ${totalDistance.toFixed(0)} km`, 20, yPosition);
      } else {
        pdf.setFontSize(10);
        pdf.setTextColor(239, 68, 68);
        pdf.text('No fuel data available for the selected period.', 14, yPosition);
      }
    } catch (error) {
      logger.error('Error adding fuel analysis:', error);
    }
  };

  // Helper function to add expense report content
  const addExpenseReportContent = async (pdf: any, yPosition: number, dateRange: any) => {
    try {
      const { data: trips } = await supabase
        .from('trips')
        .select('total_fuel_cost, total_road_expenses, driver_expense, breakdown_expense, unloading_expense, miscellaneous_expense')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (trips && trips.length > 0) {
        const expenses = {
          'Fuel': 0,
          'Road Expenses': 0,
          'Driver Expenses': 0,
          'Breakdown': 0,
          'Unloading': 0,
          'Miscellaneous': 0
        };

        trips.forEach(trip => {
          expenses['Fuel'] += trip.total_fuel_cost || 0;
          expenses['Road Expenses'] += trip.total_road_expenses || 0;
          expenses['Driver Expenses'] += trip.driver_expense || 0;
          expenses['Breakdown'] += trip.breakdown_expense || 0;
          expenses['Unloading'] += trip.unloading_expense || 0;
          expenses['Miscellaneous'] += trip.miscellaneous_expense || 0;
        });

        const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Expense Breakdown Analysis', 14, yPosition);
        yPosition += 15;

        const expenseData = Object.entries(expenses)
          .filter(([_, amount]) => amount > 0)
          .map(([category, amount]) => [
            category,
            `₹${amount.toFixed(2)}`,
            `${((amount / totalExpenses) * 100).toFixed(1)}%`
          ]);

        if (expenseData.length > 0) {
          pdf.autoTable({
            head: [['Expense Category', 'Amount', 'Percentage']],
            body: expenseData,
            startY: yPosition,
            theme: 'grid',
            headStyles: { 
              fillColor: [239, 68, 68],
              textColor: [255, 255, 255],
              fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [254, 242, 242] }
          });
        }
      } else {
        pdf.setFontSize(10);
        pdf.setTextColor(239, 68, 68);
        pdf.text('No expense data available for the selected period.', 14, yPosition);
      }
    } catch (error) {
      logger.error('Error adding expense report:', error);
    }
  };

  // Helper function to add generic report content
  const addGenericReportContent = async (pdf: any, yPosition: number, reportType: string, dateRange: any) => {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(`${reportType.replace(/-/g, ' ').toUpperCase()} Analysis`, 14, yPosition);
    yPosition += 15;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('This report provides comprehensive insights into your fleet operations.', 14, yPosition);
    yPosition += 6;
    pdf.text('All data is sourced from your live Supabase database and reflects current operational status.', 14, yPosition);
    yPosition += 6;
    pdf.text('For more detailed analysis, please contact your fleet management team.', 14, yPosition);
  };

  const reportTypes = [
    {
      id: 'week-comparison',
      name: 'Weekly Comparison',
      description: 'This week vs last week',
      icon: <TrendingUp className="h-4 w-4" />,
      category: 'comparison'
    },
    {
      id: 'month-comparison',
      name: 'Monthly Comparison',
      description: 'Month-over-month analysis',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'comparison'
    },
    {
      id: 'year-comparison',
      name: 'Yearly Comparison',
      description: 'Year-over-year analysis',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      category: 'comparison'
    },
    {
      id: 'trip-summary',
      name: 'Trip Summary',
      description: 'All trip details',
      icon: <Package className="h-4 w-4" />,
      category: 'operations'
    },
    {
      id: 'vehicle-utilization',
      name: 'Vehicle Utilization',
      description: 'Vehicle usage patterns',
      icon: <Truck className="h-4 w-4" />,
      category: 'operations'
    },
    {
      id: 'driver-performance',
      name: 'Driver Performance',
      description: 'Driver efficiency',
      icon: <Users className="h-4 w-4" />,
      category: 'operations'
    },
    {
      id: 'fuel-analysis',
      name: 'Fuel Analysis',
      description: 'Fuel usage & costs',
      icon: <Fuel className="h-4 w-4" />,
      category: 'financial'
    },
    {
      id: 'expense-report',
      name: 'Expense Report',
      description: 'All expenses',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'financial'
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      description: 'Service schedules',
      icon: <Wrench className="h-4 w-4" />,
      category: 'maintenance'
    },
    {
      id: 'compliance',
      name: 'Compliance',
      description: 'Document validity',
      icon: <FileText className="h-4 w-4" />,
      category: 'compliance'
    }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header - Fixed to match AVS style */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Activity className="h-6 w-6 mr-2 text-primary-600" />
              Reporting & Analytics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visual insights and downloadable reports</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              Visual Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Download Reports
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <select
            value={selectedDateRange}
            onChange={(e) => updateDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="thisWeek">This Week</option>
            <option value="lastWeek">Last Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last30Days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {selectedDateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  if (e.target.value && customEndDate) {
                    updateDateRange('custom');
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  if (customStartDate && e.target.value) {
                    updateDateRange('custom');
                  }
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="ml-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Visual Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {/* Metrics Grid - Updated with Rupees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Revenue</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    ₹{metrics.totalRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Trips</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.totalTrips}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Vehicles</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.activeVehicles}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Truck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Drivers</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{metrics.activeDrivers}</p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trip Trends */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Trip Trends</h3>
              {chartData.tripTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.tripTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip formatter={(value: any, name: string) => 
                      name === 'Revenue' ? `₹${value}` : value
                    } />
                    <Legend />
                    <Line type="monotone" dataKey="trips" stroke="#3B82F6" name="Trips" strokeWidth={2} />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No data available for the selected period
                </div>
              )}
            </div>

            {/* Vehicle Utilization */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Vehicle Utilization</h3>
              {chartData.vehicleUtilization.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.vehicleUtilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="vehicle" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Bar dataKey="utilization" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No vehicle data available
                </div>
              )}
            </div>

            {/* Driver Performance */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Driver Performance</h3>
              {chartData.driverPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.driverPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="driver" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <Tooltip formatter={(value: any) => `${value} km/₹`} />
                    <Bar dataKey="efficiency" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No driver data available
                </div>
              )}
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Expense Breakdown</h3>
              {chartData.expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.category}: ₹${entry.amount}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {chartData.expenseBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No expense data available
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Download Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          {/* Quick Downloads */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Downloads</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {reportTypes.slice(0, showAllReports ? reportTypes.length : 5).map((report) => (
                <button
                  key={report.id}
                  onClick={() => generatePDFReport(report.id)}
                  disabled={generatingReport === report.id}
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all hover:shadow-md disabled:opacity-50"
                >
                  <div className={`p-3 rounded-lg mb-2 ${
                    report.category === 'comparison' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    report.category === 'financial' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    report.category === 'operations' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                    report.category === 'maintenance' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      report.icon
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{report.description}</span>
                </button>
              ))}
            </div>
            
            {!showAllReports && reportTypes.length > 5 && (
              <button
                onClick={() => setShowAllReports(true)}
                className="mt-4 flex items-center justify-center w-full py-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Show All Reports ({reportTypes.length - 5} more)
              </button>
            )}
            
            {showAllReports && (
              <button
                onClick={() => setShowAllReports(false)}
                className="mt-4 flex items-center justify-center w-full py-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </button>
            )}
          </div>

          {/* Categorized Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Smart Comparisons */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Smart Comparisons
              </h3>
              <div className="space-y-2">
                {reportTypes.filter(r => r.category === 'comparison').map(report => (
                  <button
                    key={report.id}
                    onClick={() => generatePDFReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex justify-between items-center group"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200">{report.name}</span>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
                    ) : (
                      <Download className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Financial Reports */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Financial Reports
              </h3>
              <div className="space-y-2">
                {reportTypes.filter(r => r.category === 'financial').map(report => (
                  <button
                    key={report.id}
                    onClick={() => generatePDFReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex justify-between items-center group"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200">{report.name}</span>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
                    ) : (
                      <Download className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Operations Reports */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Operations Reports
              </h3>
              <div className="space-y-2">
                {reportTypes.filter(r => r.category === 'operations').map(report => (
                  <button
                    key={report.id}
                    onClick={() => generatePDFReport(report.id)}
                    disabled={generatingReport === report.id}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex justify-between items-center group"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200">{report.name}</span>
                    {generatingReport === report.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
                    ) : (
                      <Download className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default CompleteFixedReportingDashboard;
