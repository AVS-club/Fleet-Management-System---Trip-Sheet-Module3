import React, { useState, useRef, useEffect } from 'react';
import { Destination, Warehouse } from '../../types';
import { MapPin, Clock, TrendingUp, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { createDestination, getDestination } from '../../utils/storage';
import { Loader } from '@googlemaps/js-api-loader';
import { checkRouteOptimization } from '../../utils/routeOptimizer';
import PortalDropdown from '../ui/PortalDropdown';

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
  const anchorRef = useRef<HTMLDivElement>(null);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [googlePredictions, setGooglePredictions] = useState<GooglePrediction[]>([]);
  const [routeWarning, setRouteWarning] = useState<string>();
  const [selectedDestinationDetails, setSelectedDestinationDetails] = useState<Destination[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ensure destinations is an array
  const destinationsArray = Array.isArray(destinations) ? destinations : [];
  
  // Get the last selected destination for "+1" feature
  const lastSelectedDestination = selectedDestinationDetails.length > 0
    ? selectedDestinationDetails[selectedDestinationDetails.length - 1]
    : null;

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
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: 'in' },
          bounds: new google.maps.LatLngBounds(
            { lat: 17.7, lng: 80.1 }, // Southwest corner
            { lat: 24.1, lng: 87.5 }  // Northeast corner
          )
        });

        if (response && response.predictions) {
          // Limit to 5-6 suggestions as requested
          const limitedPredictions = response.predictions.slice(0, 6).map(prediction => ({
            ...prediction,
            isGoogle: true
          }));
          setGooglePredictions(limitedPredictions);
        }
      } catch (error) {
        console.error('Error getting place predictions:', error);
        setGooglePredictions([]);
      }
    };

    handleSearch();
  }, [searchTerm, autocompleteService]);

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

  // Load destination details when selectedDestinations changes
  useEffect(() => {
    const loadDestinationDetails = async () => {
      if (!Array.isArray(selectedDestinations) || selectedDestinations.length === 0) {
        setSelectedDestinationDetails([]);
        return;
      }

      const details = await Promise.all(
        selectedDestinations.map(async (id) => {
          // First try to find in the destinations array
          const existingDest = destinationsArray.find(d => d.id === id);
          if (existingDest) return existingDest;
          
          // If not found, fetch from storage
          try {
            const dest = await getDestination(id);
            return dest;
          } catch (error) {
            console.error(`Error fetching destination ${id}:`, error);
            return null;
          }
        })
      );

      setSelectedDestinationDetails(details.filter((d): d is Destination => d !== null));
    };

    loadDestinationDetails();
  }, [selectedDestinations, destinationsArray]);

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
      // Remove the destination
      newSelection = selectedDestinations.filter(d => d !== id);
    } else {
      // Add the destination
      newSelection = [...(Array.isArray(selectedDestinations) ? selectedDestinations : []), id];
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
            fields: ['geometry.location', 'formatted_address', 'name', 'place_id']
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
        place_id: placeDetails.place_id, // Store the Google Place ID
        formatted_address: placeDetails.formatted_address // Store the full formatted address
      };

      // Add the destination to storage and select it
      if (onAddAndSelectDestination) {
        onAddAndSelectDestination(newDestination);
      } else {
        // Fallback to old behavior if prop not provided
        const savedDestination = await createDestination(newDestination);
        if (savedDestination) {
          toggleDestination(savedDestination.id);
        }
      }
      
      // Clear search and close dropdown
      setSearchTerm('');
      setGooglePredictions([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error selecting Google place:', error);
    }
  };

  // Add the same destination again ("+1" feature)
  const handleAddSameAgain = () => {
    if (!lastSelectedDestination) return;
    
    const newSelection = [
      ...(Array.isArray(selectedDestinations) ? selectedDestinations : []), 
      lastSelectedDestination.id
    ];
    onChange(newSelection);
  };

  // Remove a destination at a specific index
  const removeDestinationAtIndex = (index: number) => {
    if (!Array.isArray(selectedDestinations)) return;
    
    const newSelection = [...selectedDestinations];
    newSelection.splice(index, 1);
    onChange(newSelection);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Destinations
          <span className="text-error-500 ml-1">*</span>
        </label>
      </div>
      <p className="text-xs text-gray-500 -mt-1">Select in the order of actual delivery route</p>

      <div ref={anchorRef} className="relative">
        {/* Selected destinations display */}
        <div className="min-h-[42px] p-2 border rounded-lg bg-white cursor-text">
          {Array.isArray(selectedDestinations) && selectedDestinations.length > 0 ? (
            <div className="flex flex-wrap gap-2 items-center">
              {selectedDestinationDetails.map((dest, index) => (
                <span
                  key={`${dest.id}-${index}`}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-primary-100 text-primary-700 border border-primary-200"
                >
                  <div className="flex items-center justify-center bg-primary-200 text-primary-800 rounded-full w-5 h-5 mr-1.5 text-xs font-medium">
                    {index + 1}
                  </div>
                  {dest.name}
                  <button
                    type="button"
                    className="ml-1.5 text-primary-400 hover:text-primary-700 rounded-full hover:bg-primary-200 p-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeDestinationAtIndex(index);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              ))}
              
              {/* +1 button for the last destination */}
              {lastSelectedDestination && (
                <button
                  type="button"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddSameAgain();
                  }}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-100"
                  title="Add same destination again"
                >
                  <Plus className="h-3.5 w-3.5 mr-0.5" />
                  <span className="text-xs">Same again</span>
                </button>
              )}
            </div>
          ) : (
            <div 
              className="text-gray-500 flex items-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus({ preventScroll: true } as any);
                });
              }}
            >
              Select destinations
              <button 
                className="ml-1.5 text-primary-400 hover:text-primary-700 rounded-full hover:bg-primary-50 p-1"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsOpen(true);
                  requestAnimationFrame(() => {
                    searchInputRef.current?.focus({ preventScroll: true } as any);
                  });
                }}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Add destination button (when there are already 2+ destinations) */}
          {Array.isArray(selectedDestinations) && selectedDestinations.length >= 2 && !isOpen && (
            <button
              type="button"
              type="button"
              className="mt-2 flex items-center text-xs text-primary-600 hover:text-primary-800 px-2 py-1 rounded hover:bg-primary-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(true);
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus({ preventScroll: true } as any);
                });
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add another destination
            </button>
          )}
        </div>

      </div>

      {/* Portalized Destination search dropdown */}
      <PortalDropdown
        anchorRef={anchorRef}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxHeight={Math.round(window.innerHeight * 0.7)}
        matchWidth
        className="border-0 shadow-xl"
      >
        <div className="p-2 border-b sticky top-0 bg-white z-10" onMouseDown={(e) => e.preventDefault()}>
          <input
            type="text"
            ref={searchInputRef}
            className="w-full p-2 pl-8 border rounded-md"
            placeholder="Search destinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <MapPin className="absolute left-4 top-5 h-4 w-4 text-gray-400" />
        </div>

        <div className="overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
          {/* Admin-saved destinations */}
          {filteredAdminDestinations.length > 0 && (
            <div className="p-2 bg-gray-50 text-xs font-medium text-gray-700 sticky top-0 z-1 border-b border-gray-100">Saved Destinations</div>
          )}
          {filteredAdminDestinations.map(dest => (
            <div 
              key={dest.id}
              className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                Array.isArray(selectedDestinations) && selectedDestinations.includes(dest.id) ? 'bg-primary-50' : ''
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDestination(dest.id);
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{dest.name}</div>
                    <div className="flex items-center mt-1 space-x-3">
                      <span className="flex items-center text-xs text-gray-500">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>{dest.standard_distance} km</span>
                      </span>
                      <span className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{dest.estimated_time}</span>
                      </span>
                    </div>
                  </div>
                </div>
                {Array.isArray(selectedDestinations) && selectedDestinations.includes(dest.id) && (
                  <CheckCircle className="h-4 w-4 text-primary-600 ml-2" />
                )}
              </div>
            </div>
          ))}

          {/* Google Maps suggestions */}
          {filteredGooglePredictions.length > 0 && (
            <div className="p-2 bg-gray-50 text-xs font-medium text-gray-700 sticky top-0 z-1 border-b border-gray-100">Google Maps Suggestions</div>
          )}
          {filteredGooglePredictions.map(prediction => (
            <div
              key={prediction.place_id}
              className="p-3 cursor-pointer hover:bg-gray-50 border-t border-gray-100 first:border-t-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectGooglePlace(prediction);
              }}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <span className="font-medium text-gray-900">
                    {prediction.description.split(',')[0]}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {prediction.description.split(',').slice(1).join(',')}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* No results message */}
          {filteredAdminDestinations.length === 0 && filteredGooglePredictions.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              {searchTerm.length > 0 
                ? `No destinations found matching "${searchTerm}"`
                : 'Type to search for destinations'}
            </div>
          )}
        </div>
      </PortalDropdown>

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
