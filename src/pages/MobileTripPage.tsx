import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileTripForm from '../components/trips/MobileTripForm';
import { Trip, TripFormData, Vehicle, Driver, Destination, Warehouse } from '@/types';
import { getTrips, getVehicles, createTrip, updateTrip, getWarehouses, getDestinations } from '../utils/storage';
import { getDrivers } from '../utils/api/drivers';
import { getMaterialTypes, MaterialType } from '../utils/materialTypes';
import { useMobileOptimization } from '../hooks/useMobileOptimization';
import { isMobileDevice, triggerHapticFeedback } from '../utils/mobileUtils';
import { toast } from 'react-toastify';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import '../styles/mobile.css';

const MobileTripPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
  
  const { isMobile, triggerHaptic } = useMobileOptimization();
  
  // Get initial data from location state (for editing)
  const initialData = location.state?.tripData;
  const isEditing = !!initialData;

  // Load form data
  useEffect(() => {
    const loadFormData = async () => {
      setLoading(true);
      try {
        const [tripsData, vehiclesData, driversData, warehousesData, destinationsData, materialTypesData] = await Promise.all([
          getTrips(),
          getVehicles(),
          getDrivers(),
          getWarehouses(),
          getDestinations(),
          getMaterialTypes()
        ]);

        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
        setDestinations(Array.isArray(destinationsData) ? destinationsData : []);
        setMaterialTypes(Array.isArray(materialTypesData) ? materialTypesData : []);
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineIndicator(false);
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineIndicator(true);
      toast.warning('You are now offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle form submission
  const handleSubmit = async (data: TripFormData) => {
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      if (isEditing && initialData.id) {
        await updateTrip(initialData.id, data);
        toast.success('Trip updated successfully!');
        triggerHaptic('light');
      } else {
        await createTrip(data);
        toast.success('Trip created successfully!');
        triggerHaptic('light');
      }

      // Navigate back to trips list
      setTimeout(() => {
        navigate('/trips');
      }, 1500);
    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error('Failed to save trip. Please try again.');
      triggerHaptic('heavy');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    triggerHaptic('light');
    navigate(-1);
  };

  // Redirect to desktop version if not mobile
  useEffect(() => {
    if (!isMobileDevice() && !isMobile) {
      navigate('/trips/new', { replace: true });
    }
  }, [isMobile, navigate]);

  if (loading) {
    return (
      <div className="mobile-container">
        <div className="header-mobile">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Trip' : 'New Trip'}
              </h1>
            </div>
            <div className="connection-indicator">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
        </div>
        
        <div className="trip-form-container">
          <div className="form-section">
            <div className="mobile-loading" style={{ height: '200px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Offline Indicator */}
      {showOfflineIndicator && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">You are offline</span>
          </div>
        </div>
      )}

      {/* Mobile Trip Form */}
      <MobileTripForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        trips={trips}
        initialData={initialData}
        allVehicles={vehicles}
        allDrivers={drivers}
        allDestinations={destinations}
        allWarehouses={warehouses}
        allMaterialTypes={materialTypes}
      />

      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-40">
        <div className={`p-2 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTripPage;
