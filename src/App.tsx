import React, { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase, testSupabaseConnection } from "./utils/supabaseClient";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import DashboardPage from "./pages/DashboardPage";
import TripsPage from "./pages/TripsPage";
import TripDetailsPage from "./pages/TripDetailsPage";
import TripPnlReportsPage from "./pages/TripPnlReportsPage";
import AIAlertsPage from "./pages/AIAlertsPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceTaskPage from "./pages/MaintenanceTaskPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTripsPage from "./pages/admin/AdminTripsPage";
import AlertSettingsPage from "./pages/admin/AlertSettingsPage";
import MaintenanceTasksAdmin from "./pages/admin/MaintenanceTasksAdmin";
import TripLocationsPage from "./pages/admin/TripLocationsPage";
import RemindersPage from "./pages/admin/RemindersPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehiclePage from "./pages/VehiclePage";
import DriversPage from "./pages/DriversPage";
import DriverPage from "./pages/DriverPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VehicleManagementPage from "./pages/admin/VehicleManagementPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotificationModal from "./components/notifications/NotificationModal";
import { getAlertSettings } from "./utils/alertSettings";
import { updateAllTripMileage } from "./utils/storage";
import { ThemeProvider } from "./utils/themeContext";
// Import new admin pages
import AdminDocumentRulesPage from "./pages/admin/AdminDocumentRulesPage";
import DriverRankingSettingsPage from "./pages/admin/DriverRankingSettingsPage";
import MessageTemplatesPage from "./pages/admin/MessageTemplatesPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";
import DriverInsightsPage from "./pages/drivers/DriverInsightsPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";
import PartsHealthAnalyticsPage from "./pages/PartsHealthAnalyticsPage";

interface ProtectedRouteProps {
  session: Session | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [alertSettings, setAlertSettings] = useState<any>(null);
  const navigate = useNavigate(); // For programmatic navigation

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
  }, []);

  // Set up auth state change listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Only redirect if not loading, no session, AND not already on login/register page
      if (
        !loading &&
        !session &&
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        navigate("/login");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  // Show connection error message if applicable
  if (connectionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl w-full text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-red-800 mb-2">
            Connection Error
          </h2>
          <p className="text-red-600 mb-6 whitespace-pre-line">{connectionError}</p>
          <div className="bg-white p-4 rounded-lg border border-red-100 text-left mb-4">
            <p className="font-medium text-gray-900 mb-2">
              Troubleshooting steps:
            </p>
            <ol className="list-decimal pl-5 text-sm space-y-3 text-gray-600">
              <li className="font-medium text-red-700">
                <strong>CORS Configuration (Most Common Issue):</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1 font-normal">
                  <li>Go to Settings → API → CORS in your Supabase dashboard</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded text-xs">{window.location.origin}</code> to allowed origins</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded text-xs">http://localhost:5173</code> to allowed origins</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded text-xs">https://localhost:5173</code> to allowed origins</li>
                  <li>Save and wait 1-2 minutes for changes to propagate</li>
                </ul>
              </li>
              <li>
                Check that your Supabase URL and anon key are correctly set in
                the .env file
              </li>
              <li>Ensure your Supabase project is up and running</li>
              <li>Verify that your network can access the Supabase API</li>
              <li>
                Try reloading the page after making configuration changes
              </li>
            </ol>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() =>
                window.open("https://supabase.com/dashboard", "_blank")
              }
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Open Supabase Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen isLoading={true} />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute session={session} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/:id" element={<TripDetailsPage />} />
            <Route path="/trip-pnl-reports" element={<TripPnlReportsPage />} />
            <Route path="/alerts" element={<AIAlertsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/maintenance/:id" element={<MaintenanceTaskPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/trips" element={<AdminTripsPage />} />
            <Route
              path="/admin/alert-settings"
              element={<AlertSettingsPage />}
            />
            <Route
              path="/admin/maintenance-tasks"
              element={<MaintenanceTasksAdmin />}
            />
            <Route
              path="/admin/trip-locations"
              element={<TripLocationsPage />}
            />
            <Route path="/admin/reminders" element={<RemindersPage />} />
            <Route
              path="/admin/vehicle-management"
              element={<VehicleManagementPage />}
            />
            {/* New Admin Routes */}
            <Route
              path="/admin/document-rules"
              element={<AdminDocumentRulesPage />}
            />
            <Route
              path="/admin/driver-ranking-settings"
              element={<DriverRankingSettingsPage />}
            />
            <Route
              path="/admin/message-templates"
              element={<MessageTemplatesPage />}
            />
            <Route
              path="/admin/activity-logs"
              element={<ActivityLogPage />}
            />
            <Route
              path="/admin/driver-management"
              element={<AdminDriversPage />}
            />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicles/:id" element={<VehiclePage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/drivers/:id" element={<DriverPage />} />
            <Route path="/drivers/insights" element={<DriverInsightsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/parts-health" element={<PartsHealthAnalyticsPage />} />
          </Route>
          <Route
            path="*"
            element={<Navigate to={session ? "/" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
      
      {/* Notification Modal */}
      {session && (
        <NotificationModal 
          isOpen={showNotificationModal} 
          onClose={() => {
            setShowNotificationModal(false);
            
            // Handle dismissal based on frequency setting
            const frequency = alertSettings?.popup_display_frequency || 'always';
            
            if (frequency === 'once_per_session') {
              // Mark as dismissed for this session
              sessionStorage.setItem('notificationModalDismissed', 'true');
            } else if (frequency === 'daily') {
              // Mark as dismissed for today
              localStorage.setItem('notificationModalLastShown', new Date().toDateString());
            }
          }}
        />
      )}
    </ErrorBoundary>
  );
}

// Wrap App with Router to use useNavigate within App
const AppWrapper: React.FC = () => (
  <Router>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Router>
);

export default AppWrapper;