import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehiclePage from "./pages/VehiclePage";
import TripsPage from "./pages/TripsPage";
import TripDetailsPage from "./pages/TripDetailsPage";
import MaintenancePage from "./pages/MaintenancePage";
import MaintenanceTaskPage from "./pages/MaintenanceTaskPage";
import DriversPage from "./pages/DriversPage";
import DriverPage from "./pages/DriverPage";
import AIAlertsPage from "./pages/AIAlertsPage";
import TripPnlReportsPage from "./pages/TripPnlReportsPage";
import PartsHealthAnalyticsPage from "./pages/PartsHealthAnalyticsPage";
import NotificationsPage from "./pages/NotificationsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTripsPage from "./pages/admin/AdminTripsPage";
import AlertSettingsPage from "./pages/admin/AlertSettingsPage";
import MaintenanceTasksAdmin from "./pages/admin/MaintenanceTasksAdmin";
import TripLocationsPage from "./pages/admin/TripLocationsPage";
import RemindersPage from "./pages/admin/RemindersPage";
import VehicleManagementPage from "./pages/admin/VehicleManagementPage";
import AdminDocumentRulesPage from "./pages/admin/AdminDocumentRulesPage";
import DriverRankingSettingsPage from "./pages/admin/DriverRankingSettingsPage";
import MessageTemplatesPage from "./pages/admin/MessageTemplatesPage";
import ActivityLogPage from "./pages/admin/ActivityLogPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";

import DriverInsightsPage from "./pages/drivers/DriverInsightsPage";

function AppRoutes() {
  return (
    <>
      <Routes>
        {/* Authentication routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Main routes */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/:id" element={<VehiclePage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/maintenance/:id" element={<MaintenanceTaskPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/drivers/:id" element={<DriverPage />} />
        <Route path="/drivers/insights" element={<DriverInsightsPage />} />
        <Route path="/alerts" element={<AIAlertsPage />} />
        <Route path="/trip-pnl-reports" element={<TripPnlReportsPage />} />
        <Route path="/parts-health" element={<PartsHealthAnalyticsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/trips" element={<AdminTripsPage />} />
        <Route path="/admin/alert-settings" element={<AlertSettingsPage />} />
        <Route path="/admin/maintenance-tasks" element={<MaintenanceTasksAdmin />} />
        <Route path="/admin/trip-locations" element={<TripLocationsPage />} />
        <Route path="/admin/reminders" element={<RemindersPage />} />
        <Route path="/admin/vehicle-management" element={<VehicleManagementPage />} />
        <Route path="/admin/document-rules" element={<AdminDocumentRulesPage />} />
        <Route path="/admin/driver-ranking-settings" element={<DriverRankingSettingsPage />} />
        <Route path="/admin/message-templates" element={<MessageTemplatesPage />} />
        <Route path="/admin/activity-logs" element={<ActivityLogPage />} />
        <Route path="/admin/driver-management" element={<AdminDriversPage />} />
      </Routes>

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
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}