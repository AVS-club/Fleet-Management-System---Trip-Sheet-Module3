import React, { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase, testSupabaseConnection } from "./utils/supabaseClient";
import config from "./utils/env";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehiclePage from "./pages/VehiclePage";
import DriversPage from "./pages/DriversPage";
import DriverPage from "./pages/DriverPage";
import TripsPage from "./pages/TripsPage";
import TripDetailsPage from "./pages/TripDetailsPage";
import TripPnlReportsPage from "./pages/TripPnlReportsPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceTaskPage from "./pages/MaintenanceTaskPage";
import NotificationsPage from "./pages/NotificationsPage";
import AIAlertsPage from "./pages/AIAlertsPage";
import DriverInsightsPage from "./pages/drivers/DriverInsightsPage";
import PartsHealthAnalyticsPage from "./pages/PartsHealthAnalyticsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RemindersPage from "./pages/admin/RemindersPage";
import AlertSettingsPage from "./pages/admin/AlertSettingsPage";
import TripLocationsPage from "./pages/admin/TripLocationsPage";
import AdminTripsPage from "./pages/admin/AdminTripsPage";
import VehicleManagementPage from "./pages/admin/VehicleManagementPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";
import DriverRankingSettingsPage from "./pages/admin/DriverRankingSettingsPage";
import MaintenanceTasksAdmin from "./pages/admin/MaintenanceTasksAdmin";
import MessageTemplatesPage from "./pages/admin/MessageTemplatesPage";
import { isNetworkError } from "./utils/supabaseClient";

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test Supabase connection and get initial session
    const initializeApp = async () => {
      try {
        // Test Supabase connection on app start
        await testSupabaseConnection();
      } catch (connectionError) {
        console.error('Supabase connection test failed:', connectionError);
        // Continue anyway, but log the issue
      }

      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (isNetworkError(error)) {
            if (config.isDev) console.warn('Network error getting session, continuing without session');
            setSession(null);
          } else {
            console.error('Session error:', error);
            setSession(null);
          }
        } else {
          setSession(session);
        }
      } catch (error) {
        console.error('Failed to get session:', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen isLoading={true} />}>
        <Routes>
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!session ? <RegisterPage /> : <Navigate to="/" replace />} />
          <Route path="/" element={session ? <DashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="/vehicles" element={session ? <VehiclesPage /> : <Navigate to="/login" replace />} />
          <Route path="/vehicles/:id" element={session ? <VehiclePage /> : <Navigate to="/login" replace />} />
          <Route path="/drivers" element={session ? <DriversPage /> : <Navigate to="/login" replace />} />
          <Route path="/drivers/:id" element={session ? <DriverPage /> : <Navigate to="/login" replace />} />
          <Route path="/trips" element={session ? <TripsPage /> : <Navigate to="/login" replace />} />
          <Route path="/trips/:id" element={session ? <TripDetailsPage /> : <Navigate to="/login" replace />} />
          <Route path="/trip-pnl-reports" element={session ? <TripPnlReportsPage /> : <Navigate to="/login" replace />} />
          <Route path="/maintenance" element={session ? <MaintenancePage /> : <Navigate to="/login" replace />} />
          <Route path="/maintenance/:id" element={session ? <MaintenanceTaskPage /> : <Navigate to="/login" replace />} />
          <Route path="/notifications" element={session ? <NotificationsPage /> : <Navigate to="/login" replace />} />
          <Route path="/alerts" element={session ? <AIAlertsPage /> : <Navigate to="/login" replace />} />
          <Route path="/drivers/insights" element={session ? <DriverInsightsPage /> : <Navigate to="/login" replace />} />
          <Route path="/parts-health" element={session ? <PartsHealthAnalyticsPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={session ? <AdminDashboard /> : <Navigate to="/login" replace />} />
          <Route path="/admin/reminders" element={session ? <RemindersPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/alert-settings" element={session ? <AlertSettingsPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/trip-locations" element={session ? <TripLocationsPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/trips" element={session ? <AdminTripsPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/vehicle-management" element={session ? <VehicleManagementPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/driver-management" element={session ? <AdminDriversPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/activity-logs" element={session ? <ActivityLogPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/driver-ranking-settings" element={session ? <DriverRankingSettingsPage /> : <Navigate to="/login" replace />} />
          <Route path="/admin/maintenance-tasks" element={session ? <MaintenanceTasksAdmin /> : <Navigate to="/login" replace />} />
          <Route path="/admin/message-templates" element={session ? <MessageTemplatesPage /> : <Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
      />
    </ErrorBoundary>
  );
};

const AppWrapper: React.FC = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;