import React, { useState } from 'react';
import { Edit2, Trash2, Eye, MoreVertical, Plus, Clock } from 'lucide-react';
import { Tag } from '../../types/tags';
import Button from '../ui/Button';

interface TagManagementCardProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onViewVehicles: (tag: Tag) => void;
  onAddVehicles: (tag: Tag) => void;
  onViewHistory: (tag: Tag) => void;
}

const TagManagementCard: React.FC<TagManagementCardProps> = ({
  tag,
  onEdit,
  onDelete,
  onViewVehicles,
  onAddVehicles,
  onViewHistory
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4">
      <div className="flex items-start justify-between">
        {/* Tag Info */}
        <div className="flex items-start space-x-3 flex-1">
          <div 
            className="w-12 h-12 rounded-lg border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: tag.color_hex }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-gray-900 truncate">
              {tag.name}
            </h3>
            {tag.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {tag.description}
              </p>
            )}
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <span className="font-medium text-gray-900">{tag.vehicle_count || 0}</span>
                <span className="ml-1">vehicles</span>
              </span>
              <span>•</span>
              <span className="uppercase">{tag.color_hex}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </button>

          {showActions && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowActions(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    onAddVehicles(tag);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Vehicles</span>
                </button>
                <button
                  onClick={() => {
                    onViewVehicles(tag);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Vehicles</span>
                </button>
                <button
                  onClick={() => {
                    onViewHistory(tag);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>View History</span>
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => {
                    onEdit(tag);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit Tag</span>
                </button>
                <button
                  onClick={() => {
                    onDelete(tag);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Tag</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions (Mobile Friendly) */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2 sm:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewVehicles(tag)}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(tag)}
          className="flex-1"
        >
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  );
};

export default TagManagementCard;
