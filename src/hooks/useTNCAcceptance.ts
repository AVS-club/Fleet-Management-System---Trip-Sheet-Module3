import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { createLogger } from '../utils/logger';

const logger = createLogger('useTNCAcceptance');

interface TNCAcceptanceStatus {
  hasAccepted: boolean;
  loading: boolean;
  acceptanceRecord: any | null;
}

export const useTNCAcceptance = (userId: string | null, organizationId: string | null): TNCAcceptanceStatus => {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acceptanceRecord, setAcceptanceRecord] = useState<any | null>(null);

  useEffect(() => {
    const checkTNCAcceptance = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Check if user has accepted TNC (either globally or for this organization)
        let query = supabase
          .from('tnc_acceptances')
          .select('*')
          .eq('user_id', userId)
          .order('accepted_at', { ascending: false })
          .limit(1);

        // If organizationId is provided, prefer organization-specific acceptance
        // but also accept global acceptance (where organization_id is null)
        if (organizationId) {
          query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
        } else {
          query = query.is('organization_id', null);
        }

        const { data, error } = await query;

        if (error) {
          logger.error('Error checking TNC acceptance:', error);
          // If table doesn't exist yet, assume not accepted
          setHasAccepted(false);
        } else {
          const hasAcceptedTNC = data && data.length > 0;
          setHasAccepted(hasAcceptedTNC);
          setAcceptanceRecord(hasAcceptedTNC ? data[0] : null);
        }
      } catch (error) {
        logger.error('Error in TNC acceptance check:', error);
        setHasAccepted(false);
      } finally {
        setLoading(false);
      }
    };

    checkTNCAcceptance();
  }, [userId, organizationId]);

  return { hasAccepted, loading, acceptanceRecord };
};

