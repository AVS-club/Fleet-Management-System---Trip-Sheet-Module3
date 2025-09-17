import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '../LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  session: any;
  loading: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  session, 
  loading 
}) => {
  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
