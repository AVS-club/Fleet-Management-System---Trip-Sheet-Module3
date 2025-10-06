import React, { useState } from 'react';
import { Palette } from 'lucide-react';

interface TagColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  error?: string;
}

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
];

const TagColorPicker: React.FC<TagColorPickerProps> = ({
  value,
  onChange,
  label = 'Tag Color',
  error
}) => {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="space-y-3">
        {/* Preset Colors */}
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`
                w-10 h-10 rounded-lg border-2 transition-all
                ${value === color 
                  ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900' 
                  : 'border-gray-200 hover:border-gray-400'}
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Custom Color */}
        <div>
          <button
            type="button"
            onClick={() => setShowCustom(!showCustom)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Palette className="h-4 w-4" />
            <span>Custom Color</span>
          </button>

          {showCustom && (
            <div className="mt-2 flex items-center space-x-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
              />
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
                maxLength={7}
              />
            </div>
          )}
        </div>

        {/* Selected Color Preview */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div 
            className="w-12 h-12 rounded-lg border border-gray-300"
            style={{ backgroundColor: value }}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">Selected Color</p>
            <p className="text-xs text-gray-500 uppercase">{value}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default TagColorPicker;
