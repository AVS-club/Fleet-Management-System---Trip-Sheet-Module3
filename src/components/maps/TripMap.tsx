import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Warehouse, Destination } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface TripMapProps {
  warehouse?: Warehouse;
  destinations: Destination[] | null;
  className?: string;
  optimizedOrder?: Destination[];
  showOptimizedRoute?: boolean;
}

const TripMap: React.FC<TripMapProps> = ({
  warehouse,
  destinations,
  className = 'h-[300px]',
  optimizedOrder,
  showOptimizedRoute = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key is missing');
      return;
    }

    if (!warehouse && (!Array.isArray(destinations) || destinations.length === 0)) {
      setError('No locations to display');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      try {
        const bounds = new google.maps.LatLngBounds();
        let hasValidLocation = false;
        
        // Add warehouse to bounds if available and has valid coordinates
        if (warehouse && 
            typeof warehouse.latitude === 'number' && 
            typeof warehouse.longitude === 'number' &&
            !isNaN(warehouse.latitude) && 
            !isNaN(warehouse.longitude)) {
          bounds.extend({ lat: warehouse.latitude, lng: warehouse.longitude });
          hasValidLocation = true;
        }

        // Add destinations to bounds if they have valid coordinates
        if (Array.isArray(destinations)) {
          destinations.forEach(dest => {
            if (typeof dest.latitude === 'number' && 
                typeof dest.longitude === 'number' &&
                !isNaN(dest.latitude) && 
                !isNaN(dest.longitude)) {
              bounds.extend({ lat: dest.latitude, lng: dest.longitude });
              hasValidLocation = true;
            }
          });
        }

        if (!hasValidLocation) {
          setError('No valid location coordinates found');
          return;
        }

        // Initialize map
        const map = new google.maps.Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        map.fitBounds(bounds, 50);
        mapInstanceRef.current = map;

        // Add warehouse marker if available and has valid coordinates
        if (warehouse && 
            typeof warehouse.latitude === 'number' && 
            typeof warehouse.longitude === 'number' &&
            !isNaN(warehouse.latitude) && 
            !isNaN(warehouse.longitude)) {
          new google.maps.Marker({
            position: { lat: warehouse.latitude, lng: warehouse.longitude },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4CAF50',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            },
            title: 'Warehouse'
          });
        }

        // Add destination markers
        const routePoints = showOptimizedRoute && Array.isArray(optimizedOrder) ? optimizedOrder : 
                           (Array.isArray(destinations) ? destinations : []);
        
        if (Array.isArray(routePoints)) {
          routePoints.forEach((dest, index) => {
            if (typeof dest.latitude === 'number' && 
                typeof dest.longitude === 'number' &&
                !isNaN(dest.latitude) && 
                !isNaN(dest.longitude)) {
              new google.maps.Marker({
                position: { lat: dest.latitude, lng: dest.longitude },
                map,
                label: String(index + 1),
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#2196F3',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FFFFFF'
                },
                title: dest.name
              });
            }
          });
        }

        // Draw route if warehouse and destinations are available with valid coordinates
        if (warehouse && 
            typeof warehouse.latitude === 'number' && 
            typeof warehouse.longitude === 'number' &&
            !isNaN(warehouse.latitude) && 
            !isNaN(warehouse.longitude) &&
            Array.isArray(routePoints) && 
            routePoints.length > 0) {
          
          // Filter route points to only include those with valid coordinates
          const validRoutePoints = routePoints.filter(dest => 
            typeof dest.latitude === 'number' && 
            typeof dest.longitude === 'number' &&
            !isNaN(dest.latitude) && 
            !isNaN(dest.longitude)
          );

          if (validRoutePoints.length > 0) {
            const directionsService = new google.maps.DirectionsService();
            const directionsRenderer = new google.maps.DirectionsRenderer({
              map,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#4CAF50',
                strokeWeight: 4
              }
            });

            const origin = new google.maps.LatLng(warehouse.latitude, warehouse.longitude);
            const finalDestination = new google.maps.LatLng(
              validRoutePoints[validRoutePoints.length - 1].latitude,
              validRoutePoints[validRoutePoints.length - 1].longitude
            );

            const waypoints = validRoutePoints.slice(1, -1).map(dest => ({
              location: new google.maps.LatLng(dest.latitude, dest.longitude),
              stopover: true
            }));

            directionsService.route({
              origin,
              destination: finalDestination,
              waypoints,
              optimizeWaypoints: false,
              travelMode: google.maps.TravelMode.DRIVING
            }, (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
              } else {
                console.error('Directions request failed:', status);
              }
            });
          }
        }

      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize map');
      }
    }).catch(err => {
      console.error('Error loading Google Maps:', err);
      setError('Failed to load Google Maps');
    });
  }, [warehouse, destinations, optimizedOrder, showOptimizedRoute]);

  if (error) {
    return (
      <div className={`${className} bg-error-50 border border-error-200 rounded-lg flex items-center justify-center`}>
        <div className="text-center p-4">
          <AlertTriangle className="h-8 w-8 text-error-500 mx-auto mb-2" />
          <p className="text-error-700">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={`${className} rounded-lg overflow-hidden`} />;
};

export default TripMap;