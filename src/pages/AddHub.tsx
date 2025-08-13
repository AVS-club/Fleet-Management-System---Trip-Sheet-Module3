import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import VehicleForm from "../components/vehicles/VehicleForm";
import TripForm from "../components/trips/TripForm";
import MaintenanceTaskForm from "../components/maintenance/MaintenanceTaskForm";
import DocumentForm from "../components/documents/DocumentForm";
import { Vehicle, TripFormData } from "../types";
import { MaintenanceTask } from "../types/maintenance";
import { createVehicle, createTrip, getVehicles } from "../utils/storage";
import { createTask } from "../utils/maintenanceStorage";
import { Truck, FileText, PenTool as Tool, Upload, CheckCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function AddHub() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false);

  // Load vehicles for trip and maintenance forms
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesData = await getVehicles();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    
    fetchVehicles();
  }, []);

  const handleVehicleSubmit = async (data: Omit<Vehicle, "id">) => {
    setIsSubmittingVehicle(true);
    try {
      const newVehicle = await createVehicle(data);
      if (newVehicle) {
        setVehicles(prev => [...prev, newVehicle]);
        toast.success('Vehicle added successfully');
      } else {
        toast.error('Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Error adding vehicle');
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleTripSubmit = async (data: TripFormData) => {
    setIsSubmittingTrip(true);
    try {
      const newTrip = await createTrip(data);
      if (newTrip) {
        toast.success('Trip added successfully');
      } else {
        toast.error('Failed to add trip');
      }
    } catch (error) {
      console.error('Error adding trip:', error);
      toast.error('Error adding trip');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleMaintenanceSubmit = async (data: Partial<MaintenanceTask>) => {
    setIsSubmittingMaintenance(true);
    try {
      const newTask = await createTask(data as Omit<MaintenanceTask, "id" | "created_at" | "updated_at">);
      if (newTask) {
        toast.success('Maintenance task added successfully');
      } else {
        toast.error('Failed to add maintenance task');
      }
    } catch (error) {
      console.error('Error adding maintenance task:', error);
      toast.error('Error adding maintenance task');
    } finally {
      setIsSubmittingMaintenance(false);
    }
  };

  const handleDocumentSubmit = async (data: any) => {
    setIsSubmittingDocument(true);
    try {
      // For now, just show success message since document storage isn't fully implemented
      console.log('Document data:', data);
      toast.success('Document added successfully');
    } catch (error) {
      console.error('Error adding document:', error);
      toast.error('Error adding document');
    } finally {
      setIsSubmittingDocument(false);
    }
  };

  return (
    <Layout
      title="Add Data Hub"
      subtitle="Quick access to add vehicles, trips, maintenance tasks, and documents"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add Vehicle Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="h-5 w-5 mr-2 text-blue-600" />
                Add Vehicle
              </h2>
              <p className="text-sm text-gray-600 mt-1">Register a new vehicle in your fleet</p>
            </div>
            <div className="p-6">
              <VehicleForm
                onSubmit={handleVehicleSubmit}
                isSubmitting={isSubmittingVehicle}
              />
            </div>
          </section>

          {/* Add Trip Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                Add Trip
              </h2>
              <p className="text-sm text-gray-600 mt-1">Record a new trip for tracking</p>
            </div>
            <div className="p-6">
              <TripForm
                onSubmit={handleTripSubmit}
                isSubmitting={isSubmittingTrip}
              />
            </div>
          </section>

          {/* Add Maintenance Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Tool className="h-5 w-5 mr-2 text-orange-600" />
                Add Maintenance
              </h2>
              <p className="text-sm text-gray-600 mt-1">Log maintenance work and repairs</p>
            </div>
            <div className="p-6">
              <MaintenanceTaskForm
                vehicles={vehicles}
                onSubmit={handleMaintenanceSubmit}
                isSubmitting={isSubmittingMaintenance}
              />
            </div>
          </section>

          {/* Add Document Section */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-purple-600" />
                Add Document
              </h2>
              <p className="text-sm text-gray-600 mt-1">Upload and manage documents</p>
            </div>
            <div className="p-6">
              <DocumentForm
                onSubmit={handleDocumentSubmit}
                isSubmitting={isSubmittingDocument}
              />
            </div>
          </section>
        </div>

        {/* Success Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <h3 className="text-blue-800 font-medium">Quick Add Hub</h3>
              <p className="text-blue-700 text-sm mt-1">
                Use this page to quickly add new data to your fleet management system. All forms are optimized for fast data entry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Component to handle role-based routing
const RoleBasedApp: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [alertSettings, setAlertSettings] = useState<any>(null);
  const navigate = useNavigate();

  const isCorsError = (error: any): boolean => {
    return (
      (error instanceof TypeError && error.message.includes("Failed to fetch")) ||
      (error && typeof error === 'object' && 'message' in error &&
       typeof error.message === 'string' &&
       (error.message.includes("Failed to fetch") ||
        error.message.includes("Network connection failed") ||
        error.message.includes("Network request failed") ||
        error.message.includes("CORS")))
    );
  };

  const getCorsErrorMessage = (): string => {
    return `CORS Configuration Required

This error indicates that your Supabase project needs to be configured to allow requests from this domain.

To fix this:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API → CORS
4. Add these URLs to allowed origins:
   • ${window.location.origin}
   • http://localhost:5173
   • https://localhost:5173
5. Save the changes and wait 1-2 minutes
6. Reload this page

Current URL: ${window.location.origin}`;
  };

  useEffect(() => {
    const initializeApp = async () => {
      // Test Supabase connection before trying to use it
      try {
        const isConnected = await testSupabaseConnection();

        if (!isConnected) {
          setConnectionError("Could not connect to Supabase. Please check your configuration.");
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Connection test failed:", error);
        
        // Handle CORS-specific errors with detailed instructions
        if (error instanceof Error && error.message.includes('CORS configuration required')) {
          setConnectionError(error.message);
        } else if (isCorsError(error)) {
          setConnectionError(getCorsErrorMessage());
        } else {
          setConnectionError(
            error instanceof Error ? error.message : "Could not connect to Supabase. Please check your API keys and network connection."
          );
        }
        setLoading(false);
        return;
      }

      try {
        // Update all trip mileage calculations when the app starts
        // This is wrapped in an additional try-catch to ensure any network errors don't crash the app
        await updateAllTripMileage();
      } catch (error) {
        console.warn("Failed to update trip mileage:", error);

        // If the error is a CORS/network error during data initialization, show CORS-specific error
        if (isCorsError(error)) {
          setConnectionError(getCorsErrorMessage());
          setLoading(false);
          return;
        }

        // Continue app initialization for other types of errors
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        // Get alert settings
        if (session) {
          try {
            // Fetch user role
            const role = await getRole();
            setUserRole(role);
            
            // Redirect ADD_ONLY users to the Add Hub
            if (role === "ADD_ONLY") {
              navigate("/add", { replace: true });
            }
            
            const settings = await getAlertSettings();
            setAlertSettings(settings);
            
            // Check if we should show the notification modal based on frequency setting
            const frequency = settings.popup_display_frequency || 'always';
            
            if (frequency === 'always') {
              // Always show the modal
              setShowNotificationModal(true);
            } else if (frequency === 'once_per_session') {
              // Show once per browser session
              const modalDismissed = sessionStorage.getItem('notificationModalDismissed');
              if (!modalDismissed) {
                setShowNotificationModal(true);
              }
            } else if (frequency === 'daily') {
              // Show once per day
              const lastShownDate = localStorage.getItem('notificationModalLastShown');
              const today = new Date().toDateString();
              
              if (lastShownDate !== today) {
                setShowNotificationModal(true);
              }
            }
            // If frequency is 'never', modal will not be shown
          } catch (error) {
            console.error('Failed to get alert settings:', error);
            // Don't show CORS error for alert settings failure if we already have a session
            // This is a non-critical operation
          }
        }
        
        setSession(session);
      } catch (error) {
        console.error("Failed to get session:", error);
        if (isCorsError(error)) {
          setConnectionError(getCorsErrorMessage());
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    };

    initializeApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session) {
        try {
          const role = await getRole();
          setUserRole(role);
          
          // Redirect ADD_ONLY users to the Add Hub
          if (role === "ADD_ONLY") {
            navigate("/add", { replace: true });
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
    
    // Store dismissal based on frequency setting
    if (alertSettings?.popup_display_frequency === 'once_per_session') {
      sessionStorage.setItem('notificationModalDismissed', 'true');
    } else if (alertSettings?.popup_display_frequency === 'daily') {
      localStorage.setItem('notificationModalLastShown', new Date().toDateString());
    }
  };

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-error-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connection Error
            </h3>
            <div className="text-sm text-gray-500 text-left whitespace-pre-line">
              {connectionError}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute session={session} />}>
          {/* ADD_ONLY route */}
          <Route path="/add" element={
            <RoleGate allow="ADD_ONLY" fallback={<Navigate to="/" replace />}>
              <AddHub />
            </RoleGate>
          } />

          {/* OWNER routes */}
          <Route path="/" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <DashboardPage />
            </RoleGate>
          } />
          
          <Route path="/trips" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <TripsPage />
            </RoleGate>
          } />
          
          <Route path="/trips/:id" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <TripDetailsPage />
            </RoleGate>
          } />
          
          <Route path="/trip-pnl-reports" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <TripPnlReportsPage />
            </RoleGate>
          } />
          
          <Route path="/maintenance" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <MaintenancePage />
            </RoleGate>
          } />
          
          <Route path="/maintenance/:id" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <MaintenanceTaskPage />
            </RoleGate>
          } />
          
          <Route path="/parts-health" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <PartsHealthAnalyticsPage />
            </RoleGate>
          } />
          
          <Route path="/vehicles" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <VehiclesPage />
            </RoleGate>
          } />
          
          <Route path="/vehicles/:id" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <VehiclePage />
            </RoleGate>
          } />
          
          <Route path="/drivers" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <DriversPage />
            </RoleGate>
          } />
          
          <Route path="/drivers/:id" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <DriverPage />
            </RoleGate>
          } />
          
          <Route path="/drivers/insights" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <DriverInsightsPage />
            </RoleGate>
          } />
          
          <Route path="/alerts" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <AIAlertsPage />
            </RoleGate>
          } />
          
          <Route path="/notifications" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <NotificationsPage />
            </RoleGate>
          } />
          
          <Route path="/admin" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <AdminDashboard />
            </RoleGate>
          } />
          
          <Route path="/admin/trips" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <AdminTripsPage />
            </RoleGate>
          } />
          
          <Route path="/admin/alert-settings" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <AlertSettingsPage />
            </RoleGate>
          } />
          
          <Route path="/admin/maintenance-tasks" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <MaintenanceTasksAdmin />
            </RoleGate>
          } />
          
          <Route path="/admin/trip-locations" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <TripLocationsPage />
            </RoleGate>
          } />
          
          <Route path="/admin/reminders" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <RemindersPage />
            </RoleGate>
          } />
          
          <Route path="/admin/vehicle-management" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <VehicleManagementPage />
            </RoleGate>
          } />
          
          <Route path="/admin/driver-management" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <AdminDriversPage />
            </RoleGate>
          } />
          
          <Route path="/admin/document-rules" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <AdminDocumentRulesPage />
            </RoleGate>
          } />
          
          <Route path="/admin/driver-ranking-settings" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <DriverRankingSettingsPage />
            </RoleGate>
          } />
          
          <Route path="/admin/message-templates" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <MessageTemplatesPage />
            </RoleGate>
          } />
          
          <Route path="/admin/activity-logs" element={
            <RoleGate allow="OWNER" fallback={<Navigate to="/add" replace />}>
              <ActivityLogPage />
            </RoleGate>
          } />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to={userRole === "ADD_ONLY" ? "/add" : "/"} replace />} />
      </Routes>

      {/* Notification Modal for OWNER users only */}
      {session && userRole === "OWNER" && showNotificationModal && (
        <NotificationModal
          isOpen={showNotificationModal}
          onClose={handleCloseNotificationModal}
        />
      )}
    </>
  );
};

// Main App component with Router wrapper
function App() {
  return (
    <Router>
      <ErrorBoundary>
        <RoleBasedApp />
      </ErrorBoundary>
    </Router>
  );
}

interface ProtectedRouteProps {
  session: Session | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default App;