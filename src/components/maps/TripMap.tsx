import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Warehouse, Destination } from '../../types';
import { AlertTriangle, Info } from 'lucide-react';

interface TripMapProps {
  warehouse?: Warehouse;
  destinations: Destination[] | null;
  className?: string;
  optimizedOrder?: Destination[];
  showOptimizedRoute?: boolean;
}

interface MapStatus {
  message: string;
  type: 'error' | 'info';
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
  const [status, setStatus] = useState<MapStatus | null>(null);

  const getDirectionsErrorMessage = (status: google.maps.DirectionsStatus): MapStatus => {
    switch (status) {
      case google.maps.DirectionsStatus.ZERO_RESULTS:
        return {
          message: 'No drivable route found between the selected locations. Please check the coordinates or try different locations.',
          type: 'info'
        };
      case google.maps.DirectionsStatus.NOT_FOUND:
        return {
          message: 'One or more locations could not be found. Please verify the coordinates.',
          type: 'error'
        };
      case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
        return {
          message: 'Too many requests. Please try again later.',
          type: 'error'
        };
      case google.maps.DirectionsStatus.REQUEST_DENIED:
        return {
          message: 'Directions request was denied. Please check your API key permissions.',
          type: 'error'
        };
      case google.maps.DirectionsStatus.INVALID_REQUEST:
        return {
          message: 'Invalid directions request. Please check the route parameters.',
          type: 'error'
        };
      case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
        return {
          message: 'Too many waypoints in the route. Please reduce the number of destinations.',
          type: 'error'
        };
      case google.maps.DirectionsStatus.MAX_ROUTE_LENGTH_EXCEEDED:
        return {
          message: 'The route is too long. Please try a shorter route.',
          type: 'error'
        };
      default:
        return {
          message: `Directions request failed: ${status}`,
          type: 'error'
        };
    }
  };

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setStatus({ message: 'Google Maps API key is missing', type: 'error' });
      return;
    }

    if (!warehouse && (!Array.isArray(destinations) || destinations.length === 0)) {
      setStatus({ message: 'No locations to display', type: 'info' });
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
          setStatus({ message: 'No valid location coordinates found', type: 'info' });
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
                setStatus(getDirectionsErrorMessage(status));
              }
            });
          }
        }

      } catch (err) {
        console.error('Error initializing map:', err);
        setStatus({ 
          message: err instanceof Error ? err.message : 'Failed to initialize map', 
          type: 'error' 
        });
      }
    }).catch(err => {
      console.error('Error loading Google Maps:', err);
      setStatus({ message: 'Failed to load Google Maps', type: 'error' });
    });
  }, [warehouse, destinations, optimizedOrder, showOptimizedRoute]);

  if (status) {
    const bgColor = status.type === 'error' ? 'bg-error-50 border-error-200' : 'bg-blue-50 border-blue-200';
    const textColor = status.type === 'error' ? 'text-error-700' : 'text-blue-700';
    const iconColor = status.type === 'error' ? 'text-error-500' : 'text-blue-500';
    const Icon = status.type === 'error' ? AlertTriangle : Info;
    
    return (
      <div className={`${className} ${bgColor} border rounded-lg flex items-center justify-center`}>
        <div className="text-center p-4">
          <Icon className={`h-8 w-8 ${iconColor} mx-auto mb-2`} />
          <p className={textColor}>{status.message}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={`${className} rounded-lg overflow-hidden`} />;
};

export default TripMap;