import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import RoleGate from "./components/RoleGate";
import AddHub from "./pages/AddHub";
import DebugRoleBanner from "./components/DebugRoleBanner";
import { getRole, Role } from "./utils/session";

// Existing pages (adjust imports if your file names differ)
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

// Admin pages
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

// Driver insights page
import DriverInsightsPage from "./pages/drivers/DriverInsightsPage";

import ThemeToggle from "./components/ui/ThemeToggle";

function AppRoutes() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getRole();
        setRole(r);
        if (r === "ADD_ONLY") navigate("/add", { replace: true });
      } catch {
        // not logged in or no profile; allow app to render its default auth flow
      }
    })();
  }, [navigate]);

  return (
    <>
      <Routes>
        {/* Authentication routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ADD_ONLY hub */}
        <Route
          path="/add"
          element={
            <RoleGate allow="ADD_ONLY" fallback={<div>Not allowed</div>}>
              <AddHub />
            </RoleGate>
          }
        />

        {/* OWNER-only routes */}
        <Route
          path="/"
          element={
            <RoleGate allow="OWNER" fallback={<div>Not allowed</div>}>
              <DashboardPage />
            </RoleGate>
          }
        />
        <Route path="/vehicles" element={<RoleGate allow="OWNER"><VehiclesPage /></RoleGate>} />
        <Route path="/vehicles/:id" element={<RoleGate allow="OWNER"><VehiclePage /></RoleGate>} />
        <Route path="/trips" element={<RoleGate allow="OWNER"><TripsPage /></RoleGate>} />
        <Route path="/trips/:id" element={<RoleGate allow="OWNER"><TripDetailsPage /></RoleGate>} />
        <Route path="/maintenance" element={<RoleGate allow="OWNER"><MaintenancePage /></RoleGate>} />
        <Route path="/maintenance/:id" element={<RoleGate allow="OWNER"><MaintenanceTaskPage /></RoleGate>} />
        <Route path="/drivers" element={<RoleGate allow="OWNER"><DriversPage /></RoleGate>} />
        <Route path="/drivers/:id" element={<RoleGate allow="OWNER"><DriverPage /></RoleGate>} />
        <Route path="/drivers/insights" element={<RoleGate allow="OWNER"><DriverInsightsPage /></RoleGate>} />
        <Route path="/alerts" element={<RoleGate allow="OWNER"><AIAlertsPage /></RoleGate>} />
        <Route path="/trip-pnl-reports" element={<RoleGate allow="OWNER"><TripPnlReportsPage /></RoleGate>} />
        <Route path="/parts-health" element={<RoleGate allow="OWNER"><PartsHealthAnalyticsPage /></RoleGate>} />
        <Route path="/notifications" element={<RoleGate allow="OWNER"><NotificationsPage /></RoleGate>} />

        {/* Admin routes */}
        <Route path="/admin" element={<RoleGate allow="OWNER"><AdminDashboard /></RoleGate>} />
        <Route path="/admin/trips" element={<RoleGate allow="OWNER"><AdminTripsPage /></RoleGate>} />
        <Route path="/admin/alert-settings" element={<RoleGate allow="OWNER"><AlertSettingsPage /></RoleGate>} />
        <Route path="/admin/maintenance-tasks" element={<RoleGate allow="OWNER"><MaintenanceTasksAdmin /></RoleGate>} />
        <Route path="/admin/trip-locations" element={<RoleGate allow="OWNER"><TripLocationsPage /></RoleGate>} />
        <Route path="/admin/reminders" element={<RoleGate allow="OWNER"><RemindersPage /></RoleGate>} />
        <Route path="/admin/vehicle-management" element={<RoleGate allow="OWNER"><VehicleManagementPage /></RoleGate>} />
        <Route path="/admin/document-rules" element={<RoleGate allow="OWNER"><AdminDocumentRulesPage /></RoleGate>} />
        <Route path="/admin/driver-ranking-settings" element={<RoleGate allow="OWNER"><DriverRankingSettingsPage /></RoleGate>} />
        <Route path="/admin/message-templates" element={<RoleGate allow="OWNER"><MessageTemplatesPage /></RoleGate>} />
        <Route path="/admin/activity-logs" element={<RoleGate allow="OWNER"><ActivityLogPage /></RoleGate>} />
        <Route path="/admin/driver-management" element={<RoleGate allow="OWNER"><AdminDriversPage /></RoleGate>} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} newestOnTop pauseOnFocusLoss pauseOnHover />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <DebugRoleBanner />
    </BrowserRouter>
  );
}
