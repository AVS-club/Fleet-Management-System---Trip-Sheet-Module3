import React, { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase, testSupabaseConnection } from "./utils/supabaseClient";
import config from "./utils/env";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
// import MobileBottomNav from './components/layout/MobileBottomNav';
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehiclePage from "./pages/VehiclePage";
import DriversPage from "./pages/DriversPage";
import DriverPage from "./pages/DriverPage";
import TripsPage from "./pages/TripsPage";
import TripDetailsPage from "./pages/TripDetailsPage";
import TripPnlReportsPage from "./pages/TripPnlReportsPage";
import MobileTripPage from "./pages/MobileTripPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceTaskPage from "./pages/MaintenanceTaskPage";
import AIAlertsPage from "./pages/AIAlertsPage";
import DriverInsightsPage from "./pages/drivers/DriverInsightsPage";
import PartsHealthAnalyticsPage from "./pages/PartsHealthAnalyticsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RemindersPage from "./pages/admin/RemindersPage";
import AlertSettingsPage from "./pages/admin/AlertSettingsPage";
import TripLocationsPage from "./pages/admin/TripLocationsPage";
import AdminTripsPage from "./pages/admin/AdminTripsPage";
import VehicleManagementPage from "./pages/admin/VehicleManagementPage";
import VehicleTagsPage from "./pages/admin/VehicleTagsPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";
import DriverRankingSettingsPage from "./pages/admin/DriverRankingSettingsPage";
import MaintenanceTasksAdmin from "./pages/admin/MaintenanceTasksAdmin";
import MessageTemplatesPage from "./pages/admin/MessageTemplatesPage";
import CompanySettings from "./pages/admin/CompanySettings";
import CompleteFixedReportingDashboard from "./pages/admin/CompleteFixedReportingDashboard";
import DocumentRedirect from "./pages/DocumentRedirect";
import UploadPhotos from "./pages/UploadPhotos";
import { isNetworkError } from "./utils/supabaseClient";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SmartRedirect from "./components/auth/SmartRedirect";
import { createLogger } from './utils/logger';

