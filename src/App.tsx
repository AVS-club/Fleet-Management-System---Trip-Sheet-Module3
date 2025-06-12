import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabaseClient';
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
import VehiclesPage from './pages/VehiclesPage';
import VehiclePage from './pages/VehiclePage';
import DriversPage from './pages/DriversPage';
import DriverPage from './pages/DriverPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { updateAllTripMileage } from './utils/storage';

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
  const navigate = useNavigate(); // For programmatic navigation

  useEffect(() => {
    // Update all trip mileage calculations when the app starts
    updateAllTripMileage();

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

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
    <App />
  </Router>
);

export default AppWrapper;
