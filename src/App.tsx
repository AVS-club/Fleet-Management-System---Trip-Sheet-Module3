import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { updateAllTripMileage } from './utils/storage';

function App() {
  useEffect(() => {
    // trying to edit from second account
    // Update all trip mileage calculations when the app starts
    updateAllTripMileage();
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen isLoading={true} />}>
          <Routes>
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
            <Route path="*" element={<Navigate to="/\" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <AVSChatbot />
    </Router>
  );
}

export default App;