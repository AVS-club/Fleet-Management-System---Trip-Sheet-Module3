import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'react-toastify';

export interface Challan {
  challan_no: string;
  date: string;
  accused_name: string;
  challan_status: string;
  amount: number | string;  // Can be empty string
  state: string;
  area: string;
  offence: string;
  offences?: Array<{ offence_name: string }>;  // Changed from offence_list
}

export interface ChallanInfo {
  vehicleId: string;
  total: number;
  challans: Challan[];
}

export const useChallanInfo = () => {
  const [loading, setLoading] = useState(false);
  const [challans, setChallans] = useState<ChallanInfo | null>(null);

  const fetchChallanInfo = async (vehicleId: string, chassis: string, engine_no: string) => {
    // Validate before calling
    if (!vehicleId || !chassis || !engine_no) {
      toast.error('Vehicle ID, Chassis, and Engine Number are required for challan check');
      return null;
    }

    // Clean inputs (remove spaces and uppercase)
    const cleanedData = {
      vehicleId: vehicleId?.replace(/\s/g, '').toUpperCase(),
      chassis: chassis?.replace(/\s/g, '').toUpperCase(),
      engine_no: engine_no?.replace(/\s/g, '').toUpperCase()
    };

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-challan-info', {
        body: cleanedData
      });

      if (error) throw error;

      // Debug: Log the actual API response
      console.log('Challan API Response:', data);
      
      if (data.status === 'success' && data.response) {
        console.log('Challan Data:', data.response);
        
        // Check if response contains mock data
        const hasMockData = data.response.challans?.some(challan => 
          challan.challan_no.includes('XXXX') || 
          challan.accused_name.includes('DUMMY') ||
          challan.date.includes('XXXX') ||
          challan.offence.includes('Custom offence')
        );
        
        if (hasMockData) {
          toast.warning('⚠️ API returned sample data. Check API configuration for real challan data.');
          console.warn('Mock data detected in challan response');
        }
        
        setChallans(data.response);
        
        // Update the vehicle record with challan info
        if (data.response.total > 0) {
          if (hasMockData) {
            toast.warning(`Found ${data.response.total} sample challan(s) for vehicle ${cleanedData.vehicleId} (API in test mode)`);
          } else {
            toast.warning(`Found ${data.response.total} challan(s) for vehicle ${cleanedData.vehicleId}`);
          }
        } else {
          toast.success(`No pending challans for vehicle ${cleanedData.vehicleId}`);
        }
        
        return data.response;
      } else {
        console.log('API Error Response:', data);
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
    chassis_number: string;  // Changed from chassis_no
    engine_number: string;   // Changed from engine_no
  }>) => {
    const results = [];
    
    for (const vehicle of vehicles) {
      // Skip vehicles without required fields
      if (!vehicle.chassis_number || !vehicle.engine_number) {
        toast.warning(`Skipping ${vehicle.registration_number}: Missing chassis or engine number`);
        continue;
      }

      const result = await fetchChallanInfo(
        vehicle.registration_number,
        vehicle.chassis_number,  // Use correct field name
        vehicle.engine_number    // Use correct field name
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
