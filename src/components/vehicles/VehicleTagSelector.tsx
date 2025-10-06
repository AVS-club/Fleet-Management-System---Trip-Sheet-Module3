import React, { useState, useEffect, useRef } from 'react';
import { Tag, Plus, X, Check, Loader } from 'lucide-react';
import { Tag as TagType } from '../../types/tags';
import { getTags, assignTagToVehicle, removeTagFromVehicle } from '../../utils/api/tags';
import { toast } from 'react-toastify';
import VehicleTagBadges from './VehicleTagBadges';
import Button from '../ui/Button';

interface VehicleTagSelectorProps {
  vehicleId: string;
  currentTags: TagType[];
  onTagsChange: (tags: TagType[]) => void;
  readOnly?: boolean;
}

const VehicleTagSelector: React.FC<VehicleTagSelectorProps> = ({
  vehicleId,
  currentTags,
  onTagsChange,
  readOnly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadTags = async () => {
    try {
      const tags = await getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    }
  };

  const handleAddTag = async (tag: TagType) => {
    if (currentTags.some(t => t.id === tag.id)) {
      toast.info('Tag already assigned');
      return;
    }

    setLoading(true);
    try {
      await assignTagToVehicle(vehicleId, tag.id);
      const updatedTags = [...currentTags, tag];
      onTagsChange(updatedTags);
      toast.success(`Tag "${tag.name}" added`);
    } catch (error: any) {
      console.error('Error assigning tag:', error);
      if (error.message.includes('already assigned')) {
        toast.info('Tag already assigned');
      } else {
        toast.error('Failed to assign tag');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const tag = currentTags.find(t => t.id === tagId);
    if (!tag) return;

    setLoading(true);
    try {
      await removeTagFromVehicle(vehicleId, tagId);
      const updatedTags = currentTags.filter(t => t.id !== tagId);
      onTagsChange(updatedTags);
      toast.success(`Tag "${tag.name}" removed`);
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = availableTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notAssigned = !currentTags.some(t => t.id === tag.id);
    return matchesSearch && notAssigned;
  });

  if (readOnly) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Tags</label>
        {currentTags.length > 0 ? (
          <VehicleTagBadges tags={currentTags} readOnly />
        ) : (
          <p className="text-sm text-gray-500">No tags assigned</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Vehicle Tags
      </label>

      {/* Current Tags */}
      {currentTags.length > 0 && (
        <div>
          <VehicleTagBadges 
            tags={currentTags} 
            onRemove={handleRemoveTag}
          />
        </div>
      )}

      {/* Add Tag Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
        >
          {loading ? (
            <Loader className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Tag
        </Button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Search */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            {/* Tag List */}
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredTags.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-gray-500">
                  {searchQuery ? 'No tags found' : 'All tags assigned'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: tag.color_hex }}
                        />
                        <span className="text-gray-900">{tag.name}</span>
                      </div>
                      <Plus className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Tags help categorize vehicles for performance comparison
      </p>
    </div>
  );
};

export default VehicleTagSelector;
