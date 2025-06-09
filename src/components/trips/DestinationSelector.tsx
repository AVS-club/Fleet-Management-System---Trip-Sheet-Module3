import React, { useState, useRef, useEffect } from 'react';
import { Destination, Warehouse } from '../../types';
import { MapPin, Clock, TrendingUp, AlertTriangle, ArrowLeftRight, CheckCircle } from 'lucide-react';
import { createDestination } from '../../utils/storage';
import { Loader } from '@googlemaps/js-api-loader';
import Button from '../ui/Button';
import { checkRouteOptimization } from '../../utils/routeOptimizer';

interface GooglePrediction {
  place_id: string;
  description: string;
  isGoogle?: boolean;
}

interface DestinationSelectorProps {
  destinations: Destination[] | null;
  selectedDestinations: string[] | null;
  onChange: (destinationIds: string[]) => void;
  warehouse?: Warehouse | null;
  error?: string;
  onAddAndSelectDestination?: (destination: Destination) => void;
}

const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  destinations,
  selectedDestinations,
  onChange,
  warehouse,
  error,
  onAddAndSelectDestination
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTwoWay, setIsTwoWay] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [googlePredictions, setGooglePredictions] = useState<GooglePrediction[]>([]);
  const [routeWarning, setRouteWarning] = useState<string>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ensure destinations is an array
  const destinationsArray = Array.isArray(destinations) ? destinations : [];

  // Initialize Google Maps services
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      return;
    }
    
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      setAutocompleteService(new google.maps.places.AutocompleteService());
      // Create a dummy div for PlacesService (required)
      const placesDiv = document.createElement('div');
      setPlacesService(new google.maps.places.PlacesService(placesDiv));
    }).catch(err => {
      console.error('Error loading Google Maps:', err);
    });
  }, []);

  // Handle search input changes
  useEffect(() => {
    const handleSearch = async () => {
      if (!autocompleteService || searchTerm.length < 2) {
        setGooglePredictions([]);
        return;
      }

      try {
        const response = await autocompleteService.getPlacePredictions({
          input: searchTerm,
          types: ['(cities)'], // Fixed: Using only one type as per Google Places API requirements
          componentRestrictions: { country: 'in' },
          bounds: new google.maps.LatLngBounds(
            { lat: 17.7,  lng: 80.1 }, // Southwest corner of Chhattisgarh/Odisha
            { lat: 24.1,  lng: 87.5 }  // Northeast corner of Chhattisgarh/Odisha
          )
        });

        if (response && response.predictions) {
          // Mark these as Google predictions
          const googleResults = response.predictions.map(prediction => ({
            ...prediction,
            isGoogle: true
          }));
          setGooglePredictions(googleResults);
        }
      } catch (error) {
        console.error('Error getting place predictions:', error);
        setGooglePredictions([]);
      }
    };

    handleSearch();
  }, [searchTerm, autocompleteService]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (warehouse && Array.isArray(selectedDestinations) && selectedDestinations.length > 1) {
      const selectedDests = Array.isArray(destinations) 
        ? selectedDestinations
            .map(id => destinations.find(d => d.id === id))
            .filter((d): d is Destination => d !== undefined)
        : [];

      const { isOptimal, warning } = checkRouteOptimization(warehouse, selectedDests);
      setRouteWarning(warning);
    } else {
      setRouteWarning(undefined);
    }
  }, [selectedDestinations, warehouse, destinations]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter admin-saved destinations
  const filteredAdminDestinations = destinationsArray.filter(dest => 
    dest.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    (!dest.active || dest.active === true));

  // Filter Google predictions to avoid duplicates with admin destinations
  const filteredGooglePredictions = googlePredictions.filter(prediction => {
    const predictionName = prediction.description.split(',')[0].toLowerCase();
    return !Array.isArray(filteredAdminDestinations) || !filteredAdminDestinations.some(dest => 
      dest.name.toLowerCase() === predictionName
    );
  });

  const toggleDestination = (id: string) => {
    let newSelection: string[];
    
    if (Array.isArray(selectedDestinations) && selectedDestinations.includes(id)) {
      // Remove the destination and its return journey if it exists
      newSelection = selectedDestinations.filter(d => d !== id);
      const returnIndex = newSelection.indexOf(id);
      if (returnIndex !== -1) {
        newSelection.splice(returnIndex, 1);
      }
    } else {
      // Add the destination and its return journey if two-way is enabled
      newSelection = [...(Array.isArray(selectedDestinations) ? selectedDestinations : []), id];
      if (isTwoWay) {
        newSelection.push(id); // Add the same destination again for return journey
      }
    }
    
    onChange(newSelection);
  };

  const handleSelectGooglePlace = async (prediction: GooglePrediction) => {
    if (!placesService) return;

    try {
      // Get place details from Google
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['name', 'geometry', 'formatted_address']
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Place details request failed: ${status}`));
            }
          }
        );
      });

      if (!placeDetails.geometry?.location) {
        throw new Error('No location data in place details');
      }

      // Create a new destination from Google place
      const placeName = placeDetails.name || prediction.description.split(',')[0];
      const newDestination: Destination = {
        id: '',  // Will be assigned by the server
        name: placeName.trim(),
        latitude: placeDetails.geometry.location.lat(),
        longitude: placeDetails.geometry.location.lng(),
        standard_distance: 100, // Default value
        estimated_time: '2h', // Default value
        historical_deviation: 5, // Default value
        type: 'city', // Default value
        state: 'chhattisgarh', // Default value
      };

      // Add the destination to storage and select it
      if (onAddAndSelectDestination) {
        onAddAndSelectDestination(newDestination);
      } else {
        // Fallback to old behavior if prop not provided
        const savedDestination = createDestination(newDestination);
        toggleDestination(savedDestination.id);
      }
      
      // Clear search and close dropdown
      setSearchTerm('');
      setGooglePredictions([]);
    } catch (error) {
      console.error('Error selecting Google place:', error);
    }
  };

  const toggleTwoWay = () => {
    setIsTwoWay(!isTwoWay);
    if (!isTwoWay && Array.isArray(selectedDestinations)) {
      // Add return destinations when enabling two-way
      const withReturns = selectedDestinations.reduce((acc, id) => {
        acc.push(id);
        acc.push(id); // Add each destination twice
        return acc;
      }, [] as string[]);
      onChange(withReturns);
    } else if (Array.isArray(selectedDestinations)) {
      // Remove return destinations when disabling two-way
      const withoutReturns = selectedDestinations.filter((_, index) => index % 2 === 0);
      onChange(withoutReturns);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Destinations
          <span className="text-error-500 ml-1">*</span>
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTwoWay}
          icon={<ArrowLeftRight className="h-4 w-4" />}
        >
          {isTwoWay ? 'Two-way Trip' : 'One-way Trip'}
        </Button>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div
          className="min-h-[42px] p-2 border rounded-lg bg-white cursor-text"
          onClick={() => setIsOpen(true)}
        >
          {Array.isArray(selectedDestinations) && selectedDestinations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedDestinations.map((id, index) => {
                const dest = destinationsArray.find(d => d.id === id);
                return dest ? (
                  <span
                    key={`${dest.id}-${index}`}
                    className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-primary-100 text-primary-700"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {dest.name}
                    {isTwoWay && index % 2 === 1 && " (Return)"}
                    <button
                      type="button"
                      className="ml-1 hover:text-primary-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDestination(dest.id);
                      }}
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          ) : (
            <div className="text-gray-500">Select destinations</div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
            <input
              type="text"
              ref={searchInputRef}
              className="w-full p-2 border-b"
              placeholder="Search destinations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="max-h-60 overflow-y-auto">
              {/* Admin-saved destinations */}
              {filteredAdminDestinations.length > 0 && (
                <div className="p-2 bg-gray-50 text-xs font-medium text-gray-700">Saved Destinations</div>
              )}
              {filteredAdminDestinations.map(dest => (
                <div 
                  key={dest.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    Array.isArray(selectedDestinations) && selectedDestinations.includes(dest.id) ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => toggleDestination(dest.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium">{dest.name}</span>
                      <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />Saved
                      </span>
                    </div>
                    {Array.isArray(selectedDestinations) && selectedDestinations.includes(dest.id) && (
                      <span className="text-primary-600">✓</span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {dest.standard_distance} km
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {dest.estimated_time}
                    </div>
                    <div className="flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {dest.historical_deviation}% dev
                    </div>
                  </div>
                </div>
              ))}

              {/* Google Maps suggestions */}
              {filteredGooglePredictions.length > 0 && (
                <div className="p-2 bg-gray-50 text-xs font-medium text-gray-700">Google Maps Suggestions</div>
              )}
              {filteredGooglePredictions.map(prediction => (
                <div
                  key={prediction.place_id}
                  className="p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSelectGooglePlace(prediction)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium">
                        {prediction.description.split(',')[0]}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-500 ml-6">
                    {prediction.description.split(',').slice(1).join(',')}
                  </div>
                </div>
              ))}

              {/* No results message */}
              {filteredAdminDestinations.length === 0 && filteredGooglePredictions.length === 0 && searchTerm.length > 0 && (
                <div className="p-3 text-center text-gray-500 border-t">
                  No destinations found matching "{searchTerm}"
                </div>
              )}
              
              {filteredAdminDestinations.length === 0 && filteredGooglePredictions.length === 0 && searchTerm.length === 0 && (
                <div className="p-3 text-center text-gray-500 border-t">
                  No destinations found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-error-500 text-sm">{error}</p>
      )}

      {routeWarning && (
        <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 text-warning-500 mr-2 flex-shrink-0" />
          <p className="text-sm text-warning-700">{routeWarning}</p>
        </div>
      )}
    </div>
  );
};

export default DestinationSelector;