const logger = createLogger('App');

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set default language on app load - only if i18n is ready
    if (i18n.isInitialized) {
      const savedLanguage = localStorage.getItem('language') || 'en'; // Default to English
      i18n.changeLanguage(savedLanguage);
    }
  }, []);


  useEffect(() => {
    // Handle hash routing redirects (catch any old hash URLs)
    if (window.location.hash) {
      const hashPath = window.location.hash.replace('#', '');
      navigate(hashPath, { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    // Test Supabase connection and get initial session
    const initializeApp = async () => {
      try {
        // Test Supabase connection on app start
        await testSupabaseConnection();
      } catch (connectionError) {
        logger.error('Supabase connection test failed:', connectionError);
        // Continue anyway, but log the issue
      }

      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (isNetworkError(error)) {
            if (config.isDev) logger.warn('Network error getting session, continuing without session');
            setSession(null);
          } else {
            logger.error('Session error:', error);
            setSession(null);
          }
        } else {
          setSession(session);
        }
      } catch (error) {
        logger.error('Failed to get session:', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <div>
          <Suspense fallback={<LoadingScreen isLoading={true} />}>
            <Routes>
            <Route path="/login" element={!session ? <LoginPage /> : <SmartRedirect />} />
            <Route path="/register" element={!session ? <RegisterPage /> : <SmartRedirect />} />
            <Route path="/reset-password" element={!session ? <ResetPasswordPage /> : <SmartRedirect />} />
            <Route path="/" element={<SmartRedirect />} />
            <Route path="/dashboard" element={<ProtectedRoute session={session} loading={loading}><DashboardPage /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute session={session} loading={loading}><VehiclesPage /></ProtectedRoute>} />
            <Route path="/vehicles/:id" element={<ProtectedRoute session={session} loading={loading}><VehiclePage /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute session={session} loading={loading}><DriversPage /></ProtectedRoute>} />
            <Route path="/drivers/:id" element={<ProtectedRoute session={session} loading={loading}><DriverPage /></ProtectedRoute>} />
            <Route path="/trips" element={<ProtectedRoute session={session} loading={loading}><TripsPage /></ProtectedRoute>} />
            <Route path="/trips/:id" element={<ProtectedRoute session={session} loading={loading}><TripDetailsPage /></ProtectedRoute>} />
            <Route path="/mobile/trips/new" element={<ProtectedRoute session={session} loading={loading}><MobileTripPage /></ProtectedRoute>} />
            <Route path="/trip-pnl-reports" element={<ProtectedRoute session={session} loading={loading}><TripPnlReportsPage /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute session={session} loading={loading}><MaintenancePage /></ProtectedRoute>} />
            <Route path="/maintenance/:id" element={<ProtectedRoute session={session} loading={loading}><MaintenanceTaskPage /></ProtectedRoute>} />
            <Route path="/ai-alerts" element={<ProtectedRoute session={session} loading={loading}><AIAlertsPage /></ProtectedRoute>} />
            <Route path="/drivers/insights" element={<ProtectedRoute session={session} loading={loading}><DriverInsightsPage /></ProtectedRoute>} />
            <Route path="/parts-health-analytics" element={<ProtectedRoute session={session} loading={loading}><PartsHealthAnalyticsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute session={session} loading={loading}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/reminders" element={<ProtectedRoute session={session} loading={loading}><RemindersPage /></ProtectedRoute>} />
            <Route path="/admin/alert-settings" element={<ProtectedRoute session={session} loading={loading}><AlertSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/trip-locations" element={<ProtectedRoute session={session} loading={loading}><TripLocationsPage /></ProtectedRoute>} />
            <Route path="/admin/trips" element={<ProtectedRoute session={session} loading={loading}><AdminTripsPage /></ProtectedRoute>} />
            <Route path="/admin/vehicle-management" element={<ProtectedRoute session={session} loading={loading}><VehicleManagementPage /></ProtectedRoute>} />
            <Route path="/admin/vehicle-tags" element={<ProtectedRoute session={session} loading={loading}><VehicleTagsPage /></ProtectedRoute>} />
            <Route path="/admin/driver-management" element={<ProtectedRoute session={session} loading={loading}><AdminDriversPage /></ProtectedRoute>} />
            <Route path="/admin/activity-logs" element={<ProtectedRoute session={session} loading={loading}><ActivityLogPage /></ProtectedRoute>} />
            <Route path="/admin/driver-ranking-settings" element={<ProtectedRoute session={session} loading={loading}><DriverRankingSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/maintenance-tasks" element={<ProtectedRoute session={session} loading={loading}><MaintenanceTasksAdmin /></ProtectedRoute>} />
            <Route path="/admin/message-templates" element={<ProtectedRoute session={session} loading={loading}><MessageTemplatesPage /></ProtectedRoute>} />
            <Route path="/admin/company-settings" element={<ProtectedRoute session={session} loading={loading}><CompanySettings /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute session={session} loading={loading}><CompleteFixedReportingDashboard /></ProtectedRoute>} />
            <Route path="/doc/:shortId" element={<DocumentRedirect />} />
            {/* Public route for photo uploads - no authentication required */}
            <Route path="/upload/:taskId" element={<UploadPhotos />} />
            </Routes>
          </Suspense>
          
          {/* Mobile Bottom Navigation - Shows only on mobile */}
          {/* <MobileBottomNav /> */}
          
          <ToastContainer 
            position="top-right" 
            autoClose={3000} 
            hideProgressBar={false} 
            newestOnTop 
            closeOnClick 
            rtl={false} 
            pauseOnFocusLoss
            style={{ top: '70px' }}
            limit={3} 
            draggable 
            pauseOnHover 
          />
        </div>
      </ErrorBoundary>
    </I18nextProvider>
  );
};

const AppWrapper: React.FC = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;