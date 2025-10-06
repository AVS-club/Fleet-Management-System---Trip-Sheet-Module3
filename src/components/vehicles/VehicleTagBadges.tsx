import React from 'react';
import { Tag as TagIcon, X } from 'lucide-react';
import { Tag } from '../../types/tags';

interface VehicleTagBadgesProps {
  tags: Tag[];
  onRemove?: (tagId: string) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

const VehicleTagBadges: React.FC<VehicleTagBadgesProps> = ({
  tags,
  onRemove,
  readOnly = false,
  size = 'md',
  maxDisplay
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  if (!tags || tags.length === 0) {
    return null;
  }

  const displayTags = maxDisplay ? tags.slice(0, maxDisplay) : tags;
  const remainingCount = maxDisplay && tags.length > maxDisplay ? tags.length - maxDisplay : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayTags.map((tag) => (
        <span
          key={tag.id}
          className={`
            inline-flex items-center rounded-full font-medium
            ${sizeClasses[size]}
            transition-all duration-200
          `}
          style={{
            backgroundColor: `${tag.color_hex}20`,
            color: tag.color_hex,
            borderWidth: '1px',
            borderColor: tag.color_hex
          }}
        >
          <span className="truncate max-w-[120px]">{tag.name}</span>
          {!readOnly && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.id);
              }}
              className="ml-1 hover:opacity-70 transition-opacity"
              title={`Remove ${tag.name}`}
            >
              <X className={iconSizes[size]} />
            </button>
          )}
        </span>
      ))}
      
      {remainingCount > 0 && (
        <span
          className={`
            inline-flex items-center rounded-full font-medium
            bg-gray-100 text-gray-600 border border-gray-300
            ${sizeClasses[size]}
          `}
        >
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

export default VehicleTagBadges;
