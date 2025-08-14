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

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test Supabase connection on app start
    testSupabaseConnection();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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