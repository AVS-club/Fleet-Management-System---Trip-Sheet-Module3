import React, { useState, useEffect, useMemo } from 'react';
import { X, Truck, User, Edit2, Save, XCircle, Plus, Search, Check } from 'lucide-react';
import Button from '../ui/Button';
import { Vehicle } from '../../types';
import { getVehiclesWithTag, assignTagToVehicle, removeTagFromVehicle } from '../../utils/api/tags';
import { getVehicles } from '../../utils/api/vehicles';
import LoadingScreen from '../LoadingScreen';
import { createLogger } from '../../utils/logger';
import { toast } from 'react-toastify';

const logger = createLogger('TagVehicleListModal');

interface TagVehicleListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagId: string;
  tagName: string;
  tagColor: string;
  onSuccess?: () => void;
}

const TagVehicleListModal: React.FC<TagVehicleListModalProps> = ({
  isOpen,
  onClose,
  tagId,
  tagName,
  tagColor,
  onSuccess
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && tagId) {
      loadVehicles();
      if (isEditMode) {
        loadAllVehicles();
      }
    } else {
      // Reset state when modal closes
      setIsEditMode(false);
      setSelectedToRemove(new Set());
      setSelectedToAdd(new Set());
      setSearchQuery('');
    }
  }, [isOpen, tagId, isEditMode]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await getVehiclesWithTag(tagId);
      setVehicles(data);
    } catch (error) {
      logger.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const loadAllVehicles = async () => {
    try {
      const data = await getVehicles();
      setAllVehicles(data);
    } catch (error) {
      logger.error('Error loading all vehicles:', error);
      toast.error('Failed to load all vehicles');
    }
  };

  // Filter out vehicles that already have this tag
  const availableVehicles = useMemo(() => {
    const taggedIds = new Set(vehicles.map(v => v.id));
    return allVehicles.filter(v => !taggedIds.has(v.id));
  }, [allVehicles, vehicles]);

  // Filter available vehicles by search query
  const filteredAvailableVehicles = useMemo(() => {
    if (!searchQuery.trim()) return availableVehicles;
    
    const query = searchQuery.toLowerCase();
    return availableVehicles.filter(vehicle =>
      vehicle.registration_number?.toLowerCase().includes(query) ||
      vehicle.make?.toLowerCase().includes(query) ||
      vehicle.model?.toLowerCase().includes(query)
    );
  }, [availableVehicles, searchQuery]);

  const toggleRemoveSelection = (vehicleId: string) => {
    const newSelected = new Set(selectedToRemove);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    setSelectedToRemove(newSelected);
  };

  const toggleAddSelection = (vehicleId: string) => {
    const newSelected = new Set(selectedToAdd);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    setSelectedToAdd(newSelected);
  };

  const handleSelectAllToRemove = () => {
    if (selectedToRemove.size === vehicles.length) {
      setSelectedToRemove(new Set());
    } else {
      setSelectedToRemove(new Set(vehicles.map(v => v.id)));
    }
  };

  const handleSelectAllToAdd = () => {
    if (selectedToAdd.size === filteredAvailableVehicles.length) {
      setSelectedToAdd(new Set());
    } else {
      setSelectedToAdd(new Set(filteredAvailableVehicles.map(v => v.id)));
    }
  };

  const handleSave = async () => {
    if (selectedToRemove.size === 0 && selectedToAdd.size === 0) {
      setIsEditMode(false);
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Remove selected vehicles
      for (const vehicleId of selectedToRemove) {
        try {
          await removeTagFromVehicle(vehicleId, tagId);
          successCount++;
        } catch (error: any) {
          logger.error(`Error removing tag from vehicle ${vehicleId}:`, error);
          errorCount++;
        }
      }

      // Add selected vehicles
      for (const vehicleId of selectedToAdd) {
        try {
          await assignTagToVehicle(vehicleId, tagId);
          successCount++;
        } catch (error: any) {
          logger.error(`Error assigning tag to vehicle ${vehicleId}:`, error);
          if (error.message?.includes('already assigned')) {
            successCount++; // Count as success if already assigned
          } else {
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully updated ${successCount} vehicle(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} vehicle(s)`);
      }

      // Reload vehicles and reset state
      await loadVehicles();
      setIsEditMode(false);
      setSelectedToRemove(new Set());
      setSelectedToAdd(new Set());
      setSearchQuery('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setSelectedToRemove(new Set());
    setSelectedToAdd(new Set());
    setSearchQuery('');
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
              <div className="flex items-center space-x-3 flex-1">
                <div 
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: tagColor }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900">
                    {tagName} — Vehicles ({vehicles.length})
                  </h3>
                  {isEditMode && (
                    <p className="text-sm text-gray-500 mt-1">
                      Select vehicles to add or remove from this tag
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      loadAllVehicles();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || (selectedToRemove.size === 0 && selectedToAdd.size === 0)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Vehicle List */}
            <div className="mt-4 space-y-4">
              {/* Current Vehicles Section */}
              <div>
                {loading ? (
                  <div className="py-12">
                    <LoadingScreen isLoading={true} />
                  </div>
                ) : (
                  <>
                    {isEditMode && vehicles.length > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          onClick={handleSelectAllToRemove}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {selectedToRemove.size === vehicles.length ? 'Deselect All' : 'Select All'}
                        </button>
                        {selectedToRemove.size > 0 && (
                          <span className="text-sm text-gray-500">
                            {selectedToRemove.size} selected to remove
                          </span>
                        )}
                      </div>
                    )}
                    
                    {vehicles.length === 0 ? (
                      <div className="text-center py-12">
                        <Truck className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No vehicles with this tag</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {vehicles.map((vehicle) => {
                          const isSelected = selectedToRemove.has(vehicle.id);
                          return (
                            <div
                              key={vehicle.id}
                              onClick={() => isEditMode && toggleRemoveSelection(vehicle.id)}
                              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                isEditMode
                                  ? `cursor-pointer ${
                                      isSelected
                                        ? 'bg-red-50 border-2 border-red-200'
                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                    }`
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                {isEditMode && (
                                  <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-red-600 border-red-600'
                                      : 'border-gray-300'
                                  }`}>
                                    {isSelected && <XCircle className="h-3 w-3 text-white" />}
                                  </div>
                                )}
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
                              
                              {!isEditMode && vehicle.primary_driver && (
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <User className="h-4 w-4" />
                                  <span>{vehicle.primary_driver.name}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Add Vehicles Section (Edit Mode Only) */}
              {isEditMode && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Add Vehicles</h4>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search vehicles by registration, make, or model..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    {filteredAvailableVehicles.length > 0 && (
                      <div className="mb-2 flex items-center justify-between">
                        <button
                          onClick={handleSelectAllToAdd}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {selectedToAdd.size === filteredAvailableVehicles.length ? 'Deselect All' : 'Select All'}
                        </button>
                        {selectedToAdd.size > 0 && (
                          <span className="text-sm text-gray-500">
                            {selectedToAdd.size} selected to add
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {filteredAvailableVehicles.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">
                        {searchQuery ? 'No vehicles found matching your search' : 'All vehicles already have this tag'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {filteredAvailableVehicles.map((vehicle) => {
                        const isSelected = selectedToAdd.has(vehicle.id);
                        return (
                          <div
                            key={vehicle.id}
                            onClick={() => toggleAddSelection(vehicle.id)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-2 border-blue-200'
                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600'
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
              )}
            </div>
          </div>

          {/* Footer */}
          {!isEditMode && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagVehicleListModal;
