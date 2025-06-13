import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Building2, MapPin, Search } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Loader } from '@googlemaps/js-api-loader';
import { useState, useEffect, useRef } from 'react';
import { getMaterialTypes, MaterialType } from '../../utils/materialTypes'; // Import MaterialType

interface WarehouseFormData {
  name: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  materialType?: string;
}

interface WarehouseFormProps {
  initialData?: Partial<WarehouseFormData>;
  onSubmit: (data: WarehouseFormData) => void;
  onCancel: () => void;
}

const WarehouseForm: React.FC<WarehouseFormProps> = ({
  initialData,
  onSubmit,
  onCancel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(!!initialData?.name);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]); // Initialize as empty array
  const placesRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<WarehouseFormData>({
    defaultValues: {
      ...initialData
    }
  });

  // Initialize Google Maps services
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      setAutocompleteService(new google.maps.places.AutocompleteService());
      
      // Create a dummy div for PlacesService (required)
      if (placesRef.current) {
        setPlacesService(new google.maps.places.PlacesService(placesRef.current));
      }
    }).catch(err => {
      console.error('Error loading Google Maps:', err);
    });

    // Fetch material types
    const fetchMaterials = async () => {
      try {
        const types = await getMaterialTypes();
        setMaterialTypes(Array.isArray(types) ? types : []);
      } catch (error) {
        console.error("Error fetching material types:", error);
        setMaterialTypes([]);
      }
    };
    fetchMaterials();
  }, []);

  // Handle search input changes
  useEffect(() => {
    const handleSearch = async () => {
      if (!autocompleteService || searchTerm.length < 2) {
        setPredictions([]);
        return;
      }

      try {
        const response = await autocompleteService.getPlacePredictions({
          input: searchTerm,
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

    handleSearch();
  }, [searchTerm, autocompleteService]);

  const handleSelectPlace = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService) return;

    try {
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          {
            placeId: prediction.place_id,
            fields: ['name', 'geometry', 'address_components', 'formatted_address']
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

      // Extract pincode if available
      let pincode = '';
      if (placeDetails.address_components) {
        const pincodeComponent = placeDetails.address_components.find(
          component => component.types.includes('postal_code')
        );
        if (pincodeComponent) {
          pincode = pincodeComponent.long_name;
        }
      }

      // Set form values
      setValue('name', placeDetails.name || prediction.description.split(',')[0]);
      setValue('latitude', placeDetails.geometry.location.lat());
      setValue('longitude', placeDetails.geometry.location.lng());
      if (pincode) {
        setValue('pincode', pincode);
      }

      // Clear search term and predictions
      setSearchTerm('');
      setPredictions([]);
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };

  const toggleManualEntry = () => {
    setIsManualEntry(!isManualEntry);
    if (!isManualEntry) {
      // Clear Google-populated fields when switching to manual entry
      setValue('latitude', undefined);
      setValue('longitude', undefined);
    }
  };

  const name = watch('name');
  const latitude = watch('latitude');
  const longitude = watch('longitude');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-gray-50 rounded-lg p-6">
      <div ref={placesRef} className="hidden"></div>
      
      {/* Always register pincode, but hide it if not in manual mode and Google search is active */}
      <input type="hidden" {...register('pincode')} />

      {!isManualEntry ? (
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Search Location"
              icon={<Search className="h-4 w-4" />}
              placeholder="Type to search for a location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {predictions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {predictions.map((prediction) => (
                  <div
                    key={prediction.place_id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectPlace(prediction)}
                  >
                    {prediction.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {name && (
            <div className="p-4 bg-primary-50 border border-primary-100 rounded-lg">
              <h4 className="font-medium text-primary-800 mb-2">Selected Location</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-primary-600 mr-2" />
                  <span className="text-primary-800 font-medium">{name}</span>
                </div>
                {latitude !== undefined && longitude !== undefined && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-primary-600 mr-2" />
                    <span className="text-primary-700">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleManualEntry}
            >
              Enter Details Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Warehouse Name"
            icon={<Building2 className="h-4 w-4" />}
            error={errors.name?.message}
            {...register('name', { required: 'Warehouse name is required' })}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Pincode"
              error={errors.pincode?.message}
              {...register('pincode', {
                required: 'Pincode is required',
                pattern: {
                  value: /^\d{6}$/,
                  message: 'Enter a valid 6-digit pincode'
                }
              })}
            />
            
            <Controller
              control={control}
              name="materialType"
              render={({ field }) => (
                <Select
                  label="Material Type"
                  options={[
                    { value: '', label: 'Select Material Type' },
                    ...materialTypes.map(type => ({
                      value: type.id,
                      label: type.name.charAt(0).toUpperCase() + type.name.slice(1)
                    }))
                  ]}
                  {...field}
                />
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              icon={<MapPin className="h-4 w-4" />}
              error={errors.latitude?.message}
              {...register('latitude', {
                valueAsNumber: true,
                min: { value: -90, message: 'Invalid latitude' },
                max: { value: 90, message: 'Invalid latitude' }
              })}
            />
            
            <Input
              label="Longitude"
              type="number"
              step="any"
              icon={<MapPin className="h-4 w-4" />}
              error={errors.longitude?.message}
              {...register('longitude', {
                valueAsNumber: true,
                min: { value: -180, message: 'Invalid longitude' },
                max: { value: 180, message: 'Invalid longitude' }
              })}
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleManualEntry}
            >
              Use Google Maps Search
            </Button>
          </div>
        </div>
      )}
      
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Warehouse' : 'Add Warehouse'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default WarehouseForm;
