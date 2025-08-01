import React, { useState } from 'react';
import { User, Edit, Trash2, Mail, Phone, Check, X, Globe } from 'lucide-react';
import { ReminderContact, ReminderContactMode } from '../../../types/reminders';
import { toast } from 'react-toastify';

interface ContactListProps {
  contacts: ReminderContact[];
  onEdit: (contact: ReminderContact) => void;
  onDelete: (id: string) => Promise<void>;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, onEdit, onDelete }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success('Contact deleted successfully');
    } catch (error) {
      toast.error('Failed to delete contact');
      console.error('Error deleting contact:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getContactModeIcon = (mode: ReminderContactMode) => {
    switch (mode) {
      case ReminderContactMode.Email:
        return <Mail className="h-4 w-4 text-blue-500" />;
      case ReminderContactMode.SMS:
        return <Phone className="h-4 w-4 text-green-500" />;
      case ReminderContactMode.Both:
        return (
          <div className="flex space-x-1">
            <Phone className="h-4 w-4 text-green-500" />
            <Mail className="h-4 w-4 text-blue-500" />
          </div>
        );
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No contacts found</h3>
        <p className="text-gray-500">Add your first contact to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contacts.map((contact) => (
        <div 
          key={contact.id} 
          className={`relative bg-white rounded-lg border ${contact.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50'} shadow-sm overflow-hidden`}
        >
          {/* Action buttons - top right */}
          <div className="absolute top-2 right-2 flex space-x-1">
            <button
              type="button"
              onClick={() => onEdit(contact)}
              className="p-1 text-gray-400 hover:text-gray-500 rounded"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(contact.id)}
              disabled={deletingId === contact.id}
              className="p-1 text-gray-400 hover:text-error-500 disabled:opacity-50 rounded"
            >
              {deletingId === contact.id ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="p-3">
            {/* Header: Avatar, Name, Position, Global Tag, Status */}
            <div className="flex items-center space-x-2 pr-16">
              <div className="flex-shrink-0">
                {contact.photo_url ? (
                  <img 
                    src={contact.photo_url} 
                    alt={contact.full_name} 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate max-w-32">
                    {contact.full_name}
                  </h3>
                  {contact.is_global && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <Globe className="h-3 w-3 mr-1" />
                      Global
                    </span>
                  )}
                  {contact.is_active ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-success-100 text-success-800">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{contact.position}</p>
              </div>
            </div>

            {/* Contact Details Row */}
            <div className="mt-2 flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <Phone className="h-3 w-3 text-gray-400 mr-1" />
                <span className="text-gray-600 truncate">{contact.phone_number}</span>
              </div>
              {contact.email && (
                <div className="flex items-center">
                  <Mail className="h-3 w-3 text-gray-400 mr-1" />
                  <span className="text-gray-600 truncate max-w-32">{contact.email}</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="text-gray-500 mr-1">Via:</span>
                {getContactModeIcon(contact.preferred_contact_mode)}
              </div>
            </div>

            {/* Assigned Types */}
            {!contact.is_global && contact.assigned_types && contact.assigned_types.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {contact.assigned_types.map((type) => (
                    <span 
                      key={type} 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactList;