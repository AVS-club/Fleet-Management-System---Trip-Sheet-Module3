import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'react-toastify';

export interface Challan {
  challan_no: string;
  date: string;
  accused_name: string;
  challan_status: string;
  amount: number;
  state: string;
  area: string;
  offence: string;
  offence_list?: Array<{ offence_name: string }>;
}

export interface ChallanInfo {
  vehicleId: string;
  total: number;
  challans: Challan[];
}

export const useChallanInfo = () => {
  const [loading, setLoading] = useState(false);
  const [challans, setChallans] = useState<ChallanInfo | null>(null);

  const fetchChallanInfo = async (vehicleId: string, chassis?: string, engine_no?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-challan-info', {
        body: { vehicleId, chassis, engine_no }
      });

      if (error) throw error;

      if (data.status === 'success' && data.response) {
        setChallans(data.response);
        
        // Update the vehicle record with challan info
        if (data.response.total > 0) {
          toast.warning(`Found ${data.response.total} challan(s) for vehicle ${vehicleId}`);
        } else {
          toast.success(`No pending challans for vehicle ${vehicleId}`);
        }
        
        return data.response;
      } else {
        toast.error(data.message || 'Failed to fetch challan information');
        return null;
      }
    } catch (error) {
      console.error('Error fetching challan info:', error);
      toast.error('Failed to fetch challan information');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchMultipleVehicleChallans = async (vehicles: Array<{ 
    registration_number: string; 
    chassis_no?: string; 
    engine_no?: string 
  }>) => {
    const results = [];
    
    for (const vehicle of vehicles) {
      const result = await fetchChallanInfo(
        vehicle.registration_number,
        vehicle.chassis_no,
        vehicle.engine_no
      );
      
      if (result) {
        results.push(result);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return results;
  };

  return {
    loading,
    challans,
    fetchChallanInfo,
    fetchMultipleVehicleChallans
  };
};
