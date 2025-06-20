import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase, testSupabaseConnection } from './utils/supabaseClient';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import AVSChatbot from './components/AVSChatbot';
import DashboardPage from './pages/DashboardPage';
import TripsPage from './pages/TripsPage';
import TripDetailsPage from './pages/TripDetailsPage';
import AIAlertsPage from './pages/AIAlertsPage';
import MaintenancePage from './pages/MaintenancePage';
import MaintenanceTaskPage from './pages/MaintenanceTaskPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTripsPage from './pages/admin/AdminTripsPage';
import AlertSettingsPage from './pages/admin/AlertSettingsPage';
import MaintenanceTasksAdmin from './pages/admin/MaintenanceTasksAdmin';
import TripLocationsPage from './pages/admin/TripLocationsPage';
import RemindersPage from './pages/admin/RemindersPage';
import VehiclesPage from './pages/VehiclesPage';
import VehiclePage from './pages/VehiclePage';
import DriversPage from './pages/DriversPage';
import DriverPage from './pages/DriverPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VehicleManagementPage from './pages/admin/VehicleManagementPage';
import NotificationsPage from './pages/NotificationsPage';
import { updateAllTripMileage } from './utils/storage';
import { ThemeProvider } from './utils/themeContext';

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
  const navigate = useNavigate(); // For programmatic navigation

  useEffect(() => {
    const initializeApp = async () => {
      // Test Supabase connection before trying to use it
      try {
        const isConnected = await testSupabaseConnection();
        
        if (!isConnected) {
          setConnectionError("Could not connect to Supabase. Please check your API keys and network connection.");
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          setConnectionError("Network connection failed during startup. Please check your internet connection and Supabase configuration.");
        } else {
          setConnectionError("Could not connect to Supabase. Please check your API keys and network connection.");
        }
        setLoading(false);
        return;
      }
      
      try {
        // Update all trip mileage calculations when the app starts
        // This is wrapped in an additional try-catch to ensure any network errors don't crash the app
        await updateAllTripMileage();
      } catch (error) {
        console.warn('Failed to update trip mileage:', error);
        
        // If the error is a network/connection error, show connection error
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          setConnectionError("Network connection failed while initializing data. Please check your internet connection and Supabase configuration.");
          setLoading(false);
          return;
        }
        
        // Continue app initialization for other types of errors
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Failed to get session:', error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          setConnectionError("Network connection failed while getting user session. Please check your internet connection and Supabase configuration.");
          setLoading(false);
          return;
        }
      }
      
      setLoading(false);
    };

    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // Only redirect if not loading, no session, AND not already on login/register page
        if (!loading && !session && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            navigate('/login');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [loading, navigate]);

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  // Show connection error message if applicable
  if (connectionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Connection Error</h2>
          <p className="text-red-600 mb-6">{connectionError}</p>
          <div className="bg-white p-4 rounded-lg border border-red-100 text-left mb-4">
            <p className="font-medium text-gray-900 mb-2">Troubleshooting steps:</p>
            <ol className="list-decimal pl-5 text-sm space-y-2 text-gray-600">
              <li>Check that your Supabase URL and anon key are correctly set in the .env file</li>
              <li>Ensure your Supabase project is up and running</li>
              <li>Verify that your network can access the Supabase API</li>
              <li className="font-medium text-red-700">
                <strong>CORS Configuration Required:</strong> In your Supabase project dashboard:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Go to Settings → API → CORS</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded text-xs">http://localhost:5173</code> to allowed origins</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded text-xs">{window.location.origin}</code> to allowed origins</li>
                  <li>Save the changes and wait a few minutes for them to take effect</li>
                </ul>
              </li>
              <li>Try reloading the page after fixing the CORS configuration</li>
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
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
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
            <Route path="/alerts" element={<AIAlertsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/maintenance/:id" element={<MaintenanceTaskPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/trips" element={<AdminTripsPage />} />
            <Route path="/admin/alert-settings" element={<AlertSettingsPage />} />
            <Route path="/admin/maintenance-tasks" element={<MaintenanceTasksAdmin />} />
            <Route path="/admin/trip-locations" element={<TripLocationsPage />} />
            <Route path="/admin/reminders" element={<RemindersPage />} />
            <Route path="/admin/vehicle-management" element={<VehicleManagementPage />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicles/:id" element={<VehiclePage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/drivers/:id" element={<DriverPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
        </Routes>
      </Suspense>
      {session && <AVSChatbot />} {/* Show chatbot only if logged in */}
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