import React, { useState, useEffect } from 'react';
import { Tag, getTags, assignTagToVehicle, removeTagFromVehicle } from '@/utils/api/vehicleTags';
import { X, Plus } from 'lucide-react';
import { toast } from 'react-toastify';

interface VehicleTagSelectorProps {
  vehicleId: string;
  currentTags: Tag[];
  onTagsChange: () => void;
}

const VehicleTagSelector: React.FC<VehicleTagSelectorProps> = ({
  vehicleId,
  currentTags,
  onTagsChange
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const tags = await getTags();
    setAvailableTags(tags);
  };

  const handleAddTag = async (tagId: string) => {
    setIsLoading(true);
    const success = await assignTagToVehicle(vehicleId, tagId);
    setIsLoading(false);

    if (success) {
      toast.success('Tag assigned successfully');
      onTagsChange();
      setShowDropdown(false);
    } else {
      toast.error('Failed to assign tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setIsLoading(true);
    const success = await removeTagFromVehicle(vehicleId, tagId);
    setIsLoading(false);

    if (success) {
      toast.success('Tag removed successfully');
      onTagsChange();
    } else {
      toast.error('Failed to remove tag');
    }
  };

  const unassignedTags = availableTags.filter(
    tag => !currentTags.some(ct => ct.id === tag.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {currentTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            style={{ backgroundColor: tag.color_hex + '20', color: tag.color_hex }}
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              disabled={isLoading}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        {unassignedTags.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border border-gray-300 hover:bg-gray-50"
            >
              <Plus className="w-3 h-3" />
              Add Tag
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {unassignedTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color_hex }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTagSelector;