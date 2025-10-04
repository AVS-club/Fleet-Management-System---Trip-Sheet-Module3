import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePermissions } from '../hooks/usePermissions';
import HeroFeed from '../components/HeroFeed';

const NotificationsPage: React.FC = () => {
  const { permissions, loading: permissionsLoading } = usePermissions();

  // Redirect non-owner users
  if (!permissionsLoading && !permissions?.canAccessAlerts) {
    return <Navigate to="/vehicles" replace />;
  }

  if (permissionsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout
      title="Fleet Activity Feed"
      subtitle="Real-time updates and notifications from your fleet operations"
    >
      <HeroFeed />
    </Layout>
  );
};

export default NotificationsPage;