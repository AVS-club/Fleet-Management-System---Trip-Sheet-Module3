import React, { useState, useEffect, useMemo } from 'react';
import { X, Truck, Search, Check } from 'lucide-react';
import Button from '../ui/Button';
import { Vehicle } from '../../types';
import { getVehicles } from '../../utils/storage';
import { assignTagToVehicle, getVehiclesWithTag } from '../../utils/api/tags';
import { toast } from 'react-toastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TagAddVehiclesModal');

interface TagAddVehiclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tagId: string;
  tagName: string;
  tagColor: string;
}

const TagAddVehiclesModal: React.FC<TagAddVehiclesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tagId,
  tagName,
  tagColor
}) => {
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [taggedVehicles, setTaggedVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && tagId) {
      loadData();
    } else {
      // Reset state when modal closes
      setSelectedVehicles(new Set());
      setSearchQuery('');
    }
  }, [isOpen, tagId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehicles, tagged] = await Promise.all([
        getVehicles(),
        getVehiclesWithTag(tagId)
      ]);
      setAllVehicles(vehicles);
      setTaggedVehicles(tagged);
    } catch (error) {
      logger.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Filter out vehicles that already have this tag
  const availableVehicles = useMemo(() => {
    const taggedIds = new Set(taggedVehicles.map(v => v.id));
    return allVehicles.filter(v => !taggedIds.has(v.id));
  }, [allVehicles, taggedVehicles]);

  // Filter vehicles by search query
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return availableVehicles;
    
    const query = searchQuery.toLowerCase();
    return availableVehicles.filter(vehicle =>
      vehicle.registration_number?.toLowerCase().includes(query) ||
      vehicle.make?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query)
    );
  }, [availableVehicles, searchQuery]);

  const toggleVehicle = (vehicleId: string) => {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    setSelectedVehicles(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedVehicles.size === filteredVehicles.length) {
      setSelectedVehicles(new Set());
    } else {
      setSelectedVehicles(new Set(filteredVehicles.map(v => v.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedVehicles.size === 0) {
      toast.info('Please select at least one vehicle');
      return;
    }

    setSubmitting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const vehicleId of selectedVehicles) {
        try {
          await assignTagToVehicle(vehicleId, tagId);
          successCount++;
        } catch (error: any) {
          logger.error(`Error assigning tag to vehicle ${vehicleId}:`, error);
          if (error.message?.includes('already assigned')) {
            // Skip silently if already assigned
            successCount++;
          } else {
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added tag to ${successCount} vehicle(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to add tag to ${errorCount} vehicle(s)`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error submitting:', error);
      toast.error('Failed to add vehicles to tag');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tagColor }}
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Add Vehicles to {tagName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Select vehicles to add to this tag ({availableVehicles.length} available)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vehicles by registration, make, or model..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Select All */}
            {filteredVehicles.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {selectedVehicles.size === filteredVehicles.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedVehicles.size > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({selectedVehicles.size} selected)
                  </span>
                )}
              </div>
            )}

            {/* Vehicle List */}
            <div className="mt-4">
              {loading ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500">Loading vehicles...</p>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    {searchQuery ? 'No vehicles found matching your search' : 'All vehicles already have this tag'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {filteredVehicles.map((vehicle) => {
                    const isSelected = selectedVehicles.has(vehicle.id);
                    return (
                      <div
                        key={vehicle.id}
                        onClick={() => toggleVehicle(vehicle.id)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-50 border-2 border-primary-200'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-primary-600 border-primary-600'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <Truck className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {vehicle.registration_number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {vehicle.make} {vehicle.model}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleSubmit}
              isLoading={submitting}
              disabled={submitting || selectedVehicles.size === 0}
              className="w-full sm:w-auto sm:ml-3"
            >
              Add {selectedVehicles.size > 0 ? `${selectedVehicles.size} ` : ''}Vehicle{selectedVehicles.size !== 1 ? 's' : ''}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagAddVehiclesModal;

