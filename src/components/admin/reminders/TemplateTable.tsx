import React, { useState } from 'react';
import { Edit2, Trash2, Clock, Bell, User } from 'lucide-react';
import { ReminderTemplate, ReminderContact } from '../../../types/reminders';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Checkbox from '../../ui/Checkbox';
import { toast } from 'react-toastify';

interface TemplateTableProps {
  templates: ReminderTemplate[];
  contacts: ReminderContact[];
  onSave: (template: ReminderTemplate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TemplateTable: React.FC<TemplateTableProps> = ({
  templates,
  contacts,
  onSave,
  onDelete
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReminderTemplate>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (template: ReminderTemplate) => {
    setEditingId(template.id);
    setEditForm({ ...template });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingId || !editForm.reminder_type || editForm.default_days_before === undefined) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        ...editForm,
        id: editingId
      } as ReminderTemplate);
      setEditingId(null);
      setEditForm({});
      toast.success('Template updated successfully');
    } catch (error) {
      toast.error('Failed to update template');
      console.error('Error updating template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success('Template deleted successfully');
    } catch (error) {
      toast.error('Failed to delete template');
      console.error('Error deleting template:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setEditForm({
        ...editForm,
        [name]: parseInt(value, 10)
      });
    } else {
      setEditForm({
        ...editForm,
        [name]: value
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: checked
    });
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No reminder templates found</h3>
        <p className="text-gray-500">Add your first template to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reminder Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Days Before
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Repeat
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Default Contact
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {templates.map((template) => (
            <tr key={template.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === template.id ? (
                  <Input
                    name="reminder_type"
                    value={editForm.reminder_type || ''}
                    onChange={handleInputChange}
                    required
                  />
                ) : (
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 text-primary-500 mr-2" />
                    <span className="font-medium text-gray-900">{template.reminder_type}</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === template.id ? (
                  <div className="flex items-center">
                    <Input
                      type="number"
                      name="default_days_before"
                      value={editForm.default_days_before || 0}
                      onChange={handleInputChange}
                      min={1}
                      max={365}
                      required
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{template.default_days_before} days</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === template.id ? (
                  <Checkbox
                    name="repeat"
                    checked={editForm.repeat || false}
                    onChange={handleCheckboxChange}
                  />
                ) : (
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                    template.repeat
                      ? 'bg-success-100 text-success-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.repeat ? 'Yes' : 'No'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === template.id ? (
                  <Select
                    name="default_contact_id"
                    value={editForm.default_contact_id || ''}
                    onChange={handleInputChange}
                    options={[
                      { value: '', label: 'None' },
                      ...contacts
                        .filter(contact => contact.is_active)
                        .map(contact => ({
                          value: contact.id,
                          label: contact.full_name
                        }))
                    ]}
                  />
                ) : (
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span>
                      {template.default_contact_id
                        ? contacts.find(c => c.id === template.default_contact_id)?.full_name || 'Unknown'
                        : 'None'}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {editingId === template.id ? (
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      isLoading={isSubmitting}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deletingId === template.id}
                      className="text-error-600 hover:text-error-900 disabled:opacity-50"
                    >
                      {deletingId === template.id ? (
                        <div className="h-4 w-4 border-2 border-t-transparent border-error-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TemplateTable;