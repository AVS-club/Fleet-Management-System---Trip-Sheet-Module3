import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import TagColorPicker from './TagColorPicker';
import { Tag, TagFormData } from '../../types/tags';
import { createTag, updateTag } from '../../utils/api/tags';
import { toast } from 'react-toastify';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TagCreateModal');

// Helper function to check for duplicate colors
const isColorTooSimilar = (color1: string, color2: string): boolean => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  // Calculate color distance
  const distance = Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );

  // If distance is less than 50, colors are too similar
  return distance < 50;
};

interface TagCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTag?: Tag | null;
  existingTags: Tag[];
}

const TagCreateModal: React.FC<TagCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingTag,
  existingTags
}) => {
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: '',
    color_hex: '#3B82F6'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof TagFormData, string>>>({});

  // Get first available color from preset colors
  const firstAvailableColor = useMemo(() => {
    const usedColors = new Set(
      existingTags
        .filter(tag => tag.id !== editingTag?.id)
        .map(tag => tag.color_hex.toUpperCase())
    );
    
    const PRESET_COLORS = [
      '#10B981', '#3B82F6', '#F97316', '#8B5CF6', '#EAB308', '#EF4444',
      '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F59E0B', '#84CC16',
      '#22C55E', '#0EA5E9', '#A855F7', '#F43F5E', '#8B5A2B', '#64748B',
      '#DC2626', '#059669', '#0284C7', '#7C3AED', '#C026D3', '#EA580C',
      '#CA8A04', '#16A34A', '#2563EB', '#9333EA', '#BE185D', '#0891B2'
    ];
    
    const availableColor = PRESET_COLORS.find(color => !usedColors.has(color.toUpperCase()));
    return availableColor || '#3B82F6'; // Fallback to blue if all are used
  }, [existingTags, editingTag?.id]);

  useEffect(() => {
    if (editingTag) {
      setFormData({
        name: editingTag.name,
        description: editingTag.description || '',
        color_hex: editingTag.color_hex
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color_hex: firstAvailableColor
      });
    }
    setErrors({});
  }, [editingTag, isOpen, firstAvailableColor]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TagFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Tag name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Tag name must be less than 50 characters';
    }

    if (!/^#[0-9A-F]{6}$/i.test(formData.color_hex)) {
      newErrors.color_hex = 'Invalid color format';
    } else {
      // Check for duplicate or similar colors
      const similarTag = existingTags.find(tag => {
        // Skip the tag being edited
        if (editingTag && tag.id === editingTag.id) return false;
        return isColorTooSimilar(formData.color_hex, tag.color_hex);
      });

      if (similarTag) {
        newErrors.color_hex = `Color too similar to "${similarTag.name}". Please choose a different color.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (editingTag) {
        await updateTag(editingTag.id, formData);
        toast.success('Tag updated successfully');
      } else {
        await createTag(formData);
        toast.success('Tag created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      logger.error('Error saving tag:', error);
      toast.error(error.message || 'Failed to save tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Tag Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                placeholder="e.g., Heavy Duty Fleet, Local Routes"
                maxLength={50}
              />

              <Textarea
                label="Description (Optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this tag's purpose..."
                rows={3}
                maxLength={200}
              />

              <TagColorPicker
                value={formData.color_hex}
                onChange={(color) => setFormData({ ...formData, color_hex: color })}
                error={errors.color_hex}
                existingTags={existingTags}
                editingTagId={editingTag?.id || null}
              />
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:ml-3"
            >
              {editingTag ? 'Update Tag' : 'Create Tag'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
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

export default TagCreateModal;
