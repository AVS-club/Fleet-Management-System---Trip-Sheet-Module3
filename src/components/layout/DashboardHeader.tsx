import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  owner_id: string;
}

interface DashboardHeaderProps {
  vehicleCount?: number;
  className?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ vehicleCount = 0, className = '' }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching organization:', error);
        } else if (data) {
          setOrganization(data);
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className={`rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
          <div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border bg-white dark:bg-white px-4 py-3 shadow-sm mb-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-2">
        {organization?.logo_url && (
          <img 
            src={organization.logo_url} 
            alt={`${organization.name} logo`}
            className="h-10 w-10 rounded object-contain border border-gray-200"
            onError={(e) => {
              // Hide logo if it fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {organization?.name || "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500">
            Updated: {format(currentTime, 'MMMM dd, yyyy HH:mm')} • {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'} active
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
