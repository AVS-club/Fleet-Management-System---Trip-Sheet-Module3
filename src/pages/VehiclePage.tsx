import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getVehicle, getVehicleStats, getTrips } from "../utils/storage";
import { getSignedDocumentUrl } from "../utils/supabaseStorage";
import { updateVehicle } from "../utils/api/vehicles";
import { supabase } from "../utils/supabaseClient";
import {
  Truck,
  Calendar,
  PenTool as PenToolIcon,
  AlertTriangle,
  ChevronLeft,
  Fuel,
  FileText,
  Shield,
  Download,
  Share2,
  FileDown,
  Eye,
  Clock,
  Info,
  BarChart2,
  Database,
  IndianRupee,
  User,
  RefreshCw,
  TrendingUp,
  Activity,
  Wrench,
  MapPin,
  Route,
  DollarSign,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  PieChart,
  LineChart,
  BarChart3,
  Settings,
  FileCheck,
  Gauge,
  Thermometer,
  Droplets,
  Car,
  Users,
  Star,
  Award,
  Timer,
  Navigation,
} from "lucide-react";
import { Vehicle, Trip, Driver } from "@/types";
import Button from "../components/ui/Button";
import MileageChart from "../components/dashboard/MileageChart";
import VehicleForm from "../components/vehicles/VehicleForm";
import {
  generateVehiclePDF,
  downloadVehicleDocuments,
  createShareableVehicleLink,
} from "../utils/exportUtils";
import { toast } from "react-toastify";
import { format, parseISO, isValid, subDays, startOfMonth, endOfMonth } from "date-fns";
import VehicleWhatsAppShareModal from "../components/vehicles/VehicleWhatsAppShareModal";
import VehicleSummaryChips from "../components/vehicles/VehicleSummaryChips";
import WhatsAppButton from "../components/vehicles/WhatsAppButton";
import DocumentDownloadModal from "../components/vehicles/DocumentDownloadModal";
import DocumentViewerModal from "../components/vehicles/DocumentViewerModal";
import { getAllDriversIncludingInactive } from "../utils/api/drivers";
import VehicleHealthScore from "../components/analytics/VehicleHealthScore";
import FuelEfficiencyChart from "../components/analytics/FuelEfficiencyChart";
import CostAnalytics from "../components/analytics/CostAnalytics";
import DriverPerformance from "../components/analytics/DriverPerformance";
import RouteAnalytics from "../components/analytics/RouteAnalytics";

const VehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDocumentViewerModal, setShowDocumentViewerModal] = useState(false);
  const [selectedVehicleForShare, setSelectedVehicleForShare] =
    useState<Vehicle | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'maintenance' | 'documents'>('overview');

  const [stats, setStats] = useState<{
    totalTrips: number;
    totalDistance: number;
    averageKmpl?: number;
  }>({
    totalTrips: 0,
    totalDistance: 0,
  });

  // State for signed document URLs
  const [signedDocUrls, setSignedDocUrls] = useState<{
    rc?: string[];
    insurance?: string[];
    fitness?: string[];
    tax?: string[];
    permit?: string[];
    puc?: string[];
    other: Record<string, string>;
  }>({
    other: {},
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const [vehicleData, tripsData, vehicleStats, driversData] = await Promise.all([
          getVehicle(id),
          getTrips(),
          getVehicleStats(id),
          getAllDriversIncludingInactive(),
        ]);

        setVehicle(vehicleData);
        setTrips(
          Array.isArray(tripsData)
            ? tripsData.filter((trip) => trip.vehicle_id === id)
            : []
        );
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setStats(vehicleStats || { totalTrips: 0, totalDistance: 0 });

        // Generate signed URLs for documents
        if (vehicleData) {
          await generateSignedUrls(vehicleData);
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Function to generate signed URLs for all documents
  const generateSignedUrls = async (vehicleData: Vehicle) => {
    const urls: {
      rc?: string[];
      insurance?: string[];
      fitness?: string[];
      tax?: string[];
      permit?: string[];
      puc?: string[];
      other: Record<string, string>;
    } = {
      other: {},
    };

    try {
      // Generate signed URL for RC document
      if (vehicleData.rc_document_url && Array.isArray(vehicleData.rc_document_url)) {
        urls.rc = await Promise.all(
          vehicleData.rc_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for insurance document
      if (vehicleData.insurance_document_url && Array.isArray(vehicleData.insurance_document_url)) {
        urls.insurance = await Promise.all(
          vehicleData.insurance_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for fitness document
      if (vehicleData.fitness_document_url && Array.isArray(vehicleData.fitness_document_url)) {
        urls.fitness = await Promise.all(
          vehicleData.fitness_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for tax document
      if (vehicleData.tax_document_url && Array.isArray(vehicleData.tax_document_url)) {
        urls.tax = await Promise.all(
          vehicleData.tax_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for permit document
      if (vehicleData.permit_document_url && Array.isArray(vehicleData.permit_document_url)) {
        urls.permit = await Promise.all(
          vehicleData.permit_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URL for PUC document
      if (vehicleData.puc_document_url && Array.isArray(vehicleData.puc_document_url)) {
        urls.puc = await Promise.all(
          vehicleData.puc_document_url.map(path => getSignedDocumentUrl(path))
        );
      }

      // Generate signed URLs for other documents
      if (
        vehicleData.other_documents &&
        Array.isArray(vehicleData.other_documents)
      ) {
        for (let i = 0; i < vehicleData.other_documents.length; i++) {
          const doc = vehicleData.other_documents[i];
          if (doc.file_path) {
            urls.other[`other_${i}`] = await getSignedDocumentUrl(
              doc.file_path
            );
          }
        }
      }

      setSignedDocUrls(urls);
    } catch (error) {
      console.error("Error generating signed URLs:", error);
      toast.error("Failed to generate document access links");
    }
  };

  // Helper functions for document status
  const getDocumentStatus = (docPath?: string[], expiryDate?: string) => {
    if (!docPath || !docPath.length)
      return {
        status: "missing",
        label: "Missing",
        color: "bg-gray-100 text-gray-800",
      };

    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const now = new Date();
      if (expiry < now) {
        return {
          status: "expired",
          label: "Expired",
          color: "bg-error-100 text-error-800",
        };
      }

      // Check if expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      if (expiry < thirtyDaysFromNow) {
        return {
          status: "expiring",
          label: "Expiring Soon",
          color: "bg-warning-100 text-warning-800",
        };
      }
    }

    return {
      status: "valid",
      label: "Valid",
      color: "bg-success-100 text-success-800",
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Compliance Score calculation (moved before analytics to fix hooks order)
  const complianceScore = useMemo(() => {
    if (!vehicle) return 0;
    const docs = [
      vehicle.rc_document_url?.length,
      vehicle.insurance_document_url?.length,
      vehicle.fitness_document_url?.length,
      vehicle.tax_document_url?.length,
      vehicle.permit_document_url?.length,
      vehicle.puc_document_url?.length,
    ].filter(Boolean).length;
    return (docs / 6) * 100;
  }, [vehicle]);

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!trips.length || !vehicle) {
      return {
        healthScore: 0,
        fuelEfficiency: { current: 0, trend: 0, baseline: 0 },
        costAnalytics: { totalCost: 0, costPerKm: 0, budgetVsActual: 0 },
        driverPerformance: [],
        routeAnalytics: { frequentRoutes: [], totalRoutes: 0 },
        complianceScore: 0,
        utilizationMetrics: { daily: 0, weekly: 0, monthly: 0 },
        breakdownPatterns: { count: 0, avgInterval: 0, lastBreakdown: null },
        environmentalImpact: { carbonFootprint: 0, emissions: 0 }
      };
    }

    // Health Score Calculation (0-100)
    const healthScore = Math.min(100, Math.max(0, 
      (vehicle.status === 'active' ? 20 : 0) +
      (stats.averageKmpl && stats.averageKmpl > 8 ? 20 : 10) +
      (complianceScore > 80 ? 20 : complianceScore > 60 ? 15 : 10) +
      (trips.length > 0 ? 20 : 0) +
      (vehicle.current_odometer < 200000 ? 20 : 10)
    ));

    // Fuel Efficiency Analysis
    const recentTrips = trips.filter(trip => {
      const tripDate = new Date(trip.trip_start_date);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return tripDate >= thirtyDaysAgo && trip.calculated_kmpl;
    });
    
    const currentEfficiency = recentTrips.length > 0 
      ? recentTrips.reduce((sum, trip) => sum + (trip.calculated_kmpl || 0), 0) / recentTrips.length
      : stats.averageKmpl || 0;

    const baselineEfficiency = stats.averageKmpl || 0;
    const efficiencyTrend = baselineEfficiency > 0 ? ((currentEfficiency - baselineEfficiency) / baselineEfficiency) * 100 : 0;

    // Cost Analytics
    const totalCost = trips.reduce((sum, trip) => sum + (trip.total_cost || 0), 0);
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
    const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;

    // Driver Performance
    const driverStats = trips.reduce((acc, trip) => {
      if (!trip.driver_id) return acc;
      if (!acc[trip.driver_id]) {
        acc[trip.driver_id] = { trips: 0, totalDistance: 0, totalCost: 0, avgKmpl: 0 };
      }
      acc[trip.driver_id].trips += 1;
      acc[trip.driver_id].totalDistance += trip.end_km - trip.start_km;
      acc[trip.driver_id].totalCost += trip.total_cost || 0;
      if (trip.calculated_kmpl) {
        acc[trip.driver_id].avgKmpl = (acc[trip.driver_id].avgKmpl + trip.calculated_kmpl) / 2;
      }
      return acc;
    }, {} as Record<string, any>);

    const driverPerformance = Object.entries(driverStats).map(([driverId, stats]) => {
      const driver = drivers.find(d => d.id === driverId);
      return {
        driverId,
        driverName: driver?.name || 'Unknown',
        trips: stats.trips,
        totalDistance: stats.totalDistance,
        totalCost: stats.totalCost,
        avgKmpl: stats.avgKmpl,
        costPerKm: stats.totalDistance > 0 ? stats.totalCost / stats.totalDistance : 0
      };
    }).sort((a, b) => b.avgKmpl - a.avgKmpl);

    // Route Analytics
    const routeStats = trips.reduce((acc, trip) => {
      const route = `${trip.from_location} → ${trip.to_location}`;
      if (!acc[route]) {
        acc[route] = { count: 0, totalDistance: 0, avgCost: 0 };
      }
      acc[route].count += 1;
      acc[route].totalDistance += trip.end_km - trip.start_km;
      acc[route].avgCost = (acc[route].avgCost + (trip.total_cost || 0)) / 2;
      return acc;
    }, {} as Record<string, any>);

    const frequentRoutes = Object.entries(routeStats)
      .map(([route, stats]) => ({ route, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Use the complianceScore from the hook defined above

    // Utilization Metrics
    const now = new Date();
    const thisMonth = trips.filter(trip => {
      const tripDate = new Date(trip.trip_start_date);
      return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
    });
    const thisWeek = trips.filter(trip => {
      const tripDate = new Date(trip.trip_start_date);
      const weekAgo = subDays(now, 7);
      return tripDate >= weekAgo;
    });
    const today = trips.filter(trip => {
      const tripDate = new Date(trip.trip_start_date);
      return tripDate.toDateString() === now.toDateString();
    });

    return {
      healthScore,
      fuelEfficiency: { current: currentEfficiency, trend: efficiencyTrend, baseline: baselineEfficiency },
      costAnalytics: { totalCost, costPerKm, budgetVsActual: 0 },
      driverPerformance,
      routeAnalytics: { frequentRoutes, totalRoutes: Object.keys(routeStats).length },
      complianceScore: complianceScore, // Use the complianceScore from the hook defined above
      utilizationMetrics: { 
        daily: today.length, 
        weekly: thisWeek.length, 
        monthly: thisMonth.length 
      },
      breakdownPatterns: { count: 0, avgInterval: 0, lastBreakdown: null },
      environmentalImpact: { 
        carbonFootprint: totalDistance * 0.2, // Rough estimate: 0.2 kg CO2 per km
        emissions: totalDistance * 0.15 // Rough estimate: 0.15 kg other emissions per km
      }
    };
  }, [trips, vehicle, stats, drivers, complianceScore]);

  // IMPORTANT: All hooks are now defined above this point
  // Now we can have conditional returns

  if (!vehicle) {
    return (
      <Layout title="Vehicle Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">
            The requested vehicle could not be found.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/vehicles")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Vehicles
          </Button>
        </div>
      </Layout>
    );
  }

  if (isEditing) {
    return (
      <Layout
        title="Edit Vehicle"
        subtitle={vehicle.registration_number}
        actions={
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        }
      >
        <div className="max-w-4xl mx-auto">
          <VehicleForm
            initialData={vehicle}
            onSubmit={(data) => {
              // Handle update
              setIsEditing(false);
            }}
          />
        </div>
      </Layout>
    );
  }

  // Calculate document statuses (these are computed values, not hooks)
  const rcStatus = getDocumentStatus(
    vehicle.rc_document_url,
    vehicle.rc_expiry_date
  );
  const insuranceStatus = getDocumentStatus(
    vehicle.insurance_document_url,
    vehicle.insurance_expiry_date
  );
  const fitnessStatus = getDocumentStatus(
    vehicle.fitness_document_url,
    vehicle.fitness_expiry_date
  );
  const taxStatus = getDocumentStatus(
    vehicle.tax_document_url,
    vehicle.tax_period ? "future" : undefined
  ); // Tax doesn't always have an expiry
  const permitStatus = getDocumentStatus(
    vehicle.permit_document_url,
    vehicle.permit_expiry_date
  );
  const pucStatus = getDocumentStatus(
    vehicle.puc_document_url,
    vehicle.puc_expiry_date
  );

  // Handle export as PDF
  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = await generateVehiclePDF(vehicle, stats);
      doc.save(`${vehicle.registration_number}_profile.pdf`);
      toast.success("Vehicle profile exported successfully");
    } catch (error) {
      console.error("Error exporting vehicle profile:", error);
      toast.error("Failed to export vehicle profile");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle download documents
  const handleDownloadDocuments = () => {
    setShowDownloadModal(true);
  };

  // Handle create shareable link
  const handleCreateShareableLink = async () => {
    try {
      setShareLoading(true);
      const link = await createShareableVehicleLink(vehicle.id);

      // Copy link to clipboard
      await navigator.clipboard.writeText(link);
      toast.success("Shareable link copied to clipboard (valid for 7 days)");
    } catch (error) {
      console.error("Error creating shareable link:", error);
      toast.error("Failed to create shareable link");
    } finally {
      setShareLoading(false);
    }
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    setSelectedVehicleForShare(vehicle);
    setShowShareModal(true);
  };

  // Handle individual vehicle refresh
  const handleVehicleRefresh = async () => {
    if (!vehicle || isRefreshing) return;

    setIsRefreshing(true);
    try {
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
      const updatedVehicle = await updateVehicle(vehicle.id, updatePayload);

      if (updatedVehicle) {
        // Update local state
        setVehicle(prevVehicle => ({ ...prevVehicle, ...updatePayload }));
        toast.success(`✅ ${vehicle.registration_number} updated successfully!`);
      } else {
        toast.error(`❌ Failed to update ${vehicle.registration_number}`);
      }
    } catch (error: any) {
      console.error(`Error refreshing vehicle ${vehicle.registration_number}:`, error);
      toast.error(`❌ Failed to refresh ${vehicle.registration_number}: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout
      title={`Vehicle: ${vehicle.registration_number}`}
      subtitle={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      actions={
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/vehicles")}
            icon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>

          <Button
            variant="outline"
            onClick={handleVehicleRefresh}
            isLoading={isRefreshing}
            icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            title="Refresh vehicle data from RC API"
          >
            Refresh Data
          </Button>

          <Button
            variant="outline"
            onClick={handleExportPDF}
            isLoading={exportLoading}
            icon={<FileDown className="h-4 w-4" />}
          >
            Export PDF
          </Button>

          {/* <Button
            variant="outline"
            onClick={() => setShowDocumentViewerModal(true)}
            icon={<Eye className="h-4 w-4" />}
            title="View Documents"
          /> */}

          <Button
            variant="outline"
            onClick={handleDownloadDocuments}
            isLoading={downloadLoading}
            icon={<Download className="h-4 w-4" />}
            title="Download Documents"
          />

          <WhatsAppButton
            onClick={handleWhatsAppShare}
            className="text-green-600 hover:text-green-800"
          />

          <Button
            variant="outline"
            onClick={handleCreateShareableLink}
            isLoading={shareLoading}
            icon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>

          <Button
            onClick={() => setIsEditing(true)}
            icon={<PenToolIcon className="h-4 w-4" />}
          >
            Edit Vehicle
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: <BarChart2 className="h-4 w-4" /> },
                { id: 'analytics', name: 'Analytics', icon: <LineChart className="h-4 w-4" /> },
                { id: 'maintenance', name: 'Maintenance', icon: <Wrench className="h-4 w-4" /> },
                { id: 'documents', name: 'Documents', icon: <FileCheck className="h-4 w-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <VehicleHealthScore score={analytics.healthScore} size="md" />
                
                {/* Compliance Score Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Compliance</p>
                      <p className="text-3xl font-bold text-gray-900">{Math.round(analytics.complianceScore)}%</p>
                      <p className="text-xs text-gray-500">Document compliance</p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      analytics.complianceScore >= 80 ? 'bg-green-100' : 
                      analytics.complianceScore >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <Shield className={`h-6 w-6 ${
                        analytics.complianceScore >= 80 ? 'text-green-600' : 
                        analytics.complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Fuel Efficiency Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Fuel Efficiency</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.fuelEfficiency.current.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">km/L (current)</p>
                    </div>
                    <div className={`p-3 rounded-full ${
                      analytics.fuelEfficiency.trend >= 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <TrendingUp className={`h-6 w-6 ${
                        analytics.fuelEfficiency.trend >= 0 ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                  </div>
                </div>

                {/* Cost per KM Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cost per KM</p>
                      <p className="text-3xl font-bold text-gray-900">₹{analytics.costAnalytics.costPerKm.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Average cost</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Predictive Maintenance Alerts */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Predictive Maintenance Alerts
                </h3>
                <div className="space-y-3">
                  {analytics.healthScore < 60 && (
                    <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-500 mr-3" />
                      <div>
                        <p className="font-medium text-red-800">Vehicle Health Critical</p>
                        <p className="text-sm text-red-600">Health score is below 60%. Immediate attention required.</p>
                      </div>
                    </div>
                  )}
                  {analytics.complianceScore < 80 && (
                    <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                      <div>
                        <p className="font-medium text-yellow-800">Document Compliance Issue</p>
                        <p className="text-sm text-yellow-600">Some documents are missing or expiring soon.</p>
                      </div>
                    </div>
                  )}
                  {analytics.fuelEfficiency.trend < -10 && (
                    <div className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <Droplets className="h-5 w-5 text-orange-500 mr-3" />
                      <div>
                        <p className="font-medium text-orange-800">Fuel Efficiency Declining</p>
                        <p className="text-sm text-orange-600">Recent trips show {Math.abs(analytics.fuelEfficiency.trend).toFixed(1)}% decrease in fuel efficiency.</p>
                      </div>
                    </div>
                  )}
                  {analytics.healthScore >= 80 && analytics.complianceScore >= 80 && analytics.fuelEfficiency.trend >= -5 && (
                    <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <p className="font-medium text-green-800">All Systems Optimal</p>
                        <p className="text-sm text-green-600">Vehicle is performing well with no immediate concerns.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Component Health Analysis */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Component Health Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Engine</span>
                      <span className="text-sm font-bold text-green-600">Good</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Transmission</span>
                      <span className="text-sm font-bold text-green-600">Good</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Brakes</span>
                      <span className="text-sm font-bold text-yellow-600">Fair</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Tires</span>
                      <span className="text-sm font-bold text-green-600">Good</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Electrical</span>
                      <span className="text-sm font-bold text-green-600">Good</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Suspension</span>
                      <span className="text-sm font-bold text-yellow-600">Fair</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <FuelEfficiencyChart
                current={analytics.fuelEfficiency.current}
                baseline={analytics.fuelEfficiency.baseline}
                trend={analytics.fuelEfficiency.trend}
                period="30 days"
              />

              <CostAnalytics
                totalCost={analytics.costAnalytics.totalCost}
                costPerKm={analytics.costAnalytics.costPerKm}
                totalDistance={stats.totalDistance}
                totalTrips={stats.totalTrips}
                monthlyAverage={analytics.costAnalytics.totalCost / Math.max(1, Math.ceil(trips.length / 30))}
                tripAverage={analytics.costAnalytics.totalCost / Math.max(1, trips.length)}
              />

              <DriverPerformance
                drivers={analytics.driverPerformance}
                maxDisplay={5}
              />

              <RouteAnalytics
                routes={analytics.routeAnalytics.frequentRoutes}
                maxDisplay={5}
              />
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-500" />
                  Maintenance History
                </h3>
                <p className="text-gray-500 text-center py-8">Maintenance tracking feature coming soon...</p>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Documents</h3>
                <p className="text-gray-500">Document management feature coming soon...</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default VehiclePage;
