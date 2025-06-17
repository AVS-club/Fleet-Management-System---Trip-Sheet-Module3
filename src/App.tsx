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
      const isConnected = await testSupabaseConnection();
      
      if (!isConnected) {
        setConnectionError("Could not connect to Supabase. Please check your API keys in the .env file.");
        setLoading(false);
        return;
      }
      
      try {
        // Update all trip mileage calculations when the app starts
        await updateAllTripMileage();
      } catch (error) {
        console.warn('Failed to update trip mileage:', error);
        // Continue app initialization even if this fails
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
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
        <div className="bg-error-50 border border-error-200 rounded-lg p-6 max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-error-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-error-800 mb-2">Connection Error</h2>
          <p className="text-error-600 mb-6">{connectionError}</p>
          <div className="bg-white p-4 rounded-lg border border-error-100 text-left mb-4">
            <p className="font-medium text-gray-900 mb-1">Troubleshooting steps:</p>
            <ol className="list-decimal pl-5 text-sm space-y-1 text-gray-600">
              <li>Check that your Supabase URL and anon key are correctly set in the .env file</li>
              <li>Ensure your Supabase project is up and running</li>
              <li>Verify that your network can access the Supabase API</li>
              <li>Check your Supabase project's CORS settings in the dashboard and ensure that <code className="bg-gray-100 px-1 rounded">http://localhost:5173</code> is added to the allowed origins</li>
              <li>Try reloading the page after fixing the issue</li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Reload Page
          </button>
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
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicles/:id" element={<VehiclePage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/drivers/:id" element={<DriverPage />} />
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