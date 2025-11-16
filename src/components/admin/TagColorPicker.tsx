import React, { useState, useMemo } from 'react';
import { Palette } from 'lucide-react';
import { Tag } from '../../types/tags';

interface TagColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  error?: string;
  existingTags?: Tag[];
  editingTagId?: string | null;
}

// 30 distinct, visually different colors
const PRESET_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#8B5CF6', // Purple
  '#EAB308', // Yellow
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Emerald
  '#0EA5E9', // Sky Blue
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#8B5A2B', // Brown
  '#64748B', // Slate
  '#DC2626', // Red-600
  '#059669', // Emerald-600
  '#0284C7', // Sky-600
  '#7C3AED', // Violet-600
  '#C026D3', // Fuchsia-600
  '#EA580C', // Orange-600
  '#CA8A04', // Yellow-600
  '#16A34A', // Green-600
  '#2563EB', // Blue-600
  '#9333EA', // Purple-600
  '#BE185D', // Pink-600
  '#0891B2', // Cyan-600
];

const TagColorPicker: React.FC<TagColorPickerProps> = ({
  value,
  onChange,
  label = 'Tag Color',
  error,
  existingTags = [],
  editingTagId = null
}) => {
  const [showCustom, setShowCustom] = useState(false);

  // Filter out colors that are already used by existing tags
  const availableColors = useMemo(() => {
    const usedColors = new Set(
      existingTags
        .filter(tag => tag.id !== editingTagId) // Exclude the tag being edited
        .map(tag => tag.color_hex.toUpperCase())
    );
    
    return PRESET_COLORS.filter(color => !usedColors.has(color.toUpperCase()));
  }, [existingTags, editingTagId]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="space-y-3">
        {/* Preset Colors */}
        <div className="grid grid-cols-6 gap-2">
          {availableColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`
                w-10 h-10 rounded-lg border-2 transition-all relative
                ${value === color
                  ? 'border-gray-900 dark:border-gray-100 ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-100 dark:ring-offset-gray-800'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
              `}
              style={{ backgroundColor: color }}
              title={color}
            >
              {/* Add a subtle border around the color swatch to make it visible in dark mode */}
              <div
                className="absolute inset-0 rounded-lg border border-black/10 dark:border-white/20 pointer-events-none"
              />
            </button>
          ))}
        </div>
        
        {availableColors.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            All preset colors are in use. Please use a custom color.
          </p>
        )}

        {/* Custom Color */}
        <div>
          <button
            type="button"
            onClick={() => setShowCustom(!showCustom)}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <Palette className="h-4 w-4" />
            <span>Custom Color</span>
          </button>

          {showCustom && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="relative">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                {/* Overlay to ensure color picker is visible in both modes */}
                <div className="absolute inset-0 rounded border border-black/10 dark:border-white/20 pointer-events-none" />
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-F]{6}$/i.test(val)) {
                    onChange(val);
                  }
                }}
                placeholder="#RRGGBB"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm uppercase bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={7}
              />
            </div>
          )}
        </div>

        {/* Selected Color Preview */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: value }}
            />
            {/* Overlay for better visibility */}
            <div className="absolute inset-0 rounded-lg border border-black/10 dark:border-white/20 pointer-events-none" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Selected Color</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{value}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default TagColorPicker;
