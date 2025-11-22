import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import LoadingScreen from '../LoadingScreen';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: keyof Omit<import('@/types/permissions').Permissions, 'role' | 'organizationId' | 'organizationName'>;
  redirectTo?: string;
  fallback?: React.ReactNode;
  /**
   * If true, shows an extended loading screen for restricted users to prevent FOUC (Flash of Unauthorized Content)
   * Admins/Owners get a faster load experience
   */
  preventFlicker?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission,
  redirectTo = '/trips',
  fallback,
  preventFlicker = true
}) => {
  const { permissions, loading } = usePermissions();
  const [isContentReady, setIsContentReady] = useState(false);
  const [hasStartedInitialRender, setHasStartedInitialRender] = useState(false);

  // First effect: Mark that we've started the render process
  useEffect(() => {
    if (!loading && permissions && !hasStartedInitialRender) {
      setHasStartedInitialRender(true);
    }
  }, [loading, permissions, hasStartedInitialRender]);

  // Second effect: Wait appropriate time based on user role
  useEffect(() => {
    if (hasStartedInitialRender && !loading && permissions) {
      const isRestrictedUser = permissions.role === 'data_entry' || permissions.role === 'manager';
      const isAdminUser = permissions.role === 'admin' || permissions.role === 'owner';
      
      if (preventFlicker && isRestrictedUser) {
        // For restricted users: longer wait to ensure all hiding is applied
        const timer = setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsContentReady(true);
            });
          });
        }, 600); // 600ms for restricted users
        
        return () => clearTimeout(timer);
      } else if (preventFlicker && isAdminUser) {
        // For admins: short wait to prevent flash but keep it reasonably fast
        const timer = setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsContentReady(true);
            });
          });
        }, 300); // 300ms for admins - prevents flicker while staying responsive
        
        return () => clearTimeout(timer);
      } else {
        // No flicker prevention: immediate render
        setIsContentReady(true);
      }
    }
  }, [hasStartedInitialRender, loading, permissions, preventFlicker]);

  // Show loading screen while permissions are being fetched
  if (loading) {
    return <LoadingScreen isLoading={true} />;
  }

  // If permissions failed to load
  if (!permissions) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required permission
  if (requiredPermission && !permissions[requiredPermission]) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  // ALWAYS wait for content to be ready if preventFlicker is enabled
  // This prevents flash for both admins and restricted users
  if (preventFlicker && !isContentReady) {
    return <LoadingScreen isLoading={true} />;
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default PermissionGuard;

