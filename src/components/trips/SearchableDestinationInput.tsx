import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Plus, Search, Building, MapIcon as Town, Globe, X } from 'lucide-react';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import { getDestinations } from '../../utils/storage'; /* Added dark mode classes */
import { Destination } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface SearchableDestinationInputProps {
  onDestinationSelect: (destination: Destination) => void;
  selectedDestinations: Destination[];
  onRemoveDestination: (index: number) => void;
  error?: string;
}

interface FrequentDestination {
  id: string;
  name: string;
  type: string;
  usageCount: number;
}

const SearchableDestinationInput: React.FC<SearchableDestinationInputProps> = ({
  onDestinationSelect,
  selectedDestinations,
  onRemoveDestination,
  error
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [mostUsedDestinations, setMostUsedDestinations] = useState<FrequentDestination[]>([]);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const placesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Maps services
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        setAutocompleteService(new google.maps.places.AutocompleteService());
        
        if (placesRef.current) {
          setPlacesService(new google.maps.places.PlacesService(placesRef.current));
        }
      })
      .catch(err => {
        console.error('Error loading Google Maps:', err);
      });
  }, []);

  // Fetch most used destinations
  useEffect(() => {
    const fetchMostUsed = async () => {
      try {
        const allDestinations = await getDestinations();
        // Mock usage count for now - in real app, this would come from trip frequency
        const frequent = allDestinations
          .slice(0, 5)
          .map((dest, index) => ({
            id: dest.id,
            name: dest.name,
            type: dest.type,
            usageCount: 10 - index // Mock usage count
          }));
        setMostUsedDestinations(frequent);
      } catch (error) {
        console.error('Error fetching destinations:', error);
      }
    };

    fetchMostUsed();
  }, []);

  // Handle search
  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    
    if (!autocompleteService || value.length < 2) {
      setPredictions([]);
      return;
    }

    try {
      const response = await autocompleteService.getPlacePredictions({
        input: value,
        types: ['(cities)'],
        componentRestrictions: { country: 'in' }
      });

      if (response && response.predictions) {
        setPredictions(response.predictions);
      }
    } catch (error) {
      console.error('Error getting place predictions:', error);
      setPredictions([]);
    }
  };

  // Handle place selection
  const handlePlaceSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService) return;

    try {
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['name', 'geometry', 'address_components', 'formatted_address', 'types']
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

      // Determine destination type based on Google Places types
      let destinationType: 'city' | 'district' | 'town' | 'village' = 'city';
      if (placeDetails.types) {
        if (placeDetails.types.includes('administrative_area_level_2')) {
          destinationType = 'district';
        } else if (placeDetails.types.includes('locality')) {
          destinationType = 'city';
        } else if (placeDetails.types.includes('sublocality')) {
          destinationType = 'town';
        } else if (placeDetails.types.includes('neighborhood')) {
          destinationType = 'village';
        }
      }

      // Create destination object
      const newDestination: Destination = {
        id: prediction.place_id,
        name: placeDetails.name || prediction.description.split(',')[0],
        latitude: placeDetails.geometry.location.lat(),
        longitude: placeDetails.geometry.location.lng(),
        standard_distance: 0, // Will be calculated
        estimated_time: '0h 0m',
        historical_deviation: 0,
        type: destinationType,
        state: 'chhattisgarh', // Default state
        place_id: prediction.place_id,
        formatted_address: placeDetails.formatted_address,
        active: true
      };

      onDestinationSelect(newDestination);
      setSearchTerm('');
      setPredictions([]);
      setShowAddAnother(false);
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };

  // Handle frequent destination selection
  const handleFrequentDestinationSelect = async (destination: FrequentDestination) => {
    // For frequent destinations, we already have the data
    const destData: Destination = {
      id: destination.id,
      name: destination.name,
      latitude: 0, // These would be fetched from the database
      longitude: 0,
      standard_distance: 0,
      estimated_time: '0h 0m',
      historical_deviation: 0,
      type: destination.type as any,
      state: 'chhattisgarh',
      active: true
    };

    onDestinationSelect(destData);
    setShowAddAnother(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'city':
        return <Building className="h-3 w-3" />;
      case 'town':
        return <Town className="h-3 w-3" />;
      case 'district':
        return <Globe className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'city':
        return 'bg-blue-100 text-blue-700';
      case 'town':
        return 'bg-green-100 text-green-700';
      case 'district':
        return 'bg-purple-100 text-purple-700';
      case 'village':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-3">
      <div ref={placesRef} className="hidden"></div>
      
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Destinations
          <span className="text-error-500 ml-1">*</span>
        </label>
        
        {selectedDestinations.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddAnother(!showAddAnother)}
            className="inline-flex items-center px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Another
          </button>
        )}
      </div>

      {/* Selected Destinations Display */}
      {selectedDestinations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Route Order:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDestinations.map((destination, index) => (
              <div
                key={`${destination.id}-${index}`}
                className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-sm font-medium"
              >
                <div className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-bold mr-2">
                  {index + 1}
                </div>
                
                <MapPin className="h-4 w-4 mr-1" />
                <span className="font-medium">{destination.name}</span>
                
                <button
                  type="button"
                  onClick={() => onRemoveDestination(index)}
                  className="ml-2 text-blue-600 hover:text-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destination Input */}
      {(selectedDestinations.length === 0 || showAddAnother) && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="space-y-3 text-gray-900 dark:text-gray-100">
            {/* Search Input */}
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder="Search for a city, town, or place..."
                icon={<Search className="h-4 w-4" />}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              
              {/* Autocomplete Predictions */}
              {predictions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {predictions.map((prediction) => (
                    <div
                      key={prediction.place_id}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      onClick={() => handlePlaceSelect(prediction)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">{prediction.structured_formatting?.main_text || prediction.description}</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Place
                        </span>
                      </div>
                      {prediction.structured_formatting?.secondary_text && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                          {prediction.structured_formatting.secondary_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Used Destinations */}
            {!searchTerm && mostUsedDestinations.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Frequently Used:</h5>
                <div className="flex flex-wrap gap-2">
                  {mostUsedDestinations.map(destination => (
                    <button
                      key={destination.id}
                      type="button"
                      onClick={() => handleFrequentDestinationSelect(destination)}
                      className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {getTypeIcon(destination.type)}
                      <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">{destination.name}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${getTypeColor(destination.type)}`}>
                        {destination.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-error-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default SearchableDestinationInput;