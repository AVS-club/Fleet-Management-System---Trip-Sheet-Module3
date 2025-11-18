import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '../LoadingScreen';
import TNCAcceptanceModal from '../TNCAcceptanceModal';
import { useTNCAcceptance } from '../../hooks/useTNCAcceptance';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../utils/supabaseClient';

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
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showTNCModal, setShowTNCModal] = useState(false);
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { hasAccepted, loading: tncLoading } = useTNCAcceptance(userId, organizationId);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (session?.user) {
        setUserId(session.user.id);
        // Get organization ID from permissions or try to fetch it
        if (permissions?.organizationId) {
          setOrganizationId(permissions.organizationId);
        } else {
          // Fallback: try to get organization from organizations table
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', session.user.id)
            .single();
          if (org) {
            setOrganizationId(org.id);
          }
        }
      }
    };

    if (session && !permissionsLoading) {
      fetchUserInfo();
    }
  }, [session, permissions, permissionsLoading]);

  useEffect(() => {
    // Show TNC modal if user is logged in but hasn't accepted TNC
    if (!loading && !tncLoading && !permissionsLoading && session && userId && !hasAccepted) {
      setShowTNCModal(true);
    } else if (hasAccepted) {
      setShowTNCModal(false);
    }
  }, [loading, tncLoading, permissionsLoading, session, userId, hasAccepted]);

  const handleTNCAccept = () => {
    setShowTNCModal(false);
    // Force a refresh to update the acceptance status
    window.location.reload();
  };

  if (loading || tncLoading || permissionsLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Show TNC modal if user hasn't accepted
  if (showTNCModal && userId) {
    return (
      <>
        <TNCAcceptanceModal
          userId={userId}
          organizationId={organizationId}
          onAccept={handleTNCAccept}
        />
        {/* Block the UI behind the modal */}
        <div className="pointer-events-none opacity-50">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
