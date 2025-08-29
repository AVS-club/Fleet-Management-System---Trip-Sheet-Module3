import { useState, useEffect } from 'react';
import { getDriver, getDrivers } from '../services/drivers';
import { getVehicle, getVehicles } from '../services/vehicles';
import { getTrips } from '../services/trips';
import { getAIAlerts } from '../utils/aiAnalytics';
import type { Driver, Vehicle, Trip, AIAlert } from '@/types';

export const useDriverData = (id?: string) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [primaryVehicle, setPrimaryVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<AIAlert[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const driverData = await getDriver(id);
        setDriver(driverData);

        if (driverData?.primary_vehicle_id) {
          const vehicleData = await getVehicle(driverData.primary_vehicle_id);
          setPrimaryVehicle(vehicleData);
        }

        const tripsData = await getTrips();
        setTrips(Array.isArray(tripsData) ? tripsData.filter(trip => trip.driver_id === id) : []);

        const alertsData = await getAIAlerts();
        setAlerts(
          Array.isArray(alertsData)
            ? alertsData.filter(
                alert =>
                  alert.affected_entity?.type === 'driver' &&
                  alert.affected_entity?.id === id &&
                  alert.status === 'pending'
              )
            : []
        );

        const [allDriversData, allVehiclesData] = await Promise.all([
          getDrivers(),
          getVehicles()
        ]);

        setAllDrivers(Array.isArray(allDriversData) ? allDriversData : []);
        setAllVehicles(Array.isArray(allVehiclesData) ? allVehiclesData : []);
      } catch (error) {
        console.error('Error fetching driver data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return { driver, primaryVehicle, trips, alerts, allDrivers, allVehicles, loading };
};

export default useDriverData;
