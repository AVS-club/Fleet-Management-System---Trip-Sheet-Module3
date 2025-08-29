import { useState, useEffect } from 'react';
import { getVehicle, getVehicleStats } from '../services/vehicles';
import { getTrips } from '../services/trips';
import { getSignedDocumentUrl } from '../utils/supabaseStorage';
import type { Vehicle, Trip } from '@/types';
import { toast } from 'react-toastify';

interface VehicleStats {
  totalTrips: number;
  totalDistance: number;
  averageKmpl?: number;
}

export const useVehicleData = (id?: string) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<VehicleStats>({ totalTrips: 0, totalDistance: 0 });
  const [signedDocUrls, setSignedDocUrls] = useState<{
    rc?: string[];
    insurance?: string[];
    fitness?: string[];
    tax?: string[];
    permit?: string[];
    puc?: string[];
    other: Record<string, string>;
  }>({ other: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [vehicleData, tripsData, vehicleStats] = await Promise.all([
          getVehicle(id),
          getTrips(),
          getVehicleStats(id),
        ]);

        setVehicle(vehicleData);
        setTrips(Array.isArray(tripsData) ? tripsData.filter(trip => trip.vehicle_id === id) : []);
        setStats(vehicleStats || { totalTrips: 0, totalDistance: 0 });

        if (vehicleData) {
          await generateSignedUrls(vehicleData);
        }
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const generateSignedUrls = async (vehicleData: Vehicle) => {
    const urls: {
      rc?: string[];
      insurance?: string[];
      fitness?: string[];
      tax?: string[];
      permit?: string[];
      puc?: string[];
      other: Record<string, string>;
    } = { other: {} };

    try {
      if (vehicleData.rc_document_url && Array.isArray(vehicleData.rc_document_url)) {
        urls.rc = await Promise.all(
          vehicleData.rc_document_url.map(path => getSignedDocumentUrl(path))
        );
      }
      if (vehicleData.insurance_document_url && Array.isArray(vehicleData.insurance_document_url)) {
        urls.insurance = await Promise.all(
          vehicleData.insurance_document_url.map(path => getSignedDocumentUrl(path))
        );
      }
      if (vehicleData.fitness_document_url && Array.isArray(vehicleData.fitness_document_url)) {
        urls.fitness = await Promise.all(
          vehicleData.fitness_document_url.map(path => getSignedDocumentUrl(path))
        );
      }
      if (vehicleData.tax_document_url && Array.isArray(vehicleData.tax_document_url)) {
        urls.tax = await Promise.all(
          vehicleData.tax_document_url.map(path => getSignedDocumentUrl(path))
        );
      }
      if (vehicleData.permit_document_url && Array.isArray(vehicleData.permit_document_url)) {
        urls.permit = await Promise.all(
          vehicleData.permit_document_url.map(path => getSignedDocumentUrl(path))
        );
      }
      if (vehicleData.puc_document_url && Array.isArray(vehicleData.puc_document_url)) {
        urls.puc = await Promise.all(
          vehicleData.puc_document_url.map(path => getSignedDocumentUrl(path))
        );
      }
      if (vehicleData.other_documents && Array.isArray(vehicleData.other_documents)) {
        for (let i = 0; i < vehicleData.other_documents.length; i++) {
          const doc = vehicleData.other_documents[i];
          if (doc.file_path) {
            urls.other[`other_${i}`] = await getSignedDocumentUrl(doc.file_path);
          }
        }
      }
      setSignedDocUrls(urls);
    } catch (error) {
      console.error('Error generating signed URLs:', error);
      toast.error('Failed to generate document access links');
    }
  };

  return { vehicle, trips, stats, signedDocUrls, loading };
};

export default useVehicleData;
