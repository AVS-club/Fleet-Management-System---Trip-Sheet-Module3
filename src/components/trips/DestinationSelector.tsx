import React, { useState } from 'react';
import { Destination } from '../../types';
import { MapPin, Plus, X } from 'lucide-react';

interface DestinationSelectorProps {
  destinations: Destination[];
  selectedDestinations: string[];
  onChange: (destinationIds: string[]) => void;
  error?: string;
}

const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  destinations,
  selectedDestinations,
  onChange,
  error
}) => {
  const [showDestinations, setShowDestinations] = useState(false);

  const handleDestinationToggle = (destinationId: string) => {
    const isSelected = selectedDestinations.includes(destinationId);
    
    if (isSelected) {
      // Remove destination and maintain order
      onChange(selectedDestinations.filter(id => id !== destinationId));
    } else {
      // Add destination to the end
      onChange([...selectedDestinations, destinationId]);
    }
  };

  const reorderDestinations = (fromIndex: number, toIndex: number) => {
    const newOrder = [...selectedDestinations];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    onChange(newOrder);
  };

  const getDestinationOrder = (destinationId: string): number => {
    return selectedDestinations.indexOf(destinationId) + 1;
  };

  const selectedDestinationObjects = selectedDestinations
    .map(id => destinations.find(dest => dest.id === id))
    .filter(Boolean) as Destination[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Destinations
          <span className="text-error-500 ml-1">*</span>
        </label>
        
        <button
          type="button"
          onClick={() => setShowDestinations(!showDestinations)}
          className="inline-flex items-center px-3 py-1 text-sm bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
        >
          <Plus className="h-4 w-4 mr-1" />
          {showDestinations ? 'Hide' : 'Add'} Destinations
        </button>
      </div>

      {/* Selected Destinations Display */}
      {selectedDestinationObjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Route Order:</h4>
          <div className="space-y-2">
            {selectedDestinationObjects.map((destination, index) => (
              <div
                key={destination.id}
                className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                    {index + 1}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <MapPin className="h-3 w-3 mr-1" />
                      🏙️ {destination.type}
                    </span>
                    <span className="font-medium text-blue-800">{destination.name}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-blue-600">
                    📏 {destination.standard_distance} km • ⏱️ {destination.estimated_time}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleDestinationToggle(destination.id)}
                    className="p-1 text-red-500 hover:text-red-700 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destination Selection Grid */}
      {showDestinations && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {destinations.map(destination => {
              const isSelected = selectedDestinations.includes(destination.id);
              const order = isSelected ? getDestinationOrder(destination.id) : null;
              
              return (
                <label
                  key={destination.id}
                  className={`relative flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleDestinationToggle(destination.id)}
                    className="sr-only"
                  />
                  
                  <div className="flex items-center space-x-3 w-full">
                    <div className={`p-2 rounded-full ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <MapPin className={`h-4 w-4 ${
                        isSelected ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-medium ${
                          isSelected ? 'text-blue-800' : 'text-gray-900'
                        }`}>
                          {destination.name}
                        </h4>
                        
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          🏙️ {destination.type}
                        </span>
                        
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          📍 {destination.state}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        📏 {destination.standard_distance} km • ⏱️ {destination.estimated_time}
                      </p>
                    </div>
                    
                    {isSelected && order && (
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold">
                        {order}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          
          {destinations.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No destinations available. Please add destinations first.</p>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="text-error-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default DestinationSelector;