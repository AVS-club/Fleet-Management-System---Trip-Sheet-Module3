import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { AlertTriangle } from 'lucide-react';

interface GoogleMapProps {
  waypoints: Array<{ lat: number; lng: number }>;
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ waypoints, className = 'h-64' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key is missing. Please check your environment variables.');
      return;
    }

    if (!Array.isArray(waypoints) || waypoints.length === 0) {
      setError('No waypoints provided for the map.');
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
        Array.isArray(waypoints) && waypoints.forEach(point => {
          if (!isValidLatLng(point)) {
            throw new Error(`Invalid coordinates provided: ${JSON.stringify(point)}`);
          }
          bounds.extend(point);
        });

        const mapOptions = {
          center: bounds.getCenter(),
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
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
        };

        const map = new google.maps.Map(mapRef.current, mapOptions);
        map.fitBounds(bounds, 50);
        mapInstanceRef.current = map;

        // Add markers for each waypoint
        Array.isArray(waypoints) && waypoints.forEach((point, index) => {
          new google.maps.Marker({
            position: point,
            map,
            label: index === 0 ? 'S' : index === (waypoints?.length || 0) - 1 ? 'E' : String(index),
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: index === 0 ? '#4CAF50' : index === (waypoints?.length || 0) - 1 ? '#F44336' : '#2196F3',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            }
          });
        });

        // Draw route path if there are at least 2 waypoints
        if (Array.isArray(waypoints) && waypoints.length >= 2) {
          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#4CAF50',
              strokeWeight: 4
            }
          });

          const origin = waypoints![0];
          const destination = waypoints![waypoints!.length - 1];
          const waypts = waypoints!.slice(1, -1).map(point => ({
            location: point,
            stopover: true
          }));

          const request = {
            origin,
            destination,
            waypoints: waypts,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING
          };

          directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              directionsRenderer.setDirections(result);
            } else {
              handleDirectionsError(status);
            }
          });
        }
      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize map');
      }
    }).catch((err) => {
      console.error('Error loading Google Maps:', err);
      setError('Failed to load Google Maps. Please check your API key and try again.');
    });
  }, [waypoints]);

  const isValidLatLng = (point: { lat: number; lng: number }): boolean => {
    return (
      typeof point.lat === 'number' &&
      typeof point.lng === 'number' &&
      point.lat >= -90 && point.lat <= 90 &&
      point.lng >= -180 && point.lng <= 180
    );
  };

  const handleDirectionsError = (status: google.maps.DirectionsStatus) => {
    let errorMessage = 'Failed to calculate route. ';

    switch (status) {
      case google.maps.DirectionsStatus.ZERO_RESULTS:
        errorMessage += 'No route could be found between the origin and destination.';
        break;
      case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
        errorMessage += 'API quota exceeded.';
        break;
      case google.maps.DirectionsStatus.REQUEST_DENIED:
        errorMessage += 'Request was denied. Please check API key permissions.';
        break;
      default:
        errorMessage += 'Please try again later.';
    }
    
    setError(errorMessage);
  };

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

  return <div ref={mapRef} className={className} />;
};

export default GoogleMap;