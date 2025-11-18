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
        setHasAccepted(false);
        setAcceptanceRecord(null);
        setLoading(false);
        return;
      }

      const cacheKey = `tnc_accept_v1_${userId}`;
      const cached = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) === 'true' : false;
      if (cached) {
        setHasAccepted(true);
      }

      try {
        setLoading(true);

        // Check if user has accepted TNC at least once (any org or global)
        const { data, error } = await supabase
          .from('tnc_acceptances')
          .select('*')
          .eq('user_id', userId)
          .order('accepted_at', { ascending: false })
          .limit(1);

        if (error) {
          logger.error('Error checking TNC acceptance:', error);
          setHasAccepted(cached);
        } else {
          const hasAcceptedTNC = !!(data && data.length > 0);
          setHasAccepted(hasAcceptedTNC);
          setAcceptanceRecord(hasAcceptedTNC ? data[0] : null);
          if (hasAcceptedTNC && typeof window !== 'undefined') {
            window.localStorage.setItem(cacheKey, 'true');
          } else if (!hasAcceptedTNC && typeof window !== 'undefined') {
            window.localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        logger.error('Error in TNC acceptance check:', error);
        setHasAccepted(cached);
      } finally {
        setLoading(false);
      }
    };

    checkTNCAcceptance();
  }, [userId, organizationId]);

  return { hasAccepted, loading, acceptanceRecord };
};

