/**
 * TagsSection - Vehicle tags and reminder contacts
 *
 * Handles:
 * - Vehicle tags selection (multi-select)
 * - Reminder contacts selection
 */

import React, { useState, useEffect } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Vehicle } from '@/types';
import Select from '../../ui/Select';
import { Tag, Bell } from 'lucide-react';
import { getTags } from '../../../utils/api/tags';
import { getReminderContacts, ReminderContact } from '../../../utils/reminderService';

interface TagsSectionProps {
  formMethods: UseFormReturn<Vehicle>;
  disabled?: boolean;
}

export const TagsSection: React.FC<TagsSectionProps> = ({
  formMethods,
  disabled = false
}) => {
  const { control, formState: { errors } } = formMethods;
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [reminderContacts, setReminderContacts] = useState<ReminderContact[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Load tags
      try {
        const tags = await getTags();
        setAvailableTags(tags.map(t => t.name));
      } catch (error) {
        console.error('Failed to load tags:', error);
      }

      // Load reminder contacts
      try {
        const contacts = await getReminderContacts();
        setReminderContacts(contacts);
      } catch (error) {
        console.error('Failed to load reminder contacts:', error);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Tag className="h-5 w-5 mr-2" />
        Tags & Reminders
      </h3>

      <div className="grid grid-cols-1 gap-4">
        {/* Vehicle Tags */}
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <Select
              label="Vehicle Tags"
              options={availableTags}
              value={field.value || []}
              onChange={field.onChange}
              icon={<Tag className="h-4 w-4" />}
              error={errors.tags?.message as string}
              disabled={disabled}
              multiSelect
              placeholder="Select tags to categorize this vehicle..."
            />
          )}
        />

        <p className="text-sm text-gray-500 -mt-2">
          Tags help organize and filter your vehicles (e.g., "Heavy Duty", "Long Distance", "Local")
        </p>

        {/* Reminder Contacts */}
        <Controller
          name="reminder_contacts"
          control={control}
          render={({ field }) => (
            <Select
              label="Reminder Contacts"
              options={reminderContacts.map(c => c.name)}
              value={field.value || []}
              onChange={field.onChange}
              icon={<Bell className="h-4 w-4" />}
              error={errors.reminder_contacts?.message as string}
              disabled={disabled}
              multiSelect
              placeholder="Select contacts for document expiry reminders..."
            />
          )}
        />

        <p className="text-sm text-gray-500 -mt-2">
          These contacts will receive reminders when documents are about to expire
        </p>
      </div>
    </div>
  );
};
