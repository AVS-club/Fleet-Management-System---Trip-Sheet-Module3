import React, { useState, useEffect, useRef } from 'react';
import { Tag, X, Plus, Search, ChevronDown } from 'lucide-react';
import { Tag as TagType } from '../../types/tags';
import { getTags } from '../../utils/api/tags';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VehicleTagSelector');

interface VehicleTagSelectorProps {
  selectedTags: TagType[];
  onTagsChange: (tags: TagType[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function VehicleTagSelector({
  selectedTags,
  onTagsChange,
  disabled = false,
  placeholder = 'Select tags...'
}: VehicleTagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available tags
  useEffect(() => {
    loadTags();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const tags = await getTags();
      setAvailableTags(tags.filter(tag => tag.active));
    } catch (error) {
      logger.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tag: TagType) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);

    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsChange(selectedTags.filter(t => t.id !== tagId));
  };

  // Filter tags based on search query
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unselected tags for dropdown
  const unselectedTags = filteredTags.filter(
    tag => !selectedTags.some(selected => selected.id === tag.id)
  );

  return (
    <div className="w-full" ref={dropdownRef}>
      <div className="relative">
        {/* Selected Tags Display */}
        <div
          className={`min-h-[42px] px-3 py-2 border rounded-lg bg-white cursor-pointer transition-colors ${
            disabled
              ? 'bg-gray-50 cursor-not-allowed'
              : 'hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
          } ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex flex-wrap gap-2 items-center">
            {selectedTags.length === 0 ? (
              <span className="text-gray-400 text-sm">{placeholder}</span>
            ) : (
              selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium border"
                  style={{
                    backgroundColor: `${tag.color_hex}20`,
                    borderColor: tag.color_hex,
                    color: tag.color_hex
                  }}
                >
                  {tag.name}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveTag(tag.id, e)}
                      className="hover:opacity-70 transition-opacity"
                      aria-label={`Remove ${tag.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))
            )}
            {!disabled && (
              <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Tag List */}
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Loading tags...
                </div>
              ) : unselectedTags.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? 'No tags found' : 'All tags selected'}
                </div>
              ) : (
                <div className="p-2">
                  {unselectedTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTag(tag);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2"
                        style={{ borderColor: tag.color_hex, backgroundColor: `${tag.color_hex}30` }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">{tag.name}</div>
                        {tag.description && (
                          <div className="text-xs text-gray-500 truncate">{tag.description}</div>
                        )}
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

      {/* Helper Text */}
      {selectedTags.length > 0 && !disabled && (
        <p className="mt-1 text-xs text-gray-500">
          {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
