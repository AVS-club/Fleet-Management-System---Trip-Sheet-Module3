import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

const SmartRedirect: React.FC = () => {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  // For data entry users, redirect to trips instead of dashboard
  if (permissions?.role === 'data_entry') {
    return <Navigate to="/trips" replace />;
  }

  // For owners, redirect to dashboard
  if (permissions?.role === 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  // Fallback to trips for any other case
  return <Navigate to="/trips" replace />;
};

export default SmartRedirect;
