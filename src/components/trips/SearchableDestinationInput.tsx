import React, { useState, useRef, useEffect, useId } from 'react';
import { MapPin, Plus, Search, Building, MapIcon as Town, Globe, X } from 'lucide-react';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import { getDestinations } from '../../utils/storage';
import { searchOrCreateDestination } from '../../lib/destinationUtils';
import { getMostUsedDestinations } from '../../utils/destinationAnalytics';
import { Destination } from '@/types';
import Input from '../ui/Input';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SearchableDestinationInput');

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
  usage_count: number;
  last_used?: string | null;
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
  const [activePredictionIndex, setActivePredictionIndex] = useState<number>(-1);
  const placesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const predictionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listboxId = useId();

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
        logger.error('Error loading Google Maps:', err);
      });
  }, []);

  // Fetch most used destinations with real analytics
  useEffect(() => {
    const fetchMostUsed = async () => {
      try {
        const frequentDestinations = await getMostUsedDestinations(5);
        setMostUsedDestinations(frequentDestinations);
      } catch (error) {
        logger.error('Error fetching most used destinations:', error);
        // Fallback to basic destinations if analytics fail
        try {
          const allDestinations = await getDestinations();
          const frequent = allDestinations
            .slice(0, 5)
            .map((dest) => ({
              id: dest.id,
              name: dest.name,
              type: dest.type,
              usage_count: 0,
              last_used: null
            }));
          setMostUsedDestinations(frequent);
        } catch (fallbackError) {
          logger.error('Error fetching fallback destinations:', fallbackError);
        }
      }
    };

    fetchMostUsed();
  }, []);

  useEffect(() => {
    setActivePredictionIndex((prevIndex) => {
      if (predictions.length === 0) {
        return -1;
      }

      if (prevIndex === -1 || prevIndex >= predictions.length) {
        return 0;
      }

      return prevIndex;
    });
  }, [predictions]);

  useEffect(() => {
    if (activePredictionIndex >= 0) {
      predictionRefs.current[activePredictionIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activePredictionIndex]);

  // Handle search
  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    const trimmedValue = value.trim();

    if (!autocompleteService || trimmedValue.length < 2) {
      setPredictions([]);
      setActivePredictionIndex(-1);
      return;
    }

    try {
      const response = await autocompleteService.getPlacePredictions({
        input: trimmedValue,
        types: ['(cities)'],
        componentRestrictions: { country: 'in' }
      });

      if (response && response.predictions) {
        setPredictions(response.predictions);
        setActivePredictionIndex(response.predictions.length > 0 ? 0 : -1);
      }
    } catch (error) {
      logger.error('Error getting place predictions:', error);
      setPredictions([]);
      setActivePredictionIndex(-1);
    }
  };

  // Handle place selection with improved error handling and fallback
  const handlePlaceSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService) return;

    setSearchTerm('');
