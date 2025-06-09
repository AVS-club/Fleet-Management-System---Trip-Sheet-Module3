import { Warehouse, Destination } from '../types';
import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface OptimizationResult {
  isOptimal: boolean;
  suggestedOrder: Destination[];
  warning?: string;
  totalDistance?: number;
  totalDuration?: string;
}

export const checkRouteOptimization = (
  warehouse: Warehouse,
  destinations: Destination[]
): { isOptimal: boolean; warning?: string } => {
  if (destinations.length <= 1) {
    return { isOptimal: true };
  }

  // Simple distance-based check
  let totalDistance = 0;
  let alternativeDistance = 0;

  // Calculate current route distance
  let currentPoint = {
    latitude: warehouse.latitude,
    longitude: warehouse.longitude
  };

  destinations.forEach(dest => {
    totalDistance += calculateDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      dest.latitude,
      dest.longitude
    );
    currentPoint = dest;
  });

  // Calculate alternative route (reverse order)
  currentPoint = {
    latitude: warehouse.latitude,
    longitude: warehouse.longitude
  };

  [...destinations].reverse().forEach(dest => {
    alternativeDistance += calculateDistance(
      currentPoint.latitude,
      currentPoint.longitude,
      dest.latitude,
      dest.longitude
    );
    currentPoint = dest;
  });

  const isOptimal = totalDistance <= alternativeDistance;
  return {
    isOptimal,
    warning: isOptimal ? undefined : 'Route order could be optimized for shorter distance'
  };
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const optimizeRoute = async (
  warehouse: Warehouse,
  destinations: Destination[]
): Promise<OptimizationResult> => {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is missing');
  }

  if (destinations.length <= 1) {
    return {
      isOptimal: true,
      suggestedOrder: destinations
    };
  }

  try {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    await loader.load();

    const service = new google.maps.DirectionsService();

    // Create waypoints
    const waypoints = destinations.slice(1, -1).map(dest => ({
      location: new google.maps.LatLng(dest.latitude, dest.longitude),
      stopover: true
    }));

    const request = {
      origin: new google.maps.LatLng(warehouse.latitude, warehouse.longitude),
      destination: new google.maps.LatLng(
        destinations[destinations.length - 1].latitude,
        destinations[destinations.length - 1].longitude
      ),
      waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
    };

    const result = await service.route(request);

    if (!result.routes[0]) {
      throw new Error('No route found');
    }

    // Get optimized order
    const optimizedOrder = result.routes[0].waypoint_order;
    const suggestedOrder = [
      destinations[0],
      ...optimizedOrder.map(index => destinations[index + 1]),
      destinations[destinations.length - 1]
    ];

    // Calculate total distance and duration
    const totalDistance = result.routes[0].legs.reduce(
      (sum, leg) => sum + (leg.distance?.value || 0),
      0
    ) / 1000; // Convert to kilometers

    const totalDurationMinutes = result.routes[0].legs.reduce(
      (sum, leg) => sum + (leg.duration?.value || 0),
      0
    ) / 60; // Convert to minutes

    const hours = Math.floor(totalDurationMinutes / 60);
    const minutes = Math.round(totalDurationMinutes % 60);
    const totalDuration = `${hours}h ${minutes}m`;

    // Check if current order matches optimized order
    const isOptimal = destinations.every(
      (dest, index) => dest.id === suggestedOrder[index].id
    );

    let warning: string | undefined;
    if (!isOptimal) {
      const currentOrder = destinations.map(d => d.name).join(' → ');
      const suggestedOrderNames = suggestedOrder.map(d => d.name).join(' → ');
      warning = `Current route (${currentOrder}) is not optimal. Suggested route: ${suggestedOrderNames}`;
    }

    return {
      isOptimal,
      suggestedOrder,
      warning,
      totalDistance,
      totalDuration
    };
  } catch (error) {
    console.error('Route optimization error:', error);
    throw error;
  }
};

export default {
  optimizeRoute,
  checkRouteOptimization
};