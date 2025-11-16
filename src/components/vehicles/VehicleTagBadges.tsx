import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Tag } from '../../types/tags';

interface VehicleTagBadgesProps {
  tags: Tag[];
  onRemove?: (tagId: string) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  compactMode?: boolean;
}

const VehicleTagBadges: React.FC<VehicleTagBadgesProps> = ({
  tags,
  onRemove,
  readOnly = false,
  size = 'md',
  maxDisplay,
  compactMode = false
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPopoverAbove, setIsPopoverAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  // Determine how many tags to display
  const defaultMaxDisplay = compactMode ? 2 : undefined;
  const effectiveMaxDisplay = maxDisplay ?? defaultMaxDisplay;

  const displayTags = effectiveMaxDisplay ? tags.slice(0, effectiveMaxDisplay) : tags;
  const remainingTags = effectiveMaxDisplay && tags.length > effectiveMaxDisplay 
    ? tags.slice(effectiveMaxDisplay) 
    : [];
  const remainingCount = remainingTags.length;

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen && compactMode) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPopoverOpen, compactMode]);

  // Calculate popover position
  useEffect(() => {
    if (isPopoverOpen && compactMode && triggerRef.current && popoverRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = Math.min(popoverRef.current.scrollHeight, 200);
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      if (spaceBelow < popoverHeight && spaceAbove > popoverHeight) {
        setIsPopoverAbove(true);
      } else {
        setIsPopoverAbove(false);
      }
    }
  }, [isPopoverOpen, compactMode, remainingTags.length]);

  if (!tags || tags.length === 0) {
    return null;
  }

  const handleTogglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (compactMode && remainingCount > 0) {
      setIsPopoverOpen(!isPopoverOpen);
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-wrap gap-1.5">
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
        <>
          {compactMode ? (
            <div className="relative inline-block">
              <button
                ref={triggerRef}
                onClick={handleTogglePopover}
                className={`
                  inline-flex items-center rounded-full font-medium cursor-pointer
                  bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 
                  border border-gray-300 dark:border-gray-600
                  hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                  ${sizeClasses[size]}
                `}
                title={`View ${remainingCount} more tag${remainingCount > 1 ? 's' : ''}`}
              >
                +{remainingCount} more
                <ChevronDown className={`ml-1 ${iconSizes[size]} transition-transform ${isPopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover */}
              {isPopoverOpen && (
                <div
                  ref={popoverRef}
                  className={`
                    absolute z-50 min-w-[200px] max-w-[300px] max-h-[200px] overflow-y-auto
                    bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                    rounded-lg shadow-lg p-2
                    ${isPopoverAbove ? 'bottom-full mb-1' : 'top-full mt-1'}
                    left-0
                  `}
                >
                  <div className="flex flex-wrap gap-1">
                    {remainingTags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`
                          inline-flex items-center rounded-full font-medium
                          ${sizeClasses[size]}
                        `}
                        style={{
                          backgroundColor: `${tag.color_hex}20`,
                          color: tag.color_hex,
                          borderWidth: '1px',
                          borderColor: tag.color_hex
                        }}
                      >
                        <span className="whitespace-nowrap">{tag.name}</span>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span
              className={`
                inline-flex items-center rounded-full font-medium
                bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 
                border border-gray-300 dark:border-gray-600
                ${sizeClasses[size]}
              `}
            >
              +{remainingCount} more
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default VehicleTagBadges;
