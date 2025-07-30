import React, { useState } from 'react';
import { Edit2, Trash2, Clock, Bell, User, Globe, FileText, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { ReminderTemplate, ReminderContact } from '../../../types/reminders';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Checkbox from '../../ui/Checkbox';
import { toast } from 'react-toastify';

// Map internal values to display labels
const REMINDER_TYPE_LABELS: Record<string, string> = {
  'insurance': 'Insurance Expiry',
  'fitness': 'Fitness Certificate',
  'puc': 'Pollution Certificate (PUC)',
  'tax': 'Tax Renewal',
  'permit': 'Permit Renewal',
  'service': 'Service Due',
  'tire': 'Tire Change Reminder',
  'battery': 'Battery Replacement',
  'amc': 'Annual Maintenance Contract',
  'speedgovernor': 'Speed Governor Calibration',
  'fireextinguisher': 'Fire Extinguisher Recharge',
  'firstaid': 'First Aid Kit Refill',
  'ais140': 'AIS 140 Device Reverification',
  'warranty': 'Spare Parts Warranty Expiry',
  'documents': 'Document Upload Check'
};

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

  // Get display label for reminder type
  const getReminderTypeLabel = (type: string) => {
    return REMINDER_TYPE_LABELS[type] || type;
  };

  // Get contact display name with preferred contact mode
  const getContactDisplayName = (contactId?: string) => {
    if (!contactId) return 'No default contact';
    
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return 'Unknown Contact';
    
    const modeText = contact.preferred_contact_mode === 'Both' ? 'SMS+Email' : contact.preferred_contact_mode;
    return `${contact.full_name} (${modeText})`;
  };
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
    <div className="space-y-3">
      {templates.map((template) => (
        <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
          {editingId === template.id ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Reminder Type"
                  name="reminder_type"
                  value={editForm.reminder_type || ''}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Days Before"
                  type="number"
                  name="default_days_before"
                  value={editForm.default_days_before || 0}
                  onChange={handleInputChange}
                  min={1}
                  max={365}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Checkbox
                  label="Repeat Reminder"
                  name="repeat"
                  checked={editForm.repeat || false}
                  onChange={handleCheckboxChange}
                />
                <Select
                  label="Default Contact"
                  name="default_contact_id"
                  value={editForm.default_contact_id || ''}
                  onChange={handleInputChange}
                  options={[
                    { value: '', label: 'None' },
                    ...contacts
                      .filter(contact => contact.is_active)
                      .map(contact => ({
                        value: contact.id,
                        label: getContactDisplayName(contact.id)
                      }))
                  ]}
                />
              </div>
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
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4 text-primary-500" />
                  <span className="font-medium text-gray-900">{getReminderTypeLabel(template.reminder_type)}</span>
                </div>
                
                <ArrowRight className="h-3 w-3 text-gray-400" />
                
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{template.default_days_before} days</span>
                </div>
                
                <ArrowRight className="h-3 w-3 text-gray-400" />
                
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{getContactDisplayName(template.default_contact_id)}</span>
                </div>
                
                <ArrowRight className="h-3 w-3 text-gray-400" />
                
                <div className="flex items-center space-x-1">
                  {template.repeat ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success-500" />
                      <span className="text-success-600 font-medium">Repeat ON</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Repeat OFF</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="text-primary-600 hover:text-primary-900"
                  title="Edit template"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingId === template.id}
                  className="text-error-600 hover:text-error-900 disabled:opacity-50"
                  title="Delete template"
                >
                  {deletingId === template.id ? (
                    <div className="h-4 w-4 border-2 border-t-transparent border-error-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TemplateTable;