// …above this, remove the initial setSearchTerm/Predictions/etc. and the pre-try blur…

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

      // Destination type will be determined by the utility function

      // Destination data will be created by the utility function

      // Use the new utility function to search or create destination
      const newDestination = await searchOrCreateDestination({
        place_id: prediction.place_id,
        name: placeDetails.name || prediction.description.split(',')[0],
        formatted_address: placeDetails.formatted_address,
        latitude: placeDetails.geometry.location.lat(),
        longitude: placeDetails.geometry.location.lng(),
      });

      onDestinationSelect(newDestination);

      // Clear state and blur after successful selection
      setSearchTerm('');
      setPredictions([]);
      setActivePredictionIndex(-1);
      setShowAddAnother(false);
      setTimeout(() => inputRef.current?.blur(), 0);
    } catch (error) {
      logger.error('Error selecting place:', error);
      
      // Better error handling for destination operations
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to process destination';
      
      // Show user-friendly error message
      const { toast } = await import('react-toastify');
      toast.error(`Destination error: ${errorMessage}`);
      
      // Fallback: Create a basic destination without Google API data
      try {

        const fallbackDestination = await searchOrCreateDestination({
          place_id: prediction.place_id,
          name: prediction.description.split(',')[0],
          formatted_address: prediction.description,
          latitude: undefined,
          longitude: undefined,
        });

        onDestinationSelect(fallbackDestination);
        
        // Show a warning toast about the fallback
        const { toast } = await import('react-toastify');
        toast.warning(`Destination "${prediction.description.split(',')[0]}" added but is inactive due to missing coordinates. Please update coordinates manually to enable route calculations.`);
      } catch (fallbackError) {
        logger.error('Fallback destination creation failed:', fallbackError);
        const { toast } = await import('react-toastify');
        toast.error('Failed to create destination. Please try again or contact support.');
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && predictions.length > 0) {
      event.preventDefault();
      setActivePredictionIndex((prev) => {
        const nextIndex = prev + 1 >= predictions.length ? 0 : prev + 1;
        return nextIndex;
      });
      return;
    }

    if (event.key === 'ArrowUp' && predictions.length > 0) {
      event.preventDefault();
      setActivePredictionIndex((prev) => {
        if (prev <= 0) {
          return predictions.length - 1;
        }

        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter' && predictions.length > 0) {
      event.preventDefault();
      const indexToUse = activePredictionIndex >= 0 ? activePredictionIndex : 0;
      handlePlaceSelect(predictions[indexToUse]);
      return;
    }

    if (event.key === 'Escape' && predictions.length > 0) {
      event.preventDefault();
      setPredictions([]);
      setActivePredictionIndex(-1);
      return;
    }

    if (event.key === 'Backspace' && searchTerm === '' && selectedDestinations.length > 0) {
      event.preventDefault();
      onRemoveDestination(selectedDestinations.length - 1);
    }
  };

  // Handle frequent destination selection
  const handleFrequentDestinationSelect = async (destination: FrequentDestination) => {
    try {
      // Fetch full destination data from database
      const allDestinations = await getDestinations();
      const fullDestination = allDestinations.find(d => d.id === destination.id);
      
      if (fullDestination) {
        onDestinationSelect(fullDestination);
        setShowAddAnother(false);
        setSearchTerm('');
        setPredictions([]);
        setActivePredictionIndex(-1);
        inputRef.current?.blur();
      } else {
        // Fallback if destination not found
        const destData: Destination = {
          id: destination.id,
          name: destination.name,
          latitude: null, // Invalid coordinates - will need manual entry
          longitude: null, // Invalid coordinates - will need manual entry
          standard_distance: 0,
          estimated_time: '0h 0m',
          historical_deviation: 0,
          type: (['city', 'district', 'town', 'village'].includes(destination.type)
            ? destination.type
            : 'city') as 'city' | 'district' | 'town' | 'village',
          state: 'chhattisgarh',
          active: false // Mark as inactive until valid coordinates are provided
        };
        
        onDestinationSelect(destData);
        setShowAddAnother(false);
        setSearchTerm('');
        setPredictions([]);
        setActivePredictionIndex(-1);
        inputRef.current?.blur();
      }
    } catch (error) {
      logger.error('Error selecting frequent destination:', error);
    }
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
            {selectedDestinations.map((destination, index) => {
              const hasInvalidCoords = destination.latitude === null || destination.longitude === null || 
                                     destination.latitude === 0 || destination.longitude === 0;
              const isInactive = !destination.active || hasInvalidCoords;
              
              return (
                <div
                  key={`${destination.id}-${index}`}
                  className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium ${
                    isInactive 
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  <div className={`flex items-center justify-center w-5 h-5 text-white rounded-full text-xs font-bold mr-2 ${
                    isInactive ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="font-medium">{destination.name}</span>
                  
                  {isInactive && (
                    <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                      Invalid Coords
                    </span>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => onRemoveDestination(index)}
                    className={`ml-2 transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 ${
                      isInactive 
                        ? 'text-yellow-600 hover:text-red-600' 
                        : 'text-blue-600 hover:text-red-600'
                    }`}
                    aria-label={`Remove destination ${destination.name}`}
                    title={`Remove ${destination.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
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
                onKeyDown={handleKeyDown}
                aria-autocomplete="list"
                aria-controls={predictions.length > 0 ? listboxId : undefined}
                aria-activedescendant={activePredictionIndex >= 0 ? `${listboxId}-option-${activePredictionIndex}` : undefined}
                autoComplete="off"
              />
              
              {/* Autocomplete Predictions */}
              {predictions.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
                  role="listbox"
                  id={listboxId}
                >
                  {predictions.map((prediction, index) => {
                    const isActive = index === activePredictionIndex;

                    return (
                      <div
                        key={prediction.place_id}
                        id={`${listboxId}-option-${index}`}
                        ref={(element) => {
                          predictionRefs.current[index] = element;
                        }}
                        className={`px-4 py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${isActive ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActivePredictionIndex(index)}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handlePlaceSelect(prediction);
                        }}
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
                    );
                  })}
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
                      {destination.usage_count > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {destination.usage_count}×
                        </span>
                      )}